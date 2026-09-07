import type { DailySnapshot, BacktestEntry, BacktestSummary, ScreenedStock } from "@/types";
import { etDateString } from "@/lib/archive-window";
import { ARCHIVE_KEEP_DAYS, watchlistLimitForPlan, type PaidPlanId, type PlanId } from "@/lib/plans";
import { sanitizePlainText } from "@/lib/sanitize-text";
import { slimSnapshot } from "@/lib/snapshot-view";

let adminDb: FirebaseFirestore.Firestore | null = null;
const databaseId =
  process.env.NEXT_PUBLIC_FIREBASE_DATABASE_ID || "tvm-investments";

function normalizePrivateKey(value?: string) {
  if (!value) return undefined;
  let key = value.trim();
  if (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  ) {
    key = key.slice(1, -1);
  }
  key = key
    .replace(/\r\n/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/\\(\n|$)/g, "$1")
    .trim();
  return key;
}

export async function getAdminDb(): Promise<FirebaseFirestore.Firestore | null> {
  if (adminDb) return adminDb;

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = normalizePrivateKey(process.env.FIREBASE_ADMIN_PRIVATE_KEY);

  if (!projectId || !clientEmail || !privateKey) return null;

  try {
    const { initializeApp, getApps, cert } = await import("firebase-admin/app");
    const { getFirestore } = await import("firebase-admin/firestore");

    const app =
      getApps().length > 0
        ? getApps()[0]
        : initializeApp({
            credential: cert({ projectId, clientEmail, privateKey }),
          });

    adminDb = getFirestore(app, databaseId);
    adminDb.settings({ ignoreUndefinedProperties: true });
    return adminDb;
  } catch (e) {
    console.warn("Firebase Admin init failed:", e);
    return null;
  }
}

const SCREENED_CHUNK_SIZE = 250;

async function writeScreenedChunks(
  ref: FirebaseFirestore.DocumentReference,
  stocks: ScreenedStock[],
) {
  const existing = await ref.collection("screened").get();
  for (let index = 0; index < existing.docs.length; index += 400) {
    const batch = ref.firestore.batch();
    for (const doc of existing.docs.slice(index, index + 400)) {
      batch.delete(doc.ref);
    }
    await batch.commit();
  }
  for (let start = 0; start < stocks.length; start += SCREENED_CHUNK_SIZE) {
    const batch = ref.firestore.batch();
    const slice = stocks.slice(start, start + SCREENED_CHUNK_SIZE);
    const chunkIndex = Math.floor(start / SCREENED_CHUNK_SIZE);
    batch.set(ref.collection("screened").doc(`chunk-${chunkIndex}`), {
      index: chunkIndex,
      rows: slice,
    });
    await batch.commit();
  }
}

async function readScreenedChunks(
  ref: FirebaseFirestore.DocumentReference,
  data: DailySnapshot,
): Promise<ScreenedStock[]> {
  if (Array.isArray(data.screenedStocks) && data.screenedStocks.length > 0) {
    return data.screenedStocks;
  }
  try {
    const snap = await ref.collection("screened").orderBy("index").get();
    return snap.docs.flatMap((doc) => {
      const rows = doc.data().rows;
      return Array.isArray(rows) ? (rows as ScreenedStock[]) : [];
    });
  } catch {
    const snap = await ref.collection("screened").get();
    return snap.docs
      .sort(
        (left, right) =>
          Number(left.data().index ?? 0) - Number(right.data().index ?? 0),
      )
      .flatMap((doc) => {
        const rows = doc.data().rows;
        return Array.isArray(rows) ? (rows as ScreenedStock[]) : [];
      });
  }
}

async function assembleSnapshot(
  ref: FirebaseFirestore.DocumentReference,
  data: DailySnapshot,
): Promise<DailySnapshot> {
  const screenedStocks = await readScreenedChunks(ref, data);
  return {
    ...data,
    screenedStocks,
    scanUniverse: {
      ...data.scanUniverse,
      combined: Math.max(data.scanUniverse?.combined ?? 0, screenedStocks.length),
    },
  };
}

export async function saveDailySnapshot(snapshot: DailySnapshot): Promise<boolean> {
  const db = await getAdminDb();
  if (!db) return false;

  try {
    const slim = slimSnapshot(snapshot);
    const ref = db.collection("daily_snapshots").doc(slim.id);
    const existing = await ref.get();
    const sameStamp =
      existing.exists &&
      String(existing.data()?.generatedAt || "") === slim.generatedAt;
    await writeScreenedChunks(ref, slim.screenedStocks);
    await ref.set({
      ...slim,
      screenedStocks: [],
      screenedCount: slim.screenedStocks.length,
    });
    const hadDate = await writeSnapshotIndex(db, slim);

    if (!sameStamp && !hadDate) {
      for (const pick of snapshot.topPicks) {
        await db.collection("backtest_entries").add({
          date: snapshot.date,
          symbol: pick.symbol,
          pickRank: pick.rank ?? 0,
          entryPrice: pick.price,
          compositeScore: pick.compositeScore,
          return1d: null,
          return1w: null,
          return1m: null,
          spReturn1d: null,
          spReturn1w: null,
          spReturn1m: null,
        } satisfies BacktestEntry);
      }
      await refreshBacktestMeta(db);
    }

    return true;
  } catch (error) {
    console.warn("Firebase snapshot save failed:", error);
    return false;
  }
}

async function writeSnapshotIndex(
  db: FirebaseFirestore.Firestore,
  snapshot: DailySnapshot,
) {
  const ref = db.collection("meta").doc("snapshots");
  const current = await ref.get();
  const previous = Array.isArray(current.data()?.dates)
    ? (current.data()!.dates as unknown[]).map(String)
    : [];
  const hadDate = previous.includes(snapshot.date);
  const dates = Array.from(new Set([snapshot.date, ...previous]))
    .filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date))
    .sort()
    .reverse()
    .slice(0, ARCHIVE_KEEP_DAYS);
  const extra = previous.filter(
    (date) => !dates.includes(date) && date !== snapshot.date,
  );
  await ref.set({
    latestId: snapshot.id,
    latestDate: snapshot.date,
    generatedAt: snapshot.generatedAt,
    dates,
    updatedAt: new Date().toISOString(),
  });
  if (extra.length) {
    const batch = db.batch();
    for (const date of extra) {
      batch.delete(db.collection("daily_snapshots").doc(date));
    }
    await batch.commit();
  }
  return hadDate;
}

