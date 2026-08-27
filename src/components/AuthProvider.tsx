"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  onAuthStateChanged,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  type DocumentData,
} from "firebase/firestore";
import {
  getClientAuth,
  getClientFirestore,
} from "@/lib/firebase/client";
import { LEGAL_STORAGE_KEY, TOS_VERSION } from "@/lib/legal";
import {
  clearSignupName,
  fullDisplayName,
  isPersonName,
  normalizePersonName,
  readSignupName,
  resolveAccountName,
  splitPersonName,
} from "@/lib/person-name";
import { isValidCountry, isValidTimeZone } from "@/lib/locales";
import { parseTicker } from "@/lib/ticker";
import { overlayLabsPlan, planHasPro, watchlistLimitForPlan, type PlanId } from "@/lib/plans";
import {
  laterReleaseAck,
  RELEASE_ACK_ID,
  releaseIsAcknowledged,
} from "@/lib/release-notes";
import { CURRENT_TOUR_ID } from "@/lib/virtual-tour";
import {
  CURRENT_CUSTOMIZE_ID,
  LEGACY_CUSTOMIZE_KEY,
  customizeLocalKey,
} from "@/lib/customize-prompt";
import {
  isNewBadgeActive,
  missingNewSeenStamps,
  parseNewSeen,
  publicNewFeatureIds,
  type NewFeatureId,
  type NewSeenMap,
} from "@/lib/new-badges";

const ADMIN_EMAIL =
  process.env.NEXT_PUBLIC_TVM_ADMIN_EMAIL || "admin@tvm-investments.test";
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export interface AccountProfile {
  uid: string;
  email: string;
  displayName: string;
  firstName: string;
  lastName: string;
  createdAt: Date | null;
  tourCompletedAt: Date | null;
  seenRelease: string;
  seenCustomize: string;
  newSeen: NewSeenMap;
  country: string;
  timeZone: string;
}

export interface AccountEntitlement {
  role: "client" | "admin";
  plan: PlanId;
  watchlistLimit: number;
  cooldownDays: number;
  source: "none" | "comp" | "stripe";
  stripeCustomerId: string;
  stripeCancelAtPeriodEnd: boolean;
  stripeAccessUntil: number;
}

export interface AccountWatchlist {
  symbols: string[];
  changedAt: Date | null;
  nextChangeAt: Date | null;
  exists: boolean;
}

export interface AccountPortfolio {
  cash: number;
  totalValue: number;
}

export interface PortfolioPosition {
  symbol: string;
  shares: number;
  averageCost: number;
  currentPrice: number;
  purchasedAt?: string | null;
}

interface AuthContextValue {
  user: User | null;
  profile: AccountProfile | null;
  entitlement: AccountEntitlement;
  watchlist: AccountWatchlist;
  portfolio: AccountPortfolio;
  positions: PortfolioPosition[];
  loading: boolean;
  accountReady: boolean;
  error: string;
  giftPending: boolean;
  tourPending: boolean;
  releasePending: boolean;
  logout: () => Promise<void>;
  acknowledgeGift: () => Promise<void>;
  completeTour: () => Promise<void>;
  acknowledgeRelease: () => Promise<void>;
  acknowledgeCustomize: () => Promise<void>;
  isFeatureNew: (feature: NewFeatureId) => boolean;
  updateDisplayName: (firstName: string, lastName: string) => Promise<void>;
  updateLocale: (country: string, timeZone: string) => Promise<void>;
  updateWatchlist: (symbols: string[]) => Promise<void>;
  updatePortfolio: (cash: number, totalValue: number) => Promise<void>;
  savePosition: (position: Omit<PortfolioPosition, "currentPrice"> & { currentPrice?: number }) => Promise<void>;
  removePosition: (symbol: string) => Promise<void>;
}

const defaultEntitlement: AccountEntitlement = {
  role: "client",
  plan: "free",
  watchlistLimit: 10,
  cooldownDays: 7,
  source: "none",
  stripeCustomerId: "",
  stripeCancelAtPeriodEnd: false,
  stripeAccessUntil: 0,
};

