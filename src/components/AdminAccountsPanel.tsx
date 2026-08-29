"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { authedFetch } from "@/lib/authed-fetch";
import { resolveAccountName } from "@/lib/person-name";
import { BogenHeading } from "@/components/BogenProvider";
import { ProGlowText } from "@/components/ProGlowText";
import type { PlanId } from "@/lib/plans";

type PlanSource = "comp" | "paid" | "none";

type AccountRow = {
  uid: string;
  email: string;
  displayName: string;
  role: "client" | "admin";
  plan: PlanId;
  source: PlanSource;
  disabled: boolean;
  betaTester?: boolean;
  waitlistStatus?: "none" | "pending" | "admitted";
  discordConnected?: boolean;
};

function planLabel(row: AccountRow, plansLoaded: boolean) {
  if (!plansLoaded) return "Plan unknown";
  if (row.role === "admin") return "Admin";
  if (row.source === "paid") {
    return row.plan === "ultra" ? "Paid Ultra" : "Paid Pro";
  }
  if (row.plan === "ultra") return "Complimentary Ultra";
  if (row.plan === "pro") return "Complimentary Pro";
  return "Free";
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
    const response = await authedFetch("/api/admin/accounts");
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

  async function setPlan(row: AccountRow, plan: PlanId) {
    if (!user || row.role === "admin" || row.plan === plan) return;
    setBusyUid(row.uid);
    setError("");
    try {
      const response = await authedFetch("/api/admin/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: row.uid, plan }),
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
          <ProGlowText>Account plans</ProGlowText>
        </BogenHeading>
      </h2>
      <p className="mt-1 text-sm text-ink-soft">
        Set Free, complimentary Pro, or complimentary Ultra. This also cancels
        an active Stripe subscription on TVM so they stop being billed here.
        Refund the charge in Stripe if they are owed money.
      </p>

      {loading ? (
        <p className="mt-4 text-sm text-ink-soft">Loading accounts…</p>
      ) : (
        <div className="mt-4 grid gap-3">
          {rows.length === 0 ? (
            <p className="text-sm text-ink-soft">No signed-up accounts yet.</p>
          ) : (
            rows.map((row) => {
              const paid = row.source === "paid";
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
                        {row.plan === "pro" ? (
                          <ProGlowText>{planLabel(row, plansLoaded)}</ProGlowText>
                        ) : (
                          planLabel(row, plansLoaded)
                        )}
                        {row.betaTester
                          ? " · Beta tester"
                          : row.waitlistStatus === "pending"
                            ? " · Waitlist"
                            : ""}
                        {row.discordConnected ? " · Discord connected" : ""}
                      </p>
                    </div>
                    <div>
                      {row.role === "admin" ? (
                        <span className="text-xs font-semibold text-ink-soft">Admin</span>
                      ) : (
                        <label className="block text-xs font-semibold text-ink-soft">
                          Plan
                          <select
                            className="field mt-1 min-w-40 rounded-2xl px-3 py-2 text-sm font-semibold text-ink disabled:opacity-50"
                            disabled={busyUid === row.uid || !plansLoaded}
                            value={row.plan}
                            onChange={(event) =>
                              void setPlan(row, event.target.value as PlanId)
                            }
                          >
                            <option value="free">Free</option>
                            <option value="pro">Pro</option>
                            <option value="ultra">Ultra</option>
                          </select>
                        </label>
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
