"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { resolveAccountName } from "@/lib/person-name";
import { BogenHeading } from "@/components/BogenProvider";
import { ProGlowText } from "@/components/ProGlowText";

type PlanSource = "comp" | "paid" | "none";

type AccountRow = {
  uid: string;
  email: string;
  displayName: string;
  role: "client" | "admin";
  plan: "free" | "pro";
  source: PlanSource;
  disabled: boolean;
};

function paidLook(row: AccountRow) {
  return row.role === "admin" || row.source === "paid";
}

export function AdminAccountsPanel() {
  const { user, entitlement } = useAuth();
  const [rows, setRows] = useState<AccountRow[]>([]);
  const [plansLoaded, setPlansLoaded] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyUid, setBusyUid] = useState("");

  const load = useCallback(async () => {
    if (!user) {
      setError("Sign in as admin.");
      setLoading(false);
      return;
    }
    setError("");
    const token = await user.getIdToken();
    const response = await fetch("/api/admin/accounts", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const payload = (await response.json()) as {
      rows?: AccountRow[];
      plansLoaded?: boolean;
      error?: string;
    };
    if (!response.ok) {
      throw new Error(payload.error || "Unable to load accounts.");
    }
    setRows(payload.rows || []);
    setPlansLoaded(payload.plansLoaded !== false);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (entitlement.role !== "admin") return;
    void load().catch((loadError: unknown) => {
      setError(
        loadError instanceof Error ? loadError.message : "Unable to load accounts.",
      );
      setLoading(false);
    });
  }, [entitlement.role, load]);

  if (entitlement.role !== "admin") return null;

  async function gift(row: AccountRow, grant: boolean) {
    if (!user || row.role === "admin" || paidLook(row)) return;
    setBusyUid(row.uid);
    setError("");
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/admin/accounts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ uid: row.uid, grant }),
      });
      const payload = (await response.json()) as {
        rows?: AccountRow[];
        plansLoaded?: boolean;
        error?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error || "Unable to update that plan.");
      }
      if (payload.rows) {
        setRows(payload.rows);
        setPlansLoaded(payload.plansLoaded !== false);
      } else {
        await load();
      }
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "Unable to update that plan.",
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
        <BogenHeading id="admin-gifting">
          <ProGlowText>Complimentary Pro</ProGlowText>
        </BogenHeading>
      </h2>
      <p className="mt-1 text-sm text-ink-soft">
        <ProGlowText>
          Every signed-up account is listed here. Give friends Pro without charging
          them. Paid Pro boxes glow blue — leave those alone.
        </ProGlowText>
      </p>

      {loading ? (
        <p className="mt-4 text-sm text-ink-soft">Loading accounts…</p>
      ) : (
        <div className="mt-4 grid gap-3">
          {rows.length === 0 ? (
            <p className="text-sm text-ink-soft">No signed-up accounts yet.</p>
          ) : (
            rows.map((row) => {
              const paid = paidLook(row);
              const name = resolveAccountName({
                profileName: row.displayName,
                authName: row.displayName,
                email: row.email,
              });
              return (
                <div
                  key={row.uid}
                  className={`rounded-2xl bg-surface p-4 ${paid ? "paid-pro-glow" : ""}`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-ink">{name}</p>
                      <p className="text-sm text-ink-soft">{row.email}</p>
                      <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-ink-soft">
                        {row.role}
                        {row.disabled ? " · Disabled" : ""}
                        {" · "}
                        {!plansLoaded
                          ? "Plan unknown"
                          : paid
                            ? <ProGlowText>Paid Pro</ProGlowText>
                            : row.plan === "pro"
                              ? <ProGlowText>Complimentary Pro</ProGlowText>
                              : "Free"}
                      </p>
                    </div>
                    <div>
                      {row.role === "admin" ? (
                        <span className="text-xs font-semibold text-ink-soft">Admin</span>
                      ) : paid ? (
                        <span className="text-xs font-semibold text-violet">Paid</span>
                      ) : row.plan === "pro" && plansLoaded ? (
                        <button
                          type="button"
                          disabled={busyUid === row.uid}
                          onClick={() => void gift(row, false)}
                          className="rounded-full border border-coral/30 px-3 py-1.5 text-xs font-semibold text-coral disabled:opacity-50"
                        >
                          {busyUid === row.uid ? "Saving…" : "Set to Free"}
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={busyUid === row.uid}
                          onClick={() => void gift(row, true)}
                          className="glass-violet rounded-full px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                        >
                          {busyUid === row.uid ? "Saving…" : <ProGlowText>Give Pro</ProGlowText>}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
      {!plansLoaded && !error && (
        <p className="mt-4 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Account names loaded. Plan badges may be incomplete until Firestore
          quota resets.
        </p>
      )}
      {error && (
        <p className="mt-4 rounded-xl bg-coral/10 px-3 py-2 text-sm text-coral" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