export async function getLatestSnapshot(): Promise<DailySnapshot | null> {
  const db = await getAdminDb();
  if (!db) return null;

  const snap = await db
    .collection("daily_snapshots")
    .orderBy("generatedAt", "desc")
    .limit(1)
    .get();

  if (snap.empty) return null;
  return assembleSnapshot(
    snap.docs[0].ref,
    snap.docs[0].data() as DailySnapshot,
  );
}

export async function hasLiveSnapshotForDate(date: string): Promise<boolean> {
  const db = await getAdminDb();
  if (!db) return false;
  const doc = await db.collection("daily_snapshots").doc(date).get();
  if (!doc.exists) return false;
  const data = doc.data() || {};
  return data.dataMode === "live" && Number(data.screenedCount || 0) > 0;
}

export async function getSnapshotByDate(date: string): Promise<DailySnapshot | null> {
  const db = await getAdminDb();
  if (!db) return null;
  const doc = await db.collection("daily_snapshots").doc(date).get();
  if (!doc.exists) return null;
  return assembleSnapshot(doc.ref, doc.data() as DailySnapshot);
}

export async function listSnapshotDates(limit = ARCHIVE_KEEP_DAYS): Promise<string[]> {
  const db = await getAdminDb();
  if (!db) return [];
  const index = await db.collection("meta").doc("snapshots").get();
  if (index.exists) {
    return (Array.isArray(index.data()?.dates) ? index.data()!.dates : [])
      .map((date: unknown) => String(date))
      .filter((date: string) => /^\d{4}-\d{2}-\d{2}$/.test(date))
      .slice(0, limit);
  }
  const snap = await db
    .collection("daily_snapshots")
    .orderBy("date", "desc")
    .select("date")
    .limit(limit)
    .get();
  return snap.docs
    .map((doc) => String(doc.data().date || doc.id))
    .filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date));
}

export async function getBacktestSummary(): Promise<BacktestSummary | null> {
  const db = await getAdminDb();
  if (!db) return null;

  const cached = await db.collection("meta").doc("backtest").get();
  const summary = cached.data()?.summary as BacktestSummary | undefined;
  if (summary && typeof summary.totalDays === "number") {
    return summary;
  }
  return refreshBacktestMeta(db);
}

async function refreshBacktestMeta(
  db: FirebaseFirestore.Firestore,
): Promise<BacktestSummary | null> {
  const snap = await db
    .collection("backtest_entries")
    .orderBy("date", "desc")
    .limit(90)
    .get();
  const entries = snap.docs.map((d) => d.data() as BacktestEntry);

  if (entries.length === 0) return null;

  const avg = (arr: number[]) =>
    arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

  const r1d = entries.map((e) => e.return1d).filter((v): v is number => v != null);
  const r1w = entries.map((e) => e.return1w).filter((v): v is number => v != null);
  const r1m = entries.map((e) => e.return1m).filter((v): v is number => v != null);

  const summary: BacktestSummary = {
    totalDays: new Set(entries.map((e) => e.date)).size,
    avgReturn1d: avg(r1d),
    avgReturn1w: avg(r1w),
    avgReturn1m: avg(r1m),
    spAvgReturn1d: avg(entries.map((e) => e.spReturn1d).filter((v): v is number => v != null)),
    spAvgReturn1w: avg(entries.map((e) => e.spReturn1w).filter((v): v is number => v != null)),
    spAvgReturn1m: avg(entries.map((e) => e.spReturn1m).filter((v): v is number => v != null)),
    entries,
  };
  await db.collection("meta").doc("backtest").set({
    summary,
    updatedAt: new Date().toISOString(),
  });
  return summary;
}

export async function saveUserInvestment(data: {
  userId?: string;
  symbol: string;
  amountUsd: number;
  entryPrice: number;
  scenarios: Record<string, number>;
}): Promise<boolean> {
  const db = await getAdminDb();
  if (!db) return false;

  await db.collection("user_investments").add({
    ...data,
    createdAt: new Date().toISOString(),
  });
  return true;
}

const ADMIN_EMAIL =
  process.env.TVM_ADMIN_EMAIL?.trim() || "admin@tvm-investments.test";

export function isAdminEmail(email?: string | null) {
  return (email || "").toLowerCase() === ADMIN_EMAIL.toLowerCase();
}

export function isQuotaError(error: unknown) {
  const text = error instanceof Error ? error.message : String(error);
  return /quota|resource.?exhausted|RESOURCE_EXHAUSTED/i.test(text);
}

async function getAdminAuth() {
  await getAdminDb();
  const { getApps } = await import("firebase-admin/app");
  const { getAuth } = await import("firebase-admin/auth");
  const app = getApps()[0];
  return app ? getAuth(app) : null;
}

export async function verifyIdToken(idToken: string) {
  const auth = await getAdminAuth();
  if (!auth) return null;
  try {
    return await auth.verifyIdToken(idToken);
  } catch {
    return null;
  }
}

export type AdminAccountRow = {
  uid: string;
  email: string;
  displayName: string;
  role: "client" | "admin";
  plan: PlanId;
  source: "comp" | "paid" | "none";
  disabled: boolean;
  betaTester: boolean;
  waitlistStatus: "none" | "pending" | "admitted";
  discordConnected: boolean;
};

type AdminAccountsPayload = {
  rows: AdminAccountRow[];
  plansLoaded: boolean;
};

let adminAccountsCache: { at: number; payload: AdminAccountsPayload } | null = null;
const ADMIN_ACCOUNTS_TTL_MS = 45_000;

export function invalidateAdminAccountsCache() {
  adminAccountsCache = null;
}

