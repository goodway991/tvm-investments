import "server-only";
import { getAdminDb } from "@/lib/firebase/admin";

export const HORIZON_STARTING_CASH = 10_000;
const MAX_CASH = 10_000_000;
const MAX_SHARES = 1_000_000_000;
const MAX_POSITIONS = 40;

export async function ensureHorizonSim(uid: string) {
  const db = await getAdminDb();
  if (!db) throw new Error("Horizon is unavailable.");
  const ref = db.collection("horizon_sims").doc(uid);
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
    cash: HORIZON_STARTING_CASH,
    totalValue: HORIZON_STARTING_CASH,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  return { cash: HORIZON_STARTING_CASH, totalValue: HORIZON_STARTING_CASH };
}

export async function horizonBuy(
  uid: string,
  input: { symbol: string; shares: number; price: number },
) {
  const symbol = input.symbol.trim().toUpperCase();
  const shares = Number(input.shares);
  const price = Number(input.price);
  if (!/^[A-Z][A-Z0-9.-]{0,11}$/.test(symbol)) throw new Error("Invalid symbol.");
  if (!Number.isFinite(shares) || shares <= 0 || shares > MAX_SHARES) {
    throw new Error("Invalid share count.");
  }
  if (!Number.isFinite(price) || price <= 0 || price > MAX_CASH) {
    throw new Error("Invalid price.");
  }
  const cost = shares * price;
  const db = await getAdminDb();
  if (!db) throw new Error("Horizon is unavailable.");
  const { FieldValue } = await import("firebase-admin/firestore");

  const simRef = db.collection("horizon_sims").doc(uid);
  const posRef = simRef.collection("positions").doc(symbol);

  const existingPos = await posRef.get();
  const heldAlready =
    existingPos.exists && (Number(existingPos.data()?.shares) || 0) > 0;
  if (!heldAlready) {
    const all = await simRef.collection("positions").get();
    const openNames = all.docs.filter(
      (row) => (Number(row.data()?.shares) || 0) > 0,
    ).length;
    if (openNames >= MAX_POSITIONS) {
      throw new Error("Horizon Suite can hold 40 paper names at a time.");
    }
  }

  return db.runTransaction(async (tx) => {
    const simSnap = await tx.get(simRef);
    if (!simSnap.exists) {
      tx.set(simRef, {
        uid,
        cash: HORIZON_STARTING_CASH,
        totalValue: HORIZON_STARTING_CASH,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
    const cash = simSnap.exists
      ? Math.max(0, Number(simSnap.data()?.cash) || 0)
      : HORIZON_STARTING_CASH;
    if (cost > cash) throw new Error("Not enough paper cash for that buy.");

    const posSnap = await tx.get(posRef);
    const prevShares = posSnap.exists ? Number(posSnap.data()?.shares) || 0 : 0;
    const prevCost = posSnap.exists ? Number(posSnap.data()?.averageCost) || 0 : 0;
    const nextShares = prevShares + shares;
    const averageCost =
      nextShares > 0
        ? (prevShares * prevCost + cost) / nextShares
        : price;
    const nextCash = cash - cost;
    tx.set(
      simRef,
      {
        uid,
        cash: nextCash,
        totalValue: nextCash,
        updatedAt: FieldValue.serverTimestamp(),
        ...(simSnap.exists ? {} : { createdAt: FieldValue.serverTimestamp() }),
      },
      { merge: true },
    );
    tx.set(posRef, {
      uid,
      symbol,
      shares: nextShares,
      averageCost,
      currentPrice: price,
      updatedAt: FieldValue.serverTimestamp(),
    });
    return { cash: nextCash, symbol, shares: nextShares, averageCost, currentPrice: price };
  });
}

export async function horizonSell(
  uid: string,
  input: { symbol: string; shares: number; price: number },
) {
  const symbol = input.symbol.trim().toUpperCase();
  const shares = Number(input.shares);
  const price = Number(input.price);
  if (!/^[A-Z][A-Z0-9.-]{0,11}$/.test(symbol)) throw new Error("Invalid symbol.");
  if (!Number.isFinite(shares) || shares <= 0) throw new Error("Invalid share count.");
  if (!Number.isFinite(price) || price <= 0) throw new Error("Invalid price.");

  const db = await getAdminDb();
  if (!db) throw new Error("Horizon is unavailable.");
  const { FieldValue } = await import("firebase-admin/firestore");
  const simRef = db.collection("horizon_sims").doc(uid);
  const posRef = simRef.collection("positions").doc(symbol);

  return db.runTransaction(async (tx) => {
    const simSnap = await tx.get(simRef);
    if (!simSnap.exists) throw new Error("No Horizon book to sell from.");
    const posSnap = await tx.get(posRef);
    if (!posSnap.exists) throw new Error("You do not hold that name.");
    const held = Number(posSnap.data()?.shares) || 0;
    if (shares > held) throw new Error("Not enough shares to sell.");
    const cash = Math.max(0, Number(simSnap.data()?.cash) || 0);
    const proceeds = shares * price;
    const nextShares = held - shares;
    const nextCash = Math.min(MAX_CASH, cash + proceeds);
    tx.set(
      simRef,
      { cash: nextCash, totalValue: nextCash, updatedAt: FieldValue.serverTimestamp() },
      { merge: true },
    );
    if (nextShares <= 0) {
      tx.delete(posRef);
    } else {
      tx.set(
        posRef,
        {
          shares: nextShares,
          currentPrice: price,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    }
    return { cash: nextCash, symbol, shares: Math.max(0, nextShares) };
  });
}

export async function horizonReset(uid: string) {
  const db = await getAdminDb();
  if (!db) throw new Error("Horizon is unavailable.");
  const { FieldValue } = await import("firebase-admin/firestore");
  const simRef = db.collection("horizon_sims").doc(uid);
  const positions = await simRef.collection("positions").get();
  const batch = db.batch();
  for (const doc of positions.docs) batch.delete(doc.ref);
  batch.set(
    simRef,
    {
      uid,
      cash: HORIZON_STARTING_CASH,
      totalValue: HORIZON_STARTING_CASH,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
  await batch.commit();
  return { cash: HORIZON_STARTING_CASH, totalValue: HORIZON_STARTING_CASH };
}