function entitlementFromData(
  data: DocumentData,
  email: string | null,
): AccountEntitlement {
  const role =
    data.role === "admin" || email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()
      ? "admin"
      : "client";
  const plan = overlayLabsPlan(
    role,
    typeof data.plan === "string" ? data.plan : undefined,
  );
  const source =
    data.source === "stripe" || data.source === "paid"
      ? "stripe"
      : data.source === "comp"
        ? "comp"
        : "none";
  return {
    role,
    plan,
    watchlistLimit: watchlistLimitForPlan(plan),
    cooldownDays: Number(data.cooldownDays) || 0,
    source,
    stripeCustomerId:
      typeof data.stripeCustomerId === "string" ? data.stripeCustomerId : "",
    stripeCancelAtPeriodEnd: data.stripeCancelAtPeriodEnd === true,
    stripeAccessUntil:
      typeof data.stripeAccessUntil === "number" ? data.stripeAccessUntil : 0,
  };
}

const defaultWatchlist: AccountWatchlist = {
  symbols: [],
  changedAt: null,
  nextChangeAt: null,
  exists: false,
};

const AuthContext = createContext<AuthContextValue | null>(null);

function asDate(value: unknown) {
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return value;
  if (typeof value === "string" && value) {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? new Date(parsed) : null;
  }
  return null;
}

function giftSeenKey(uid: string) {
  return `tvm-gift-seen:${uid}`;
}

function readGiftSeen(uid: string) {
  try {
    return window.localStorage.getItem(giftSeenKey(uid));
  } catch {
    return null;
  }
}

function writeGiftSeen(uid: string, grantId: string) {
  try {
    window.localStorage.setItem(giftSeenKey(uid), grantId);
  } catch {
    /* private mode */
  }
}

function tourSeenKey(uid: string) {
  return `tvm-tour-seen:${uid}`;
}

function readTourSeen(uid: string) {
  try {
    const raw = window.localStorage.getItem(tourSeenKey(uid));
    if (raw === "1") return "tour-1";
    return raw || "";
  } catch {
    return "";
  }
}

function writeTourSeen(uid: string, tourId: string) {
  try {
    window.localStorage.setItem(tourSeenKey(uid), tourId);
  } catch {
    /* private mode */
  }
}

function localeKey(uid: string) {
  return `tvm-locale:${uid}`;
}

function readStoredLocale(uid: string) {
  try {
    const raw = window.localStorage.getItem(localeKey(uid));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { country?: string; timeZone?: string };
    const country = typeof parsed.country === "string" ? parsed.country : "";
    const timeZone = typeof parsed.timeZone === "string" ? parsed.timeZone : "";
    if (!isValidCountry(country) || !isValidTimeZone(timeZone)) return null;
    return { country, timeZone };
  } catch {
    return null;
  }
}

function writeStoredLocale(uid: string, country: string, timeZone: string) {
  try {
    window.localStorage.setItem(
      localeKey(uid),
      JSON.stringify({ country, timeZone }),
    );
  } catch {
    /* private mode */
  }
}

function withStoredLocale(uid: string, profile: AccountProfile): AccountProfile {
  if (isValidCountry(profile.country) && isValidTimeZone(profile.timeZone)) {
    return profile;
  }
  const stored = readStoredLocale(uid);
  return stored ? { ...profile, ...stored } : profile;
}

function releaseSeenKey(uid: string) {
  return `tvm-release-seen:${uid}`;
}

function readReleaseSeen(uid: string) {
  try {
    return window.localStorage.getItem(releaseSeenKey(uid)) || "";
  } catch {
    return "";
  }
}

function writeReleaseSeen(uid: string, releaseId: string) {
  try {
    window.localStorage.setItem(releaseSeenKey(uid), releaseId);
  } catch {
    /* private mode */
  }
}

function newSeenKey(uid: string) {
  return `tvm-new-seen:${uid}`;
}

function readNewSeen(uid: string): NewSeenMap {
  try {
    return parseNewSeen(JSON.parse(window.localStorage.getItem(newSeenKey(uid)) || "{}"));
  } catch {
    return {};
  }
}

function writeNewSeen(uid: string, seen: NewSeenMap) {
  try {
    window.localStorage.setItem(newSeenKey(uid), JSON.stringify(seen));
  } catch {
    /* private mode */
  }
}

function grantIdFrom(data: DocumentData) {
  const gifted = asDate(data.giftedAt);
  if (gifted) return String(gifted.getTime());
  return "comp";
}