export async function listAdminAccounts(options?: {
  force?: boolean;
}): Promise<AdminAccountsPayload> {
  if (
    !options?.force &&
    adminAccountsCache &&
    Date.now() - adminAccountsCache.at < ADMIN_ACCOUNTS_TTL_MS
  ) {
    return adminAccountsCache.payload;
  }

  const auth = await getAdminAuth();
  if (!auth) throw new Error("Admin access is not configured.");

  const authUsers: Array<{
    uid: string;
    email: string;
    displayName: string;
    disabled: boolean;
    claimPlan?: PlanId;
    claimRole?: "client" | "admin";
    claimSource?: "comp" | "paid" | "none";
  }> = [];
  let pageToken: string | undefined;
  do {
    const page = await auth.listUsers(1000, pageToken);
    for (const record of page.users) {
      const claims = (record.customClaims || {}) as Record<string, unknown>;
      const claimPlan =
        claims.tvmPlan === "ultra" || claims.tvmPlan === "pro" || claims.tvmPlan === "free"
          ? claims.tvmPlan
          : undefined;
      const claimRole = claims.tvmRole === "admin" ? "admin" : claims.tvmRole === "client" ? "client" : undefined;
      const claimSource =
        claims.tvmSource === "comp" || claims.tvmSource === "paid" || claims.tvmSource === "none"
          ? claims.tvmSource
          : claims.tvmSource === "stripe"
            ? "paid"
            : undefined;
      authUsers.push({
        uid: record.uid,
        email: record.email || "",
        displayName: record.displayName || "",
        disabled: Boolean(record.disabled),
        claimPlan,
        claimRole,
        claimSource,
      });
    }
    pageToken = page.pageToken;
  } while (pageToken);

  const entitlements = new Map<
    string,
    { role: "client" | "admin"; plan: PlanId; source: "comp" | "paid" | "none" }
  >();
  const beta = new Map<
    string,
    { betaTester: boolean; waitlistStatus: "none" | "pending" | "admitted"; discordConnected: boolean }
  >();
  let plansLoaded = false;
  const missingClaims = authUsers.some((row) => !row.claimPlan && !isAdminEmail(row.email));
  const db = await getAdminDb();
  if (db) {
    try {
      const { SHOW_BETA_WAITLIST } = await import("@/lib/beta-waitlist");
      // Prefer Auth custom claims; only scan entitlements when some users lack claims.
      if (missingClaims) {
        const entitlementSnap = await db.collection("entitlements").get();
        for (const item of entitlementSnap.docs) {
          const data = item.data();
          const source =
            data.source === "stripe" || data.source === "paid"
              ? "paid"
              : data.source === "comp"
                ? "comp"
                : "none";
          entitlements.set(item.id, {
            role: data.role === "admin" ? "admin" : "client",
            plan:
              data.plan === "ultra" ? "ultra" : data.plan === "pro" ? "pro" : "free",
            source,
          });
        }
      }

      if (SHOW_BETA_WAITLIST) {
        const betaSnap = await db.collection("beta_status").get();
        for (const item of betaSnap.docs) {
          const data = item.data();
          const waitlistStatus =
            data.waitlistStatus === "pending" || data.waitlistStatus === "admitted"
              ? data.waitlistStatus
              : "none";
          beta.set(item.id, {
            waitlistStatus,
            betaTester: data.betaTester === true || waitlistStatus === "admitted",
            discordConnected: data.discordConnected === true,
          });
        }
      }
      plansLoaded = true;
    } catch (error) {
      if (!isQuotaError(error)) throw error;
    }
  }

  const rows = authUsers
    .map((record) => {
      const next = entitlements.get(record.uid);
      const status = beta.get(record.uid);
      const admin =
        isAdminEmail(record.email) ||
        record.claimRole === "admin" ||
        next?.role === "admin";
      const plan = admin
        ? "pro"
        : record.claimPlan || next?.plan || "free";
      const source = admin
        ? "none"
        : record.claimSource || next?.source || "none";
      return {
        uid: record.uid,
        email: record.email,
        displayName: record.displayName,
        role: admin ? "admin" : "client",
        plan,
        source,
        disabled: record.disabled,
        betaTester: admin ? true : Boolean(status?.betaTester),
        waitlistStatus: admin ? "admitted" : status?.waitlistStatus ?? "none",
        discordConnected: Boolean(status?.discordConnected),
      } satisfies AdminAccountRow;
    })
    .sort((a, b) => a.email.localeCompare(b.email));

  const payload = { rows, plansLoaded };
  adminAccountsCache = { at: Date.now(), payload };
  return payload;
}

export async function setAdminPlan(uid: string, plan: PlanId) {
  const auth = await getAdminAuth();
  const db = await getAdminDb();
  if (!auth || !db) throw new Error("Admin access is not configured.");
  if (plan !== "free" && plan !== "pro" && plan !== "ultra") {
    throw new Error("Pick Free, Pro, or Ultra.");
  }

  const record = await auth.getUser(uid);
  if (isAdminEmail(record.email)) {
    throw new Error("The admin account stays on Ultra.");
  }

  const ref = db.collection("entitlements").doc(uid);
  const current = await ref.get();
  const data = current.data() || {};
  if (data.role === "admin") {
    throw new Error("The admin account stays on Ultra.");
  }

  const { FieldValue } = await import("firebase-admin/firestore");
  const now = new Date();
  const paid = plan === "pro" || plan === "ultra";
  await ref.set(
    {
      uid,
      role: "client",
      plan: paid ? plan : "free",
      watchlistLimit: watchlistLimitForPlan(paid ? plan : "free"),
      cooldownDays: paid ? 0 : 7,
      createdAt: data.createdAt || now,
      updatedAt: now,
      source: paid ? "comp" : FieldValue.delete(),
      giftedAt: paid ? now : FieldValue.delete(),
      giftAckedAt: FieldValue.delete(),
      betaExpiresAt: FieldValue.delete(),
      betaCodeId: FieldValue.delete(),
      stripeSubscriptionId: FieldValue.delete(),
      stripeCancelAtPeriodEnd: FieldValue.delete(),
      stripeAccessUntil: FieldValue.delete(),
      stripePendingPlan: FieldValue.delete(),
      stripePendingUntil: FieldValue.delete(),
    },
    { merge: true },
  );

  void import("@/lib/discord-role-sync")
    .then((mod) => mod.syncDiscordRolesForUid(uid))
    .catch((error) => console.warn("[discord] admin plan role sync:", error));

  invalidateAdminAccountsCache();

  await syncAuthPlanClaims(uid, {
    plan: paid ? plan : "free",
    role: "client",
    source: paid ? "comp" : "none",
  });

  return {
    stripeSubscriptionId:
      typeof data.stripeSubscriptionId === "string"
        ? data.stripeSubscriptionId
        : "",
  };
}

