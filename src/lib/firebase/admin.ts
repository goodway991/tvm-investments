import type { DailySnapshot, BacktestEntry, BacktestSummary } from "@/types";
import { ARCHIVE_KEEP_DAYS } from "@/lib/plans";

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
    return adminDb;
  } catch (e) {
    console.warn("Firebase Admin init failed:", e);
    return null;
  }
}

export async function saveDailySnapshot(snapshot: DailySnapshot): Promise<boolean> {
  const db = await getAdminDb();
  if (!db) return false;

  try {
    await db.collection("daily_snapshots").doc(snapshot.id).set(snapshot);
    await pruneOldSnapshots(db);

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

    return true;
  } catch (error) {
    console.warn("Firebase snapshot save failed:", error);
    return false;
  }
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
  return snap.docs[0].data() as DailySnapshot;
}

export async function getSnapshotByDate(date: string): Promise<DailySnapshot | null> {
  const db = await getAdminDb();
  if (!db) return null;
  const doc = await db.collection("daily_snapshots").doc(date).get();
  if (!doc.exists) return null;
  return doc.data() as DailySnapshot;
}

export async function listSnapshotDates(limit = ARCHIVE_KEEP_DAYS): Promise<string[]> {
  const db = await getAdminDb();
  if (!db) return [];
  const snap = await db
    .collection("daily_snapshots")
    .orderBy("date", "desc")
    .limit(limit)
    .get();
  return snap.docs
    .map((doc) => String(doc.data().date || doc.id))
    .filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date));
}

async function pruneOldSnapshots(db: FirebaseFirestore.Firestore) {
  const snap = await db
    .collection("daily_snapshots")
    .orderBy("date", "desc")
    .limit(ARCHIVE_KEEP_DAYS + 40)
    .get();
  const extra = snap.docs.slice(ARCHIVE_KEEP_DAYS);
  if (extra.length === 0) return;
  const batch = db.batch();
  for (const doc of extra) {
    batch.delete(doc.ref);
  }
  await batch.commit();
}

export async function getBacktestSummary(): Promise<BacktestSummary | null> {
  const db = await getAdminDb();
  if (!db) return null;

  const snap = await db.collection("backtest_entries").orderBy("date", "desc").limit(90).get();
  const entries = snap.docs.map((d) => d.data() as BacktestEntry);

  if (entries.length === 0) return null;

  const avg = (arr: number[]) =>
    arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

  const r1d = entries.map((e) => e.return1d).filter((v): v is number => v != null);
  const r1w = entries.map((e) => e.return1w).filter((v): v is number => v != null);
  const r1m = entries.map((e) => e.return1m).filter((v): v is number => v != null);

  return {
    totalDays: new Set(entries.map((e) => e.date)).size,
    avgReturn1d: avg(r1d),
    avgReturn1w: avg(r1w),
    avgReturn1m: avg(r1m),
    spAvgReturn1d: avg(entries.map((e) => e.spReturn1d).filter((v): v is number => v != null)),
    spAvgReturn1w: avg(entries.map((e) => e.spReturn1w).filter((v): v is number => v != null)),
    spAvgReturn1m: avg(entries.map((e) => e.spReturn1m).filter((v): v is number => v != null)),
    entries,
  };
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
  plan: "free" | "pro";
  source: "comp" | "paid" | "none";
  disabled: boolean;
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
    { role: "client" | "admin"; plan: "free" | "pro"; source: "comp" | "paid" | "none" }
  >();
  let plansLoaded = false;
  const db = await getAdminDb();
  if (db) {
    try {
      const snap = await db.collection("entitlements").get();
      for (const item of snap.docs) {
        const data = item.data();
        const source =
          data.source === "stripe" || data.source === "paid"
            ? "paid"
            : data.source === "comp"
              ? "comp"
              : "none";
        entitlements.set(item.id, {
          role: data.role === "admin" ? "admin" : "client",
          plan: data.plan === "pro" ? "pro" : "free",
          source,
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
      const admin = isAdminEmail(record.email) || next?.role === "admin";
      return {
        uid: record.uid,
        email: record.email,
        displayName: record.displayName,
        role: admin ? "admin" : "client",
        plan: admin ? "pro" : next?.plan ?? "free",
        source: admin ? "none" : next?.source ?? "none",
        disabled: record.disabled,
      } satisfies AdminAccountRow;
    })
    .sort((a, b) => a.email.localeCompare(b.email));

  return { rows, plansLoaded };
}

export async function setComplimentaryPro(uid: string, grant: boolean) {
  const auth = await getAdminAuth();
  const db = await getAdminDb();
  if (!auth || !db) throw new Error("Admin access is not configured.");

  const record = await auth.getUser(uid);
  if (isAdminEmail(record.email)) {
    throw new Error("The admin account stays on Pro.");
  }

  const ref = db.collection("entitlements").doc(uid);
  const current = await ref.get();
  const data = current.data() || {};
  if (data.source === "stripe" || data.source === "paid") {
    throw new Error("Paid Pro stays as billed. Leave that account alone.");
  }
  if (data.role === "admin") {
    throw new Error("The admin account stays on Pro.");
  }

  const { FieldValue } = await import("firebase-admin/firestore");
  const now = new Date();
  if (grant) {
    await ref.set(
      {
        uid,
        role: "client",
        plan: "pro",
        watchlistLimit: 100,
        cooldownDays: 0,
        createdAt: data.createdAt || now,
        updatedAt: now,
        source: "comp",
        giftedAt: now,
        giftAckedAt: FieldValue.delete(),
      },
      { merge: true },
    );
    return;
  }

  if (!current.exists) return;

  await ref.set(
    {
      uid,
      role: "client",
      plan: "free",
      watchlistLimit: 10,
      cooldownDays: 7,
      createdAt: data.createdAt || now,
      updatedAt: now,
      source: FieldValue.delete(),
      giftedAt: FieldValue.delete(),
      giftAckedAt: FieldValue.delete(),
    },
    { merge: true },
  );

  const watchRef = db.collection("watchlists").doc(uid);
  const watchSnap = await watchRef.get();
  if (watchSnap.exists) {
    await watchRef.set(
      {
        uid,
        symbols: [],
        changedAt: now,
        nextChangeAt: now,
        updatedAt: now,
      },
      { merge: true },
    );
  }
}

export async function saveFeedback(entry: {
  uid: string;
  email: string;
  kind: "bug" | "feature";
  rating: number;
  message: string;
}): Promise<boolean> {
  const db = await getAdminDb();
  if (!db) return false;
  await db.collection("feedback").add({
    ...entry,
    createdAt: new Date().toISOString(),
  });
  return true;
}