function profileFrom(data: DocumentData): AccountProfile {
  const profile: AccountProfile = {
    uid: String(data.uid),
    email: String(data.email),
    displayName: String(data.displayName),
    firstName: String(data.firstName || ""),
    lastName: String(data.lastName || ""),
    createdAt: asDate(data.createdAt),
    tourCompletedAt: asDate(data.tourCompletedAt),
    seenRelease: typeof data.seenRelease === "string" ? data.seenRelease : "",
    seenCustomize: typeof data.seenCustomize === "string" ? data.seenCustomize : "",
    newSeen: parseNewSeen(data.newSeen),
    country: typeof data.country === "string" ? data.country : "",
    timeZone: typeof data.timeZone === "string" ? data.timeZone : "",
  };
  return withStoredLocale(profile.uid, profile);
}

function profileFromAuth(user: User): AccountProfile {
  const pending = readSignupName();
  const split = pending || splitPersonName(user.displayName);
  const displayName = resolveAccountName({
    profileName: split ? fullDisplayName(split.firstName, split.lastName) : "",
    authName: user.displayName,
    email: user.email,
  });
  return withStoredLocale(user.uid, {
    uid: user.uid,
    email: user.email || "",
    displayName,
    firstName: split?.firstName || "",
    lastName: split?.lastName || "",
    createdAt: null,
    tourCompletedAt: null,
    seenRelease: "",
    seenCustomize: "",
    newSeen: {},
    country: "",
    timeZone: "",
  });
}

