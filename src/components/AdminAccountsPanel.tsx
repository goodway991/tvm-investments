"use client";

import { useCallback, useEffect, useState } from "react";
import {
  collection,
  deleteField,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { useAuth } from "@/components/AuthProvider";
import { getClientFirestore } from "@/lib/firebase/client";

type PlanSource = "comp" | "paid" | "none";

type AccountRow = {
  uid: string;
  email: string;
  displayName: string;
  role: "client" | "admin";
  plan: "free" | "pro";
  source: PlanSource;
};

function paidLook(row: AccountRow) {
  return row.role === "admin" || row.source === "paid";
}

export function AdminAccountsPanel() {
  const { entitlement } = useAuth();
  const [rows, setRows] = useState<AccountRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyUid, setBusyUid] = useState("");

  const load = useCallback(async () => {
    const db = getClientFirestore();
    if (!db) {
      setError("Firebase is not configured.");
      setLoading(false);
      return;
    }
    setError("");
    const [usersSnap, entitlementsSnap] = await Promise.all([
      getDocs(collection(db, "users")),
      getDocs(collection(db, "entitlements")),
    ]);
    const entitlements = new Map(
      entitlementsSnap.docs.map((item) => {
        const data = item.data();
        const source: PlanSource =
          data.source === "stripe" || data.source === "paid"
            ? "paid"
            : data.source === "comp"
              ? "comp"
              : "none";
        return [
          item.id,
          {
            role: data.role === "admin" ? "admin" : "client",
            plan: data.plan === "pro" ? "pro" : "free",
            source,
          } as const,
        ];
      }),
    );
    setRows(
      usersSnap.docs
        .map((item) => {
          const data = item.data();
          const next = entitlements.get(item.id);
          return {
            uid: item.id,
            email: String(data.email || ""),
            displayName: String(data.displayName || "TVM user"),
            role: next?.role ?? "client",
            plan: next?.plan ?? "free",
            source: next?.source ?? "none",
          } satisfies AccountRow;
        })
        .sort((a, b) => a.email.localeCompare(b.email)),
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    if (entitlement.role !== "admin") return;
    void load().catch(() => {
      setError("Unable to load accounts.");
      setLoading(false);
    });
  }, [entitlement.role, load]);

  if (entitlement.role !== "admin") return null;

  async function setComplimentaryPro(row: AccountRow, grant: boolean) {
    const db = getClientFirestore();
    if (!db || row.role === "admin" || paidLook(row)) return;
    setBusyUid(row.uid);
    setError("");
    try {
      const ref = doc(db, "entitlements", row.uid);
      const current = await getDoc(ref);
      if (!current.exists()) throw new Error("No entitlement record for this account.");
      await updateDoc(ref, {
        uid: row.uid,
        role: "client",
        plan: grant ? "pro" : "free",
        watchlistLimit: grant ? 100 : 10,
        cooldownDays: grant ? 0 : 7,
        createdAt: current.data().createdAt,
        updatedAt: serverTimestamp(),
        source: grant ? "comp" : deleteField(),
        giftedAt: grant ? serverTimestamp() : deleteField(),
        giftAckedAt: deleteField(),
      });
      if (!grant) {
        const watchRef = doc(db, "watchlists", row.uid);
        const watchSnap = await getDoc(watchRef);
        if (watchSnap.exists()) {
          await updateDoc(watchRef, {
            uid: row.uid,
            symbols: [],
            changedAt: serverTimestamp(),
            nextChangeAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
      }
      await load();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to update that plan.",
      );
    } finally {
      setBusyUid("");
    }
  }

  return (
    <div className="glass-strong mt-4 rounded-[24px] p-6">
      <p className="text-xs font-semibold uppercase tracking-widest text-violet">
        Admin
      </p>
      <h2 className="mt-2 font-display text-2xl font-bold text-ink">
        Complimentary Pro
      </h2>
      <p className="mt-1 text-sm text-ink-soft">
        Give friends Pro without charging them. Paid Pro boxes glow blue — leave
        those alone.
      </p>

      {loading ? (
        <p className="mt-4 text-sm text-ink-soft">Loading accounts…</p>
      ) : (
        <div className="mt-4 grid gap-3">
          {rows.map((row) => {
            const paid = paidLook(row);
            return (
              <div
                key={row.uid}
                className={`rounded-2xl bg-[#f7f8fc] p-4 ${paid ? "paid-pro-glow" : ""}`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-ink">{row.displayName}</p>
                    <p className="text-sm text-ink-soft">{row.email}</p>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-ink-soft">
                      {row.role}
                      {" · "}
                      {paid
                        ? "Paid Pro"
                        : row.plan === "pro"
                          ? "Complimentary Pro"
                          : "Free"}
                    </p>
                  </div>
                  <div>
                    {row.role === "admin" ? (
                      <span className="text-xs font-semibold text-ink-soft">Admin</span>
                    ) : paid ? (
                      <span className="text-xs font-semibold text-violet">Paid</span>
                    ) : row.plan === "pro" ? (
                      <button
                        type="button"
                        disabled={busyUid === row.uid}
                        onClick={() => void setComplimentaryPro(row, false)}
                        className="rounded-full border border-coral/30 px-3 py-1.5 text-xs font-semibold text-coral disabled:opacity-50"
                      >
                        {busyUid === row.uid ? "Saving…" : "Set to Free"}
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={busyUid === row.uid}
                        onClick={() => void setComplimentaryPro(row, true)}
                        className="glass-violet rounded-full px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                      >
                        {busyUid === row.uid ? "Saving…" : "Give Pro"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {error && (
        <p className="mt-4 rounded-xl bg-coral/10 px-3 py-2 text-sm text-coral" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