export async function saveFeedback(entry: {
  uid: string;
  email: string;
  kind: "bug" | "feature" | "support";
  rating: number;
  message: string;
  emailed?: boolean;
}): Promise<boolean> {
  const db = await getAdminDb();
  if (!db) return false;
  await db.collection("feedback").add({
    ...entry,
    emailed: Boolean(entry.emailed),
    createdAt: new Date().toISOString(),
  });
  return true;
}

export type FeedbackRow = {
  id: string;
  email: string;
  kind: "bug" | "feature" | "support";
  rating: number;
  message: string;
  createdAt: string;
  emailed: boolean;
};

export async function listFeedback(limitN = 40): Promise<FeedbackRow[]> {
  const db = await getAdminDb();
  if (!db) return [];
  const snap = await db
    .collection("feedback")
    .orderBy("createdAt", "desc")
    .limit(limitN)
    .get();
  return snap.docs.map((doc) => {
    const data = doc.data();
    const kind =
      data.kind === "feature"
        ? "feature"
        : data.kind === "support"
          ? "support"
          : "bug";
    const rawMessage = String(data.message || "");
    const message =
      sanitizePlainText(rawMessage, {
        maxLength: 4000,
        allowNewlines: true,
        minLength: 0,
      }) ?? rawMessage.slice(0, 4000);
    return {
      id: doc.id,
      email: String(data.email || "unknown"),
      kind,
      rating: Number(data.rating) || 0,
      message,
      createdAt: String(data.createdAt || ""),
      emailed: Boolean(data.emailed),
    };
  });
}

export type ApiQuotaKind = "market" | "research" | "feedback";

const API_DAILY_LIMITS: Record<PlanId, Record<ApiQuotaKind, number>> = {
  free: { market: 500, research: 40, feedback: 15 },
  pro: { market: 800, research: 80, feedback: 20 },
  ultra: { market: 1200, research: 150, feedback: 30 },
};

const memoryDaily = new Map<
  string,
  { date: string; market: number; research: number; feedback: number }
>();

export async function getPlanForUser(uid: string, email: string): Promise<PlanId> {
  if (isAdminEmail(email)) return "ultra";
  const db = await getAdminDb();
  if (!db) return "free";
  try {
    const snap = await db.collection("entitlements").doc(uid).get();
    const data = snap.data() || {};
    const plan = data.plan;
    if (plan !== "ultra" && plan !== "pro") return "free";

    if (data.source === "beta_code") {
      const { ultraBetaStillActive } = await import("@/lib/beta-codes");
      const expiresAt =
        typeof data.betaExpiresAt === "number"
          ? data.betaExpiresAt
          : data.betaExpiresAt?.toMillis?.() ?? 0;
      if (!ultraBetaStillActive(expiresAt)) {
        await expireBetaCodeEntitlement(uid).catch(() => undefined);
        return "free";
      }
      return "ultra";
    }

    return plan;
  } catch {
    /* treat as free */
  }
  return "free";
}

async function expireBetaCodeEntitlement(uid: string) {
  const db = await getAdminDb();
  if (!db) return;
  const { FieldValue } = await import("firebase-admin/firestore");
  const { watchlistLimitForPlan } = await import("@/lib/plans");
  await db.collection("entitlements").doc(uid).set(
    {
      plan: "free",
      watchlistLimit: watchlistLimitForPlan("free"),
      cooldownDays: 7,
      source: FieldValue.delete(),
      betaExpiresAt: FieldValue.delete(),
      betaCodeId: FieldValue.delete(),
      updatedAt: new Date(),
    },
    { merge: true },
  );
}

export type BetaCodeRow = {
  id: string;
  code: string;
  active: boolean;
  maxRedemptions: number;
  timesRedeemed: number;
  expiresAt: number;
  createdAt: string;
};

export async function listBetaCodes(): Promise<BetaCodeRow[]> {
  const db = await getAdminDb();
  if (!db) return [];
  const snap = await db.collection("beta_codes").orderBy("createdAt", "desc").limit(50).get();
  return snap.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      code: String(data.code || ""),
      active: data.active !== false,
      maxRedemptions: Number(data.maxRedemptions) || 0,
      timesRedeemed: Number(data.timesRedeemed) || 0,
      expiresAt:
        typeof data.expiresAt === "number"
          ? data.expiresAt
          : data.expiresAt?.toMillis?.() ?? 0,
      createdAt:
        typeof data.createdAt === "string"
          ? data.createdAt
          : data.createdAt?.toDate?.()?.toISOString?.() || "",
    };
  });
}

