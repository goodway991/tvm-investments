import type { DailySnapshot, BacktestEntry, BacktestSummary, ScreenedStock } from "@/types";
import { etDateString } from "@/lib/archive-window";
import { ARCHIVE_KEEP_DAYS, watchlistLimitForPlan, type PaidPlanId, type PlanId } from "@/lib/plans";
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

async function getAdminDb(): Promise<FirebaseFirestore.Firestore | null> {
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
  process.env.NEXT_PUBLIC_TVM_ADMIN_EMAIL || "admin@tvm-investments.test";

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

export async function listAdminAccounts(): Promise<{
  rows: AdminAccountRow[];
  plansLoaded: boolean;
}> {
  const auth = await getAdminAuth();
  if (!auth) throw new Error("Admin access is not configured.");

  const authUsers: Array<{
    uid: string;
    email: string;
    displayName: string;
    disabled: boolean;
  }> = [];
  let pageToken: string | undefined;
  do {
    const page = await auth.listUsers(1000, pageToken);
    for (const record of page.users) {
      authUsers.push({
        uid: record.uid,
        email: record.email || "",
        displayName: record.displayName || "",
        disabled: Boolean(record.disabled),
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
  const db = await getAdminDb();
  if (db) {
    try {
      const [entitlementSnap, betaSnap] = await Promise.all([
        db.collection("entitlements").get(),
        db.collection("beta_status").get(),
      ]);
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
      plansLoaded = true;
    } catch (error) {
      if (!isQuotaError(error)) throw error;
    }
  }

  const rows = authUsers
    .map((record) => {
      const next = entitlements.get(record.uid);
      const status = beta.get(record.uid);
      const admin = isAdminEmail(record.email) || next?.role === "admin";
      return {
        uid: record.uid,
        email: record.email,
        displayName: record.displayName,
        role: admin ? "admin" : "client",
        plan: admin ? "pro" : next?.plan ?? "free",
        source: admin ? "none" : next?.source ?? "none",
        disabled: record.disabled,
        betaTester: admin ? true : Boolean(status?.betaTester),
        waitlistStatus: admin ? "admitted" : status?.waitlistStatus ?? "none",
        discordConnected: Boolean(status?.discordConnected),
      } satisfies AdminAccountRow;
    })
    .sort((a, b) => a.email.localeCompare(b.email));

  return { rows, plansLoaded };
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
      stripeSubscriptionId: FieldValue.delete(),
      stripeCancelAtPeriodEnd: FieldValue.delete(),
      stripeAccessUntil: FieldValue.delete(),
      stripePendingPlan: FieldValue.delete(),
      stripePendingUntil: FieldValue.delete(),
    },
    { merge: true },
  );

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
    return {
      id: doc.id,
      email: String(data.email || "unknown"),
      kind,
      rating: Number(data.rating) || 0,
      message: String(data.message || ""),
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
    const plan = snap.data()?.plan;
    if (plan === "ultra" || plan === "pro") return plan;
  } catch {
    /* treat as free */
  }
  return "free";
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

export async function getEntitlementForUid(uid: string) {
  const db = await getAdminDb();
  if (!db) return null;
  const snap = await db.collection("entitlements").doc(uid).get();
  if (!snap.exists) return null;
  const data = snap.data() || {};
  const plan: PlanId =
    data.plan === "ultra" ? "ultra" : data.plan === "pro" ? "pro" : "free";
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
    source:
      data.source === "stripe" || data.source === "paid"
        ? ("stripe" as const)
        : data.source === "comp"
          ? ("comp" as const)
          : ("none" as const),
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
  if (keepComp) {
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
  const start = input.start.trim();
  const end = input.end.trim();
  const message = input.message.trim();
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
