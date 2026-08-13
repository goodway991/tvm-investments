"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  onAuthStateChanged,
  signOut,
  type User,
} from "firebase/auth";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  Timestamp,
  type DocumentData,
} from "firebase/firestore";
import {
  getClientAuth,
  getClientFirestore,
} from "@/lib/firebase/client";
import { LEGAL_STORAGE_KEY, TOS_VERSION } from "@/lib/legal";
import { WATCHLIST_ALLOWED_SYMBOLS } from "@/lib/watchlist-symbols";

const ADMIN_EMAIL =
  process.env.NEXT_PUBLIC_TVM_ADMIN_EMAIL || "admin@tvm-investments.test";
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export interface AccountProfile {
  uid: string;
  email: string;
  displayName: string;
  createdAt: Date | null;
}

export interface AccountEntitlement {
  role: "client" | "admin";
  plan: "free" | "pro";
  watchlistLimit: number;
  cooldownDays: number;
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
}

interface AuthContextValue {
  user: User | null;
  profile: AccountProfile | null;
  entitlement: AccountEntitlement;
  watchlist: AccountWatchlist;
  portfolio: AccountPortfolio;
  positions: PortfolioPosition[];
  loading: boolean;
  error: string;
  logout: () => Promise<void>;
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
};

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

function profileFrom(data: DocumentData): AccountProfile {
  return {
    uid: String(data.uid),
    email: String(data.email),
    displayName: String(data.displayName),
    createdAt: asDate(data.createdAt),
  };
}

async function ensureAccountDocuments(user: User) {
  const db = getClientFirestore();
  if (!db || !user.email) return;

  const now = serverTimestamp();
  const isAdmin = user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
  const profileRef = doc(db, "users", user.uid);
  const entitlementRef = doc(db, "entitlements", user.uid);
  const portfolioRef = doc(db, "portfolios", user.uid);

  const profile = await getDoc(profileRef);
  if (!profile.exists()) {
    try {
      sessionStorage.removeItem(LEGAL_STORAGE_KEY);
    } catch {
      /* private browsing */
    }

    await setDoc(profileRef, {
      uid: user.uid,
      email: user.email,
      displayName: isAdmin ? "ADMIN" : user.displayName || user.email.split("@")[0],
      createdAt: now,
      updatedAt: now,
      tosVersion: TOS_VERSION,
      tosAcceptedAt: now,
      privacyAcceptedAt: now,
    });
  }

  const entitlement = await getDoc(entitlementRef);
  if (!entitlement.exists()) {
    await setDoc(entitlementRef, {
      uid: user.uid,
      role: isAdmin ? "admin" : "client",
      plan: isAdmin ? "pro" : "free",
      watchlistLimit: isAdmin ? 100 : 10,
      cooldownDays: isAdmin ? 0 : 7,
      createdAt: now,
      updatedAt: now,
    });
  }

  const portfolio = await getDoc(portfolioRef);
  if (!portfolio.exists()) {
    await setDoc(portfolioRef, {
      uid: user.uid,
      cash: 0,
      totalValue: 0,
      createdAt: now,
      updatedAt: now,
    });
  }
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
  const [error, setError] = useState("");

  useEffect(() => {
    const auth = getClientAuth();
    const db = getClientFirestore();
    if (!auth || !db) {
      setLoading(false);
      return;
    }

    let documentUnsubscribers: Array<() => void> = [];
    let cancelled = false;

    const clearDocumentListeners = () => {
      documentUnsubscribers.forEach((unsubscribe) => unsubscribe());
      documentUnsubscribers = [];
    };

    const unsubscribeAuth = onAuthStateChanged(auth, async (nextUser) => {
      clearDocumentListeners();
      setUser(nextUser);
      setError("");

      if (!nextUser) {
        setProfile(null);
        setEntitlement(defaultEntitlement);
        setWatchlist(defaultWatchlist);
        setPortfolio({ cash: 0, totalValue: 0 });
        setPositions([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        await ensureAccountDocuments(nextUser);
        if (cancelled) return;

        documentUnsubscribers = [
          onSnapshot(doc(db, "users", nextUser.uid), (snapshot) => {
            if (snapshot.exists()) setProfile(profileFrom(snapshot.data()));
          }),
          onSnapshot(doc(db, "entitlements", nextUser.uid), (snapshot) => {
            if (!snapshot.exists()) return;
            const data = snapshot.data();
            setEntitlement({
              role: data.role === "admin" ? "admin" : "client",
              plan: data.plan === "pro" ? "pro" : "free",
              watchlistLimit: Number(data.watchlistLimit) || 10,
              cooldownDays: Number(data.cooldownDays) || 0,
            });
          }),
          onSnapshot(doc(db, "watchlists", nextUser.uid), (snapshot) => {
            if (!snapshot.exists()) {
              setWatchlist(defaultWatchlist);
              return;
            }
            const data = snapshot.data();
            setWatchlist({
              symbols: Array.isArray(data.symbols)
                ? data.symbols.map(String)
                : [],
              changedAt: asDate(data.changedAt),
              nextChangeAt: asDate(data.nextChangeAt),
              exists: true,
            });
          }),
          onSnapshot(doc(db, "portfolios", nextUser.uid), (snapshot) => {
            if (!snapshot.exists()) return;
            const data = snapshot.data();
            setPortfolio({
              cash: Number(data.cash) || 0,
              totalValue: Number(data.totalValue) || 0,
            });
          }),
          onSnapshot(
            collection(db, "portfolios", nextUser.uid, "positions"),
            (snapshot) => {
              setPositions(
                snapshot.docs.map((position) => {
                  const data = position.data();
                  return {
                    symbol: String(data.symbol),
                    shares: Number(data.shares) || 0,
                    averageCost: Number(data.averageCost) || 0,
                    currentPrice: Number(data.currentPrice) || 0,
                  };
                }),
              );
            },
          ),
        ];
      } catch (accountError) {
        console.error(accountError);
        setError(
          "Your account was authenticated, but its Firebase profile could not be loaded.",
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    });

    return () => {
      cancelled = true;
      clearDocumentListeners();
      unsubscribeAuth();
    };
  }, []);

  const logout = useCallback(async () => {
    const auth = getClientAuth();
    if (auth) await signOut(auth);
  }, []);

  const updateWatchlist = useCallback(
    async (symbols: string[]) => {
      const db = getClientFirestore();
      if (!db || !user) throw new Error("Sign in to update your watchlist.");

      const normalized = Array.from(
        new Set(symbols.map((symbol) => symbol.trim().toUpperCase()).filter(Boolean)),
      );
      const allowed = new Set(WATCHLIST_ALLOWED_SYMBOLS);
      const blocked = normalized.filter((symbol) => !allowed.has(symbol));
      if (blocked.length) {
        throw new Error(
          `Watchlist can only include TVM scan names (S&P 500, Dow 30, and extra liquid names). Remove ${blocked.join(", ")}.`,
        );
      }
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
        entitlement.plan === "pro"
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
      await setDoc(doc(db, "portfolios", user.uid, "positions", symbol), {
        uid: user.uid,
        symbol,
        shares: Math.max(0, position.shares),
        averageCost: Math.max(0, position.averageCost),
        currentPrice: Math.max(0, position.currentPrice ?? position.averageCost),
        updatedAt: serverTimestamp(),
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
      error,
      logout,
      updateWatchlist,
      updatePortfolio,
      savePosition,
      removePosition,
    }),
    [
      entitlement,
      error,
      loading,
      logout,
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