export async function createBetaCode(input: {
  code?: string;
  maxRedemptions?: number;
  createdBy: string;
}) {
  const db = await getAdminDb();
  if (!db) throw new Error("Beta codes are not available.");
  const {
    generateBetaCode,
    hashBetaCode,
    normalizeBetaCode,
    ULTRA_BETA_EXPIRES_AT_MS,
    ultraBetaStillActive,
  } = await import("@/lib/beta-codes");
  if (!ultraBetaStillActive(ULTRA_BETA_EXPIRES_AT_MS)) {
    throw new Error("Ultra beta codes expired on September 24.");
  }

  const code = normalizeBetaCode(input.code || generateBetaCode());
  if (code.length < 4 || code.length > 32) {
    throw new Error("Use a code between 4 and 32 characters.");
  }
  if (!/^[A-Z0-9-]+$/.test(code)) {
    throw new Error("Codes can only use letters, numbers, and hyphens.");
  }

  const id = hashBetaCode(code);
  const ref = db.collection("beta_codes").doc(id);
  const existing = await ref.get();
  if (existing.exists) throw new Error("That code already exists.");

  const maxRedemptions = Math.max(0, Math.floor(Number(input.maxRedemptions) || 0));
  const now = new Date();
  await ref.set({
    code,
    codeHash: id,
    active: true,
    maxRedemptions,
    timesRedeemed: 0,
    expiresAt: ULTRA_BETA_EXPIRES_AT_MS,
    createdAt: now.toISOString(),
    createdBy: input.createdBy,
  });

  return {
    id,
    code,
    active: true,
    maxRedemptions,
    timesRedeemed: 0,
    expiresAt: ULTRA_BETA_EXPIRES_AT_MS,
    createdAt: now.toISOString(),
  } satisfies BetaCodeRow;
}

export async function deactivateBetaCode(id: string) {
  const db = await getAdminDb();
  if (!db) throw new Error("Beta codes are not available.");
  const ref = db.collection("beta_codes").doc(id);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("Code not found.");
  await ref.set({ active: false, updatedAt: new Date().toISOString() }, { merge: true });
}

export async function redeemBetaCode(uid: string, email: string, rawCode: string) {
  const db = await getAdminDb();
  if (!db) throw new Error("Beta codes are not available.");
  if (isAdminEmail(email)) {
    throw new Error("Admin already has Ultra.");
  }

  const {
    hashBetaCode,
    normalizeBetaCode,
    ULTRA_BETA_EXPIRES_AT_MS,
    ultraBetaStillActive,
  } = await import("@/lib/beta-codes");
  if (!ultraBetaStillActive(ULTRA_BETA_EXPIRES_AT_MS)) {
    throw new Error("Ultra beta codes expired on September 24.");
  }

  const code = normalizeBetaCode(rawCode);
  if (!code) throw new Error("Enter a beta test code.");
  const id = hashBetaCode(code);
  const codeRef = db.collection("beta_codes").doc(id);
  const entitlementRef = db.collection("entitlements").doc(uid);
  const { FieldValue } = await import("firebase-admin/firestore");

  await db.runTransaction(async (tx) => {
    const codeSnap = await tx.get(codeRef);
    if (!codeSnap.exists) throw new Error("That code is not valid.");
    const codeData = codeSnap.data() || {};
    if (codeData.active === false) throw new Error("That code is turned off.");
    const expiresAt =
      typeof codeData.expiresAt === "number"
        ? codeData.expiresAt
        : codeData.expiresAt?.toMillis?.() ?? ULTRA_BETA_EXPIRES_AT_MS;
    if (!ultraBetaStillActive(expiresAt)) {
      throw new Error("That code has expired.");
    }
    const max = Number(codeData.maxRedemptions) || 0;
    const used = Number(codeData.timesRedeemed) || 0;
    if (max > 0 && used >= max) {
      throw new Error("That code has no redemptions left.");
    }

    const entitlementSnap = await tx.get(entitlementRef);
    const data = entitlementSnap.data() || {};
    if (data.role === "admin") throw new Error("Admin already has Ultra.");
    if (data.source === "stripe" && (data.plan === "pro" || data.plan === "ultra")) {
      throw new Error("You already have a paid plan. Manage it under View plan.");
    }

    const now = new Date();
    tx.set(
      entitlementRef,
      {
        uid,
        role: "client",
        plan: "ultra",
        watchlistLimit: watchlistLimitForPlan("ultra"),
        cooldownDays: 0,
        createdAt: data.createdAt || now,
        updatedAt: now,
        source: "beta_code",
        betaExpiresAt: ULTRA_BETA_EXPIRES_AT_MS,
        betaCodeId: id,
        giftAckedAt: FieldValue.delete(),
        giftedAt: now,
        stripeSubscriptionId: FieldValue.delete(),
        stripeCancelAtPeriodEnd: FieldValue.delete(),
        stripeAccessUntil: FieldValue.delete(),
        stripePendingPlan: FieldValue.delete(),
        stripePendingUntil: FieldValue.delete(),
      },
      { merge: true },
    );
    tx.set(
      codeRef,
      {
        timesRedeemed: used + 1,
        lastRedeemedAt: now.toISOString(),
        lastRedeemedBy: uid,
      },
      { merge: true },
    );
  });

  void import("@/lib/discord-role-sync")
    .then((mod) => mod.syncDiscordRolesForUid(uid))
    .catch((error) => console.warn("[discord] beta redeem role sync:", error));

  await syncAuthPlanClaims(uid, {
    plan: "ultra",
    role: "client",
    source: "comp",
  });
  invalidateAdminAccountsCache();

  return {
    plan: "ultra" as const,
    betaExpiresAt: ULTRA_BETA_EXPIRES_AT_MS,
  };
}

function takeMemoryQuota(
  uid: string,
  date: string,
  kind: ApiQuotaKind,
  limit: number,
): { ok: true } | { ok: false; limit: number; used: number } {
  const current = memoryDaily.get(uid);
  const used = current?.date === date ? current[kind] : 0;
  if (used >= limit) return { ok: false, limit, used };
  memoryDaily.set(uid, {
    date,
    market: current?.date === date ? current.market : 0,
    research: current?.date === date ? current.research : 0,
    feedback: current?.date === date ? current.feedback : 0,
    [kind]: used + 1,
  });
  return { ok: true };
}

export type ServerPredictKind = "pulse" | "score" | "addition" | "horizon" | "advanced";

