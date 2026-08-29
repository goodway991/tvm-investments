"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { authedFetch } from "@/lib/authed-fetch";
import { resolveAccountName } from "@/lib/person-name";
import { SHOW_BETA_WAITLIST } from "@/lib/beta-waitlist";

type WaitlistRow = {
  uid: string;
  email: string;
  displayName: string;
  discordConnected: boolean;
};

export function AdminWaitlistPanel() {
  const { user, entitlement } = useAuth();
  const [rows, setRows] = useState<WaitlistRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyUid, setBusyUid] = useState("");

  const load = useCallback(async () => {
    if (!user) return;
    const response = await authedFetch("/api/admin/waitlist");
    const payload = (await response.json()) as {
      rows?: WaitlistRow[];
      error?: string;
    };
    if (!response.ok) throw new Error(payload.error || "Unable to load the waitlist.");
    setRows(payload.rows || []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (entitlement.role !== "admin" || !SHOW_BETA_WAITLIST) return;
    void load().catch((loadError: unknown) => {
      setError(
        loadError instanceof Error ? loadError.message : "Unable to load the waitlist.",
      );
      setLoading(false);
    });
  }, [entitlement.role, load]);

  if (entitlement.role !== "admin" || !SHOW_BETA_WAITLIST) return null;

  async function admit(row: WaitlistRow) {
    setBusyUid(row.uid);
    setError("");
    try {
      const response = await authedFetch("/api/admin/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: row.uid }),
      });
      const payload = (await response.json()) as {
        rows?: WaitlistRow[];
        error?: string;
      };
      if (!response.ok) throw new Error(payload.error || "Unable to admit them.");
      setRows(payload.rows || []);
    } catch (admitError) {
      setError(
        admitError instanceof Error ? admitError.message : "Unable to admit them.",
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
        Beta waitlist
      </h2>
      <p className="mt-1 text-sm text-ink-soft">
        Admit someone and they become a beta tester.
      </p>
      {loading ? (
        <p className="mt-4 text-sm text-ink-soft">Loading waitlist…</p>
      ) : rows.length === 0 ? (
        <p className="mt-4 text-sm text-ink-soft">Nobody is waiting right now.</p>
      ) : (
        <div className="mt-4 grid gap-3">
          {rows.map((row) => (
            <div key={row.uid} className="rounded-2xl bg-surface p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-ink">
                    {resolveAccountName({
                      profileName: row.displayName,
                      authName: row.displayName,
                      email: row.email,
                    })}
                  </p>
                  <p className="text-sm text-ink-soft">{row.email}</p>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-ink-soft">
                    {row.discordConnected ? "Discord connected" : "Discord not connected"}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={busyUid === row.uid}
                  onClick={() => void admit(row)}
                  className="glass-violet rounded-full px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {busyUid === row.uid ? "Admitting…" : "Admit"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      {error ? (
        <p className="mt-4 rounded-xl bg-coral/10 px-3 py-2 text-sm text-coral" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
