import "server-only";
import { getAdminDb } from "@/lib/firebase/admin";

const MAX_CASH = 1_000_000_000_000;
const MAX_SHARES = 1_000_000_000;

export async function ensurePortfolio(uid: string) {
  const db = await getAdminDb();
  if (!db) throw new Error("Portfolio is unavailable.");
  const ref = db.collection("portfolios").doc(uid);
  const snap = await ref.get();
  if (snap.exists) {
    const data = snap.data() || {};
    return {
      cash: Math.max(0, Number(data.cash) || 0),
      totalValue: Math.max(0, Number(data.totalValue) || 0),
    };
  }
  const { FieldValue } = await import("firebase-admin/firestore");
  await ref.set({
    uid,
    cash: 0,
    totalValue: 0,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  return { cash: 0, totalValue: 0 };
}

export async function upsertPortfolioCash(
  uid: string,
  cash: number,
  totalValue: number,
) {
  if (!Number.isFinite(cash) || cash < 0 || cash > MAX_CASH) {
    throw new Error("Cash amount is out of range.");
  }
  if (!Number.isFinite(totalValue) || totalValue < 0 || totalValue > MAX_CASH * 2) {
    throw new Error("Total value is out of range.");
  }
  const db = await getAdminDb();
  if (!db) throw new Error("Portfolio is unavailable.");
  const { FieldValue } = await import("firebase-admin/firestore");
  const ref = db.collection("portfolios").doc(uid);
  const snap = await ref.get();
  await ref.set(
    {
      uid,
      cash,
      totalValue,
      createdAt: snap.exists ? snap.data()?.createdAt || FieldValue.serverTimestamp() : FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
  return { cash, totalValue };
}

export async function upsertPortfolioPosition(
  uid: string,
  input: {
    symbol: string;
    shares: number;
    averageCost: number;
    currentPrice: number;
    purchasedAt?: string | null;
  },
) {
  const symbol = input.symbol.trim().toUpperCase();
  if (!/^[A-Z][A-Z0-9.-]{0,11}$/.test(symbol)) {
    throw new Error("Invalid symbol.");
  }
  const shares = Math.max(0, Number(input.shares) || 0);
  const averageCost = Math.max(0, Number(input.averageCost) || 0);
  const currentPrice = Math.max(0, Number(input.currentPrice) || averageCost);
  if (shares > MAX_SHARES || averageCost > MAX_CASH || currentPrice > MAX_CASH) {
    throw new Error("Position values are out of range.");
  }
  const db = await getAdminDb();
  if (!db) throw new Error("Portfolio is unavailable.");
  await ensurePortfolio(uid);
  const { FieldValue } = await import("firebase-admin/firestore");
  const next = {
    uid,
    symbol,
    shares,
    averageCost,
    currentPrice,
    purchasedAt: input.purchasedAt || null,
    updatedAt: FieldValue.serverTimestamp(),
  };
  await db.collection("portfolios").doc(uid).collection("positions").doc(symbol).set(next);
  return {
    symbol,
    shares,
    averageCost,
    currentPrice,
    purchasedAt: input.purchasedAt || null,
  };
}

export async function removePortfolioPosition(uid: string, symbolRaw: string) {
  const symbol = symbolRaw.trim().toUpperCase();
  if (!symbol) throw new Error("Invalid symbol.");
  const db = await getAdminDb();
  if (!db) throw new Error("Portfolio is unavailable.");
  await db.collection("portfolios").doc(uid).collection("positions").doc(symbol).delete();
}