function etWeekIdServer(date = new Date()) {
  const ymd = date.toLocaleDateString("en-CA", { timeZone: "America/New_York" });
  const [year, month, day] = ymd.split("-").map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day));
  const weekday = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - weekday);
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((utc.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${utc.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function emptyPredictUsage(weekId = etWeekIdServer()) {
  return { weekId, pulse: 0, score: 0, addition: 0, horizon: 0, advanced: 0 };
}

export async function readServerPredictUsage(uid: string) {
  const db = await getAdminDb();
  const weekId = etWeekIdServer();
  if (!db) return emptyPredictUsage(weekId);
  const snap = await db.collection("predict_usage").doc(uid).get();
  const data = snap.data() || {};
  if (String(data.weekId || "") !== weekId) return emptyPredictUsage(weekId);
  return {
    weekId,
    pulse: Math.max(0, Number(data.pulse) || 0),
    score: Math.max(0, Number(data.score) || 0),
    addition: Math.max(0, Number(data.addition) || 0),
    horizon: Math.max(0, Number(data.horizon) || 0),
    advanced: Math.max(0, Number(data.advanced) || 0),
  };
}

export async function consumeServerPredictUsage(
  uid: string,
  plan: PlanId,
  kind: ServerPredictKind,
) {
  const { weeklyPredictLimit } = await import("@/lib/predict-limits");
  const limit = weeklyPredictLimit(plan, kind);
  const weekId = etWeekIdServer();
  if (limit == null) {
    const usage = await readServerPredictUsage(uid);
    return { ok: true as const, usage };
  }
  if (limit <= 0) {
    return { ok: false as const, usage: await readServerPredictUsage(uid) };
  }

  const db = await getAdminDb();
  if (!db) {
    return { ok: false as const, usage: emptyPredictUsage(weekId) };
  }

  const { FieldValue } = await import("firebase-admin/firestore");
  const ref = db.collection("predict_usage").doc(uid);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const data = snap.data() || {};
    const sameWeek = String(data.weekId || "") === weekId;
    const usage = {
      weekId,
      pulse: sameWeek ? Math.max(0, Number(data.pulse) || 0) : 0,
      score: sameWeek ? Math.max(0, Number(data.score) || 0) : 0,
      addition: sameWeek ? Math.max(0, Number(data.addition) || 0) : 0,
      horizon: sameWeek ? Math.max(0, Number(data.horizon) || 0) : 0,
      advanced: sameWeek ? Math.max(0, Number(data.advanced) || 0) : 0,
    };
    if (usage[kind] >= limit) return { ok: false as const, usage };
    usage[kind] += 1;
    tx.set(
      ref,
      {
        uid,
        ...usage,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    return { ok: true as const, usage };
  });
}

export async function syncAuthPlanClaims(
  uid: string,
  input: { plan: PlanId; role?: "client" | "admin"; source?: string },
) {
  const auth = await getAdminAuth();
  if (!auth) return;
  try {
    const user = await auth.getUser(uid);
    const existing = (user.customClaims || {}) as Record<string, unknown>;
    await auth.setCustomUserClaims(uid, {
      ...existing,
      tvmPlan: input.plan,
      tvmRole: input.role || "client",
      tvmSource: input.source || "none",
    });
  } catch (error) {
    console.warn("[auth claims] sync failed:", error);
  }
}

export async function findUidByDiscordId(discordId: string): Promise<string | null> {
  const db = await getAdminDb();
  if (!db || !discordId.trim()) return null;
  const snap = await db
    .collection("beta_status")
    .where("discordId", "==", discordId.trim())
    .limit(1)
    .get();
  if (snap.empty) return null;
  return snap.docs[0].id;
}

export async function getEntitlementForUid(uid: string) {
  const db = await getAdminDb();
  if (!db) return null;
  const snap = await db.collection("entitlements").doc(uid).get();
  if (!snap.exists) return null;
  const data = snap.data() || {};
  const source =
    data.source === "stripe" || data.source === "paid"
      ? ("stripe" as const)
      : data.source === "comp"
        ? ("comp" as const)
        : data.source === "beta_code"
          ? ("beta_code" as const)
          : ("none" as const);
  const betaExpiresAt =
    typeof data.betaExpiresAt === "number"
      ? data.betaExpiresAt
      : data.betaExpiresAt?.toMillis?.() ?? 0;
  let plan: PlanId =
    data.plan === "ultra" ? "ultra" : data.plan === "pro" ? "pro" : "free";
  if (source === "beta_code" && plan === "ultra") {
    const { ultraBetaStillActive } = await import("@/lib/beta-codes");
    if (!ultraBetaStillActive(betaExpiresAt)) plan = "free";
  }
  return {
    uid,
    role: data.role === "admin" ? ("admin" as const) : ("client" as const),
    plan,
    stripeCustomerId:
      typeof data.stripeCustomerId === "string" ? data.stripeCustomerId : "",
    stripeSubscriptionId:
      typeof data.stripeSubscriptionId === "string"
        ? data.stripeSubscriptionId
        : "",
    stripeCancelAtPeriodEnd: data.stripeCancelAtPeriodEnd === true,
    stripeAccessUntil:
      typeof data.stripeAccessUntil === "number" ? data.stripeAccessUntil : 0,
    stripePendingPlan:
      data.stripePendingPlan === "ultra"
        ? "ultra"
        : data.stripePendingPlan === "pro"
          ? "pro"
          : "",
    stripePendingUntil:
      typeof data.stripePendingUntil === "number" ? data.stripePendingUntil : 0,
    source,
    betaExpiresAt,
  };
}

/** Drop Stripe ids from a prior account so checkout can start fresh on the live account. */
export async function clearStaleStripeBilling(uid: string) {
  const db = await getAdminDb();
  if (!db) return;
  const ref = db.collection("entitlements").doc(uid);
  const snap = await ref.get();
  if (!snap.exists) return;
  const data = snap.data() || {};
  if (data.role === "admin") return;
  const { FieldValue } = await import("firebase-admin/firestore");
  await ref.set(
    {
      plan: "free",
      watchlistLimit: watchlistLimitForPlan("free"),
      cooldownDays: 7,
      source: FieldValue.delete(),
      stripeCustomerId: FieldValue.delete(),
      stripeSubscriptionId: FieldValue.delete(),
      stripeCancelAtPeriodEnd: FieldValue.delete(),
      stripeAccessUntil: FieldValue.delete(),
      stripePendingPlan: FieldValue.delete(),
      stripePendingUntil: FieldValue.delete(),
      updatedAt: new Date(),
    },
    { merge: true },
  );
}

export async function applyStripeEntitlement(input: {
  uid: string;
  plan: PlanId;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  cancelAtPeriodEnd?: boolean;
  accessUntil?: number;
  pendingPlan?: PaidPlanId;
  pendingUntil?: number;
}) {
  const db = await getAdminDb();
  const auth = await getAdminAuth();
  if (!db) throw new Error("Admin access is not configured.");

  if (auth) {
    try {
      const record = await auth.getUser(input.uid);
      if (isAdminEmail(record.email)) return;
    } catch {
      /* continue with the entitlement doc */
    }
  }

  const ref = db.collection("entitlements").doc(input.uid);
  const current = await ref.get();
  const data = current.data() || {};
  if (data.role === "admin") return;

  const { FieldValue } = await import("firebase-admin/firestore");
  const now = new Date();
  const paid = input.plan === "pro" || input.plan === "ultra";
  const keepComp =
    !paid &&
    data.source === "comp" &&
    (data.plan === "pro" || data.plan === "ultra");
  const { ultraBetaStillActive } = await import("@/lib/beta-codes");
  const betaExpiresAt =
    typeof data.betaExpiresAt === "number"
      ? data.betaExpiresAt
      : data.betaExpiresAt?.toMillis?.() ?? 0;
  const keepBeta =
    !paid &&
    data.source === "beta_code" &&
    data.plan === "ultra" &&
    ultraBetaStillActive(betaExpiresAt);
  if (keepComp || keepBeta) {
    await ref.set(
      {
        updatedAt: now,
        stripeCustomerId: input.stripeCustomerId || data.stripeCustomerId || "",
        stripeSubscriptionId: FieldValue.delete(),
        stripeCancelAtPeriodEnd: FieldValue.delete(),
        stripeAccessUntil: FieldValue.delete(),
        stripePendingPlan: FieldValue.delete(),
        stripePendingUntil: FieldValue.delete(),
      },
      { merge: true },
    );
    return;
  }

  await ref.set(
    {
      uid: input.uid,
      role: "client",
      plan: paid ? input.plan : "free",
      watchlistLimit: watchlistLimitForPlan(paid ? input.plan : "free"),
      cooldownDays: paid ? 0 : 7,
      createdAt: data.createdAt || now,
      updatedAt: now,
      source: paid ? "stripe" : FieldValue.delete(),
      betaExpiresAt: FieldValue.delete(),
      betaCodeId: FieldValue.delete(),
      stripeCustomerId: input.stripeCustomerId || data.stripeCustomerId || "",
      stripeSubscriptionId: paid
        ? input.stripeSubscriptionId || data.stripeSubscriptionId || ""
        : FieldValue.delete(),
      stripeCancelAtPeriodEnd:
        paid && input.cancelAtPeriodEnd ? true : FieldValue.delete(),
      stripeAccessUntil:
        paid && input.accessUntil ? input.accessUntil : FieldValue.delete(),
      stripePendingPlan:
        paid && input.pendingPlan ? input.pendingPlan : FieldValue.delete(),
      stripePendingUntil:
        paid && input.pendingUntil ? input.pendingUntil : FieldValue.delete(),
    },
    { merge: true },
  );

  void import("@/lib/discord-role-sync")
    .then((mod) => mod.syncDiscordRolesForUid(input.uid))
    .catch((error) => console.warn("[discord] stripe plan role sync:", error));

  await syncAuthPlanClaims(input.uid, {
    plan: paid ? input.plan : "free",
    role: "client",
    source: paid ? "stripe" : "none",
  });
  invalidateAdminAccountsCache();
}

export async function consumeApiQuota(
  uid: string,
  email: string,
  kind: ApiQuotaKind,
): Promise<{ ok: true } | { ok: false; limit: number; used: number }> {
  const date = etDateString();
  const plan = await getPlanForUser(uid, email);
  const limit = API_DAILY_LIMITS[plan][kind];
  const db = await getAdminDb();
  if (!db) return takeMemoryQuota(uid, date, kind, limit);

  try {
    const { FieldValue } = await import("firebase-admin/firestore");
    return await db.runTransaction(async (tx) => {
      const ref = db.collection("api_usage").doc(uid);
      const snap = await tx.get(ref);
      const data = snap.data();
      const sameDay = data?.date === date;
      const used = sameDay ? Number(data?.[kind] || 0) : 0;
      if (used >= limit) {
        return { ok: false as const, limit, used };
      }
      tx.set(ref, {
        uid,
        date,
        market:
          sameDay
            ? Number(data?.market || 0) + (kind === "market" ? 1 : 0)
            : kind === "market"
              ? 1
              : 0,
        research:
          sameDay
            ? Number(data?.research || 0) + (kind === "research" ? 1 : 0)
            : kind === "research"
              ? 1
              : 0,
        feedback:
          sameDay
            ? Number(data?.feedback || 0) + (kind === "feedback" ? 1 : 0)
            : kind === "feedback"
              ? 1
              : 0,
        updatedAt: FieldValue.serverTimestamp(),
      });
      return { ok: true as const };
    });
  } catch (error) {
    console.error("API quota write failed:", error);
    return takeMemoryQuota(uid, date, kind, limit);
  }
}

export async function getBetaStatus(uid: string) {
  const { parseBetaStatus, EMPTY_BETA_STATUS } = await import("@/lib/beta-waitlist");
  const db = await getAdminDb();
  if (!db) return EMPTY_BETA_STATUS;
  const snap = await db.collection("beta_status").doc(uid).get();
  return parseBetaStatus(snap.data());
}

export async function joinBetaWaitlist(uid: string, email: string) {
  const db = await getAdminDb();
  if (!db) throw new Error("Waitlist is not available.");
  const { FieldValue } = await import("firebase-admin/firestore");
  const ref = db.collection("beta_status").doc(uid);
  const current = await getBetaStatus(uid);
  if (current.betaTester || current.waitlistStatus === "admitted") {
    return current;
  }
  await ref.set(
    {
      uid,
      email,
      waitlistStatus: "pending",
      betaTester: false,
      waitlistAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
  return { ...current, waitlistStatus: "pending" as const };
}

export async function connectDiscordStatus(uid: string, email: string) {
  const db = await getAdminDb();
  if (!db) throw new Error("Discord status is not available.");
  const { FieldValue } = await import("firebase-admin/firestore");
  await db.collection("beta_status").doc(uid).set(
    {
      uid,
      email,
      discordConnected: true,
      discordConnectedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
  return getBetaStatus(uid);
}

type DiscordLinkInput = {
  discordId: string;
  discordUsername: string;
  discordGlobalName: string | null;
  discordAvatar: string | null;
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: number;
};

async function assertDiscordAvailable(db: FirebaseFirestore.Firestore, discordId: string, uid: string) {
  const existing = await db
    .collection("beta_status")
    .where("discordId", "==", discordId)
    .limit(1)
    .get();
  if (!existing.empty && existing.docs[0].id !== uid) {
    throw new Error("This Discord account is already linked to another TVM account.");
  }
}

export async function linkDiscordAccount(
  uid: string,
  email: string,
  discord: DiscordLinkInput,
  options?: {
    joinWaitlist?: boolean;
    tokens?: { accessToken: string; refreshToken?: string; expiresIn?: number; expiresAt?: number };
  },
) {
  const db = await getAdminDb();
  if (!db) throw new Error("Discord linking is not available.");
  await assertDiscordAvailable(db, discord.discordId, uid);
  const { FieldValue } = await import("firebase-admin/firestore");
  await db.collection("beta_status").doc(uid).set(
    {
      uid,
      email,
      discordConnected: true,
      discordId: discord.discordId,
      discordUsername: discord.discordUsername,
      discordGlobalName: discord.discordGlobalName,
      discordAvatar: discord.discordAvatar,
      discordConnectedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
  if (options?.joinWaitlist) {
    await joinBetaWaitlist(uid, email);
  }

  const tokens = options?.tokens ||
    (discord.accessToken
      ? {
          accessToken: discord.accessToken,
          refreshToken: discord.refreshToken,
          expiresIn: discord.expiresIn,
        }
      : null);
  if (tokens?.accessToken) {
    const { storeDiscordOAuthTokens, syncDiscordRolesForUid } = await import(
      "@/lib/discord-role-sync"
    );
    await storeDiscordOAuthTokens(uid, tokens);
    void syncDiscordRolesForUid(uid).catch((error) => {
      console.warn("[discord] post-link role sync:", error);
    });
  }

  return getBetaStatus(uid);
}

export async function unlinkDiscordAccount(uid: string, email: string) {
  const db = await getAdminDb();
  if (!db) throw new Error("Discord linking is not available.");
  const { FieldValue } = await import("firebase-admin/firestore");
  await db.collection("beta_status").doc(uid).set(
    {
      uid,
      email,
      discordConnected: false,
      discordId: FieldValue.delete(),
      discordUsername: FieldValue.delete(),
      discordGlobalName: FieldValue.delete(),
      discordAvatar: FieldValue.delete(),
      discordConnectedAt: FieldValue.delete(),
      discordAccessTokenEnc: FieldValue.delete(),
      discordRefreshTokenEnc: FieldValue.delete(),
      discordTokenExpiresAt: FieldValue.delete(),
      discordPlanSynced: FieldValue.delete(),
      discordRolesSyncedAt: FieldValue.delete(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
  return getBetaStatus(uid);
}

export async function admitBetaTester(uid: string) {
  const db = await getAdminDb();
  if (!db) throw new Error("Waitlist is not available.");
  const { FieldValue } = await import("firebase-admin/firestore");
  const auth = await getAdminAuth();
  const record = auth ? await auth.getUser(uid).catch(() => null) : null;
  await db.collection("beta_status").doc(uid).set(
    {
      uid,
      email: record?.email || "",
      waitlistStatus: "admitted",
      betaTester: true,
      admittedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
  invalidateAdminAccountsCache();
  return getBetaStatus(uid);
}

function siteMaintenanceFields(data: Record<string, unknown> | undefined) {
  return {
    enabled: data?.enabled === true,
    warning: data?.warning === true || data?.warningEnabled === true,
    start: typeof data?.start === "string" ? data.start : "",
    end: typeof data?.end === "string" ? data.end : "",
    message: typeof data?.message === "string" ? data.message : "",
  };
}

export async function getSiteMaintenance() {
  const db = await getAdminDb();
  if (!db) throw new Error("Maintenance could not be loaded.");
  const snap = await db.collection("site").doc("maintenance").get();
  return siteMaintenanceFields(snap.data());
}

export async function updateSiteMaintenance(input: {
  enabled: boolean;
  warning: boolean;
  start: string;
  end: string;
  message: string;
}) {
  const db = await getAdminDb();
  if (!db) throw new Error("Maintenance could not be updated.");
  const { FieldValue } = await import("firebase-admin/firestore");
  const start = sanitizePlainText(input.start, { maxLength: 80 }) || "";
  const end = sanitizePlainText(input.end, { maxLength: 80 }) || "";
  const message =
    sanitizePlainText(input.message, {
      maxLength: 500,
      allowNewlines: false,
    }) || "";
  await db.collection("site").doc("maintenance").set(
    {
      enabled: input.enabled,
      warning: input.warning,
      start,
      end,
      message,
      startAt: FieldValue.delete(),
      endAt: FieldValue.delete(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
  return siteMaintenanceFields({
    enabled: input.enabled,
    warning: input.warning,
    start,
    end,
    message,
  });
}

export async function disableSiteMaintenance() {
  const db = await getAdminDb();
  if (!db) throw new Error("Maintenance could not be updated.");
  const { FieldValue } = await import("firebase-admin/firestore");
  await db.collection("site").doc("maintenance").set(
    {
      enabled: false,
      warning: false,
      start: "",
      end: "",
      startAt: FieldValue.delete(),
      endAt: FieldValue.delete(),
      message: "",
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
}