async function ensureAccountDocuments(user: User) {
  const db = getClientFirestore();
  if (!db || !user.email) return;

  const now = serverTimestamp();
  const isAdmin = user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
  const profileRef = doc(db, "users", user.uid);
  const entitlementRef = doc(db, "entitlements", user.uid);
  const watchlistRef = doc(db, "watchlists", user.uid);
  const portfolioRef = doc(db, "portfolios", user.uid);

  const [profile, entitlement, watchlist, portfolio] = await Promise.all([
    getDoc(profileRef),
    getDoc(entitlementRef),
    getDoc(watchlistRef),
    getDoc(portfolioRef),
  ]);

  const creates: Array<Promise<unknown>> = [];

  if (!profile.exists()) {
    try {
      sessionStorage.removeItem(LEGAL_STORAGE_KEY);
    } catch {
      /* private browsing */
    }

    const pendingName = readSignupName();
    clearSignupName();
    const split =
      pendingName ||
      splitPersonName(user.displayName) ||
      splitPersonName(
        resolveAccountName({
          authName: user.displayName,
          email: user.email,
        }),
      );
    const named =
      isAdmin
        ? { displayName: "ADMIN" }
        : split
          ? {
              firstName: split.firstName,
              lastName: split.lastName,
              displayName: fullDisplayName(split.firstName, split.lastName),
            }
          : {
              firstName: "TVM",
              lastName: "Member",
              displayName: "TVM Member",
            };

    creates.push(
      setDoc(profileRef, {
        uid: user.uid,
        email: user.email,
        ...named,
        createdAt: now,
        updatedAt: now,
        tosVersion: TOS_VERSION,
        tosAcceptedAt: now,
        privacyAcceptedAt: now,
      }),
    );
  }

  if (!entitlement.exists()) {
    creates.push(
      setDoc(entitlementRef, {
        uid: user.uid,
        role: isAdmin ? "admin" : "client",
        plan: isAdmin ? "pro" : "free",
        watchlistLimit: isAdmin ? 100 : 10,
        cooldownDays: isAdmin ? 0 : 7,
        createdAt: now,
        updatedAt: now,
      }),
    );
  }

  if (!portfolio.exists()) {
    creates.push(
      setDoc(portfolioRef, {
        uid: user.uid,
        cash: 0,
        totalValue: 0,
        createdAt: now,
        updatedAt: now,
      }),
    );
  }

  if (creates.length) await Promise.all(creates);

  return { profile, entitlement, watchlist, portfolio };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [entitlement, setEntitlement] =
    useState<AccountEntitlement>(defaultEntitlement);
  const [watchlist, setWatchlist] =
    useState<AccountWatchlist>(defaultWatchlist);
  const [portfolio, setPortfolio] = useState<AccountPortfolio>({
    cash: 0,
    totalValue: 0,
  });
  const [positions, setPositions] = useState<PortfolioPosition[]>([]);
  const [loading, setLoading] = useState(true);
  const [accountReady, setAccountReady] = useState(false);
  const [error, setError] = useState("");
  const [giftPending, setGiftPending] = useState(false);
  const [giftGrantId, setGiftGrantId] = useState("comp");
  const [tourPending, setTourPending] = useState(false);
  const [releasePending, setReleasePending] = useState(false);
  const newSeenStampKey = useRef("");

  useEffect(() => {
    const auth = getClientAuth();
    const db = getClientFirestore();
    if (!auth || !db) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const unsubscribeAuth = onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);
      setError("");

      if (!nextUser) {
        setProfile(null);
        setEntitlement(defaultEntitlement);
        setWatchlist(defaultWatchlist);
        setPortfolio({ cash: 0, totalValue: 0 });
        setPositions([]);
        setGiftPending(false);
        setGiftGrantId("comp");
        setTourPending(false);
        setReleasePending(false);
        setAccountReady(true);
        setLoading(false);
        return;
      }

      setAccountReady(false);
      setProfile(profileFromAuth(nextUser));
      if (nextUser.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
        const plan = overlayLabsPlan("admin", "pro");
        setEntitlement({
          role: "admin",
          plan,
          watchlistLimit: watchlistLimitForPlan(plan),
          cooldownDays: 0,
          source: "none",
          stripeCustomerId: "",
          stripeCancelAtPeriodEnd: false,
          stripeAccessUntil: 0,
        });
      }
      setLoading(false);
      void ensureAccountDocuments(nextUser)
        .then((loaded) => {
          if (cancelled || !loaded) return;

          const userSnap = loaded.profile;
          const entitlementSnap = loaded.entitlement;
          const watchSnap = loaded.watchlist;
          const portfolioSnap = loaded.portfolio;

          if (userSnap.exists()) {
            const data = userSnap.data();
            const nextProfile = profileFrom(data);
            setProfile({
              ...nextProfile,
              displayName: resolveAccountName({
                profileName: nextProfile.displayName,
                authName: nextUser.displayName,
                email: nextUser.email,
              }),
            });
            const roleIsAdmin =
              nextUser.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
            const storedTour =
              typeof data.seenTour === "string" ? data.seenTour : "";
            const localTour = readTourSeen(nextUser.uid);
            const completedTour =
              storedTour ||
              localTour ||
              (asDate(data.tourCompletedAt) ? "tour-1" : "");
            const tourIsPending =
              !roleIsAdmin && completedTour !== CURRENT_TOUR_ID;
            setTourPending(tourIsPending);
            const seen = laterReleaseAck(
              typeof data.seenRelease === "string" ? data.seenRelease : "",
              readReleaseSeen(nextUser.uid),
            );
            setReleasePending(!tourIsPending && !releaseIsAcknowledged(seen));
          }

          if (entitlementSnap.exists()) {
            const data = entitlementSnap.data();
            setEntitlement(entitlementFromData(data, nextUser.email));
            const grantId = grantIdFrom(data);
            setGiftGrantId(grantId);
            setGiftPending(
              data.role === "client" &&
                data.plan === "pro" &&
                data.source === "comp" &&
                !data.giftAckedAt &&
                readGiftSeen(nextUser.uid) !== grantId,
            );
          }

          if (!watchSnap.exists()) {
            setWatchlist(defaultWatchlist);
          } else {
            const data = watchSnap.data();
            setWatchlist({
              symbols: Array.isArray(data.symbols)
                ? data.symbols.map(String)
                : [],
              changedAt: asDate(data.changedAt),
              nextChangeAt: asDate(data.nextChangeAt),
              exists: true,
            });
          }

          if (portfolioSnap.exists()) {
            const data = portfolioSnap.data();
            setPortfolio({
              cash: Number(data.cash) || 0,
              totalValue: Number(data.totalValue) || 0,
            });
          }

          void getDocs(collection(db, "portfolios", nextUser.uid, "positions"))
            .then((positionSnap) => {
              if (cancelled) return;
              setPositions(
                positionSnap.docs.map((position) => {
                  const data = position.data();
                  return {
                    symbol: String(data.symbol),
                    shares: Number(data.shares) || 0,
                    averageCost: Number(data.averageCost) || 0,
                    currentPrice: Number(data.currentPrice) || 0,
                    purchasedAt:
                      typeof data.purchasedAt === "string" && data.purchasedAt
                        ? data.purchasedAt
                        : null,
                  };
                }),
              );
            })
            .catch((positionError) => {
              console.error(positionError);
            });
        })
        .catch((accountError) => {
          console.error(accountError);
          setError(
            "Your account was authenticated, but its Firebase profile could not be loaded.",
          );
        })
        .finally(() => {
          if (!cancelled) setAccountReady(true);
        });
    });

    return () => {
      cancelled = true;
      unsubscribeAuth();
    };
  }, []);

  useEffect(() => {
    const db = getClientFirestore();
    if (!user || !db) return;
    return onSnapshot(doc(db, "entitlements", user.uid), (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();
      setEntitlement(entitlementFromData(data, user.email));
      const grantId = grantIdFrom(data);
      setGiftGrantId(grantId);
      setGiftPending(
        data.role === "client" &&
          data.plan === "pro" &&
          data.source === "comp" &&
          !data.giftAckedAt &&
          readGiftSeen(user.uid) !== grantId,
      );
    });
  }, [user]);

  const watchlistResetting = useRef(false);
  useEffect(() => {
    if (loading || !user) return;
    if (entitlement.plan !== "free" || entitlement.role === "admin") return;
    if (!watchlist.exists) return;
    if (watchlist.symbols.length <= entitlement.watchlistLimit) return;
    if (watchlistResetting.current) return;
    const db = getClientFirestore();
    if (!db) return;
    watchlistResetting.current = true;
    void updateDoc(doc(db, "watchlists", user.uid), {
      symbols: [],
      changedAt: serverTimestamp(),
      nextChangeAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }).finally(() => {
      watchlistResetting.current = false;
    });
    setWatchlist((current) => ({
      ...current,
      symbols: [],
      changedAt: new Date(),
      nextChangeAt: new Date(),
      exists: true,
    }));
  }, [
    entitlement.plan,
    entitlement.role,
    entitlement.watchlistLimit,
    loading,
    user,
    watchlist.exists,
    watchlist.symbols.length,
  ]);

  useEffect(() => {
    if (loading || !user || !profile) return;
    const local = readNewSeen(user.uid);
    const combined = { ...local, ...profile.newSeen };
    const next = { ...combined, ...missingNewSeenStamps(combined) };
    writeNewSeen(user.uid, next);
    const cloudNeeds = Object.keys(next).filter(
      (id) => next[id as NewFeatureId] && !profile.newSeen[id as NewFeatureId],
    ) as NewFeatureId[];
    if (JSON.stringify(next) !== JSON.stringify(profile.newSeen)) {
      setProfile((current) => (current ? { ...current, newSeen: next } : current));
    }
    if (cloudNeeds.length === 0) return;
    const stampKey = `${user.uid}:${cloudNeeds.sort().join(",")}`;
    if (newSeenStampKey.current === stampKey) return;
    newSeenStampKey.current = stampKey;
    const db = getClientFirestore();
    if (!db) return;
    const payload: Record<string, string | ReturnType<typeof serverTimestamp>> = {
      updatedAt: serverTimestamp(),
    };
    for (const id of cloudNeeds) {
      payload[`newSeen.${id}`] = next[id] as string;
    }
    void updateDoc(doc(db, "users", user.uid), payload).catch((stampError) => {
      console.error(stampError);
    });
  }, [loading, profile, user]);

  const logout = useCallback(async () => {
    const auth = getClientAuth();
    if (auth) await signOut(auth);
  }, []);

  const acknowledgeGift = useCallback(async () => {
    const db = getClientFirestore();
    if (!user) return;
    writeGiftSeen(user.uid, giftGrantId);
    setGiftPending(false);
    if (!db) return;
    try {
      await updateDoc(doc(db, "entitlements", user.uid), {
        giftAckedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (ackError) {
      console.error(ackError);
    }
  }, [giftGrantId, user]);

  const completeTour = useCallback(async () => {
    const db = getClientFirestore();
    if (!user) return;
    writeTourSeen(user.uid, CURRENT_TOUR_ID);
    setTourPending(false);
    const seenRelease = laterReleaseAck(
      readReleaseSeen(user.uid),
      profile?.seenRelease || "",
    );
    setReleasePending(!releaseIsAcknowledged(seenRelease));
    if (!db) return;
    try {
      await updateDoc(doc(db, "users", user.uid), {
        tourCompletedAt: serverTimestamp(),
        seenTour: CURRENT_TOUR_ID,
        updatedAt: serverTimestamp(),
      });
    } catch (tourError) {
      console.error(tourError);
    }
  }, [profile?.seenRelease, user]);

  const acknowledgeRelease = useCallback(async () => {
    const db = getClientFirestore();
    if (!user) return;
    const next = laterReleaseAck(
      laterReleaseAck(readReleaseSeen(user.uid), profile?.seenRelease || ""),
      RELEASE_ACK_ID,
    );
    writeReleaseSeen(user.uid, next);
    setReleasePending(false);
    if (!db) return;
    try {
      await updateDoc(doc(db, "users", user.uid), {
        seenRelease: next,
        updatedAt: serverTimestamp(),
      });
    } catch (releaseError) {
      console.error(releaseError);
    }
  }, [profile?.seenRelease, user]);

  const acknowledgeCustomize = useCallback(async () => {
    const db = getClientFirestore();
    if (!user) return;
    try {
      window.localStorage.setItem(customizeLocalKey(user.uid), CURRENT_CUSTOMIZE_ID);
      window.localStorage.setItem(LEGACY_CUSTOMIZE_KEY, "1");
    } catch {
      /* private mode */
    }
    setProfile((current) =>
      current ? { ...current, seenCustomize: CURRENT_CUSTOMIZE_ID } : current,
    );
    if (!db) return;
    try {
      await updateDoc(doc(db, "users", user.uid), {
        seenCustomize: CURRENT_CUSTOMIZE_ID,
        updatedAt: serverTimestamp(),
      });
    } catch (customizeError) {
      console.error(customizeError);
    }
  }, [user]);

  const isFeatureNew = useCallback(
    (feature: NewFeatureId) => {
      if (!publicNewFeatureIds().includes(feature)) return false;
      const local = user ? readNewSeen(user.uid)[feature] : undefined;
      return isNewBadgeActive(profile?.newSeen[feature] ?? local);
    },
    [profile?.newSeen, user],
  );

  const updateDisplayName = useCallback(
    async (firstName: string, lastName: string) => {
      const db = getClientFirestore();
      if (!user) throw new Error("Sign in to update your name.");
      const first = normalizePersonName(firstName);
      const last = normalizePersonName(lastName);
      if (!isPersonName(first) || !isPersonName(last)) {
        throw new Error("Enter a first and last name (letters only, no numbers).");
      }
      const displayName = fullDisplayName(first, last);
      await updateProfile(user, { displayName });
      setProfile((current) =>
        current
          ? { ...current, firstName: first, lastName: last, displayName }
          : current,
      );
      if (db) {
        try {
          await updateDoc(doc(db, "users", user.uid), {
            firstName: first,
            lastName: last,
            displayName,
            updatedAt: serverTimestamp(),
          });
        } catch (saveError) {
          console.error(saveError);
        }
      }
    },
    [user],
  );

  const updateLocale = useCallback(
    async (country: string, timeZone: string) => {
      const db = getClientFirestore();
      if (!user) throw new Error("Sign in to save your time zone.");
      const nextCountry = country.trim().toUpperCase();
      const nextZone = timeZone.trim();
      if (!isValidCountry(nextCountry) || !isValidTimeZone(nextZone)) {
        throw new Error("Pick a listed country and a valid time zone.");
      }
      writeStoredLocale(user.uid, nextCountry, nextZone);
      setProfile((current) =>
        current
          ? { ...current, country: nextCountry, timeZone: nextZone }
          : current,
      );
      if (!db) return;
      try {
        await setDoc(
          doc(db, "users", user.uid),
          {
            country: nextCountry,
            timeZone: nextZone,
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        );
      } catch (saveError) {
        console.error(saveError);
      }
    },
    [user],
  );

  const updateWatchlist = useCallback(
    async (symbols: string[]) => {
      const db = getClientFirestore();
      if (!db || !user) throw new Error("Sign in to update your watchlist.");

      const invalid = symbols
        .map((symbol) => symbol.trim())
        .filter(Boolean)
        .filter((symbol) => !parseTicker(symbol));
      if (invalid.length) {
        throw new Error(`Watchlist can only include listed tickers. Remove ${invalid.join(", ")}.`);
      }
      const normalized = Array.from(
        new Set(
          symbols
            .map((symbol) => parseTicker(symbol))
            .filter((symbol): symbol is string => Boolean(symbol)),
        ),
      );
      if (normalized.length > entitlement.watchlistLimit) {
        throw new Error(
          `Your ${entitlement.plan} plan allows ${entitlement.watchlistLimit} watched stocks.`,
        );
      }
      if (
        entitlement.plan === "free" &&
        watchlist.exists &&
        watchlist.nextChangeAt &&
        watchlist.nextChangeAt.getTime() > Date.now()
      ) {
        throw new Error(
          `Your free watchlist can be changed again on ${watchlist.nextChangeAt.toLocaleDateString()}.`,
        );
      }

      const now = Date.now();
      const nextChangeAt =
        planHasPro(entitlement.plan)
          ? Timestamp.fromMillis(now + 60_000)
          : Timestamp.fromMillis(now + WEEK_MS);
      const reference = doc(db, "watchlists", user.uid);

      if (watchlist.exists) {
        await setDoc(
          reference,
          {
            uid: user.uid,
            symbols: normalized,
            changedAt: serverTimestamp(),
            nextChangeAt,
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        );
      } else {
        await setDoc(reference, {
          uid: user.uid,
          symbols: normalized,
          changedAt: serverTimestamp(),
          nextChangeAt,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      setWatchlist({
        symbols: normalized,
        changedAt: new Date(),
        nextChangeAt: nextChangeAt.toDate(),
        exists: true,
      });
    },
    [entitlement, user, watchlist],
  );

  const updatePortfolio = useCallback(
    async (cash: number, totalValue: number) => {
      const db = getClientFirestore();
      if (!db || !user) throw new Error("Sign in to update your portfolio.");
      await setDoc(
        doc(db, "portfolios", user.uid),
        {
          uid: user.uid,
          cash: Math.max(0, cash),
          totalValue: Math.max(0, totalValue),
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
      setPortfolio({
        cash: Math.max(0, cash),
        totalValue: Math.max(0, totalValue),
      });
    },
    [user],
  );

  const savePosition = useCallback(
    async (
      position: Omit<PortfolioPosition, "currentPrice"> & {
        currentPrice?: number;
      },
    ) => {
      const db = getClientFirestore();
      if (!db || !user) throw new Error("Sign in to update your portfolio.");
      const symbol = position.symbol.trim().toUpperCase();
      const next = {
        symbol,
        shares: Math.max(0, position.shares),
        averageCost: Math.max(0, position.averageCost),
        currentPrice: Math.max(0, position.currentPrice ?? position.averageCost),
        purchasedAt: position.purchasedAt || null,
      };
      await setDoc(doc(db, "portfolios", user.uid, "positions", symbol), {
        uid: user.uid,
        ...next,
        updatedAt: serverTimestamp(),
      });
      setPositions((current) => {
        const without = current.filter((row) => row.symbol !== symbol);
        return [...without, next];
      });
    },
    [user],
  );

  const removePosition = useCallback(
    async (symbol: string) => {
      const db = getClientFirestore();
      if (!db || !user) throw new Error("Sign in to update your portfolio.");
      await deleteDoc(
        doc(db, "portfolios", user.uid, "positions", symbol.toUpperCase()),
      );
      setPositions((current) =>
        current.filter((row) => row.symbol !== symbol.toUpperCase()),
      );
    },
    [user],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      entitlement,
      watchlist,
      portfolio,
      positions,
      loading,
      accountReady,
      error,
      giftPending,
      tourPending,
      releasePending,
      logout,
      acknowledgeGift,
      completeTour,
      acknowledgeRelease,
      acknowledgeCustomize,
      isFeatureNew,
      updateDisplayName,
      updateLocale,
      updateWatchlist,
      updatePortfolio,
      savePosition,
      removePosition,
    }),
    [
      entitlement,
      error,
      giftPending,
      tourPending,
      releasePending,
      loading,
      accountReady,
      logout,
      acknowledgeGift,
      completeTour,
      acknowledgeRelease,
      acknowledgeCustomize,
      isFeatureNew,
      updateDisplayName,
      updateLocale,
      portfolio,
      positions,
      profile,
      removePosition,
      savePosition,
      updatePortfolio,
      updateWatchlist,
      user,
      watchlist,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider.");
  return context;
}
