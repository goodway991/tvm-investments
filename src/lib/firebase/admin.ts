import type { DailySnapshot, BacktestEntry, BacktestSummary } from "@/types";

let adminDb: FirebaseFirestore.Firestore | null = null;
const databaseId =
  process.env.NEXT_PUBLIC_FIREBASE_DATABASE_ID || "tvm-investments";

async function getAdminDb(): Promise<FirebaseFirestore.Firestore | null> {
  if (adminDb) return adminDb;

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");

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

  await db.collection("daily_snapshots").doc(snapshot.id).set(snapshot);

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
