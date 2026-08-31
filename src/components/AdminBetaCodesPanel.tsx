"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { authedFetch } from "@/lib/authed-fetch";
import { ULTRA_BETA_EXPIRES_LABEL } from "@/lib/beta-codes";

type BetaCodeRow = {
  id: string;
  code: string;
  active: boolean;
  maxRedemptions: number;
  timesRedeemed: number;
  expiresAt: number;
  createdAt: string;
};

export function AdminBetaCodesPanel() {
  const { entitlement } = useAuth();
  const [rows, setRows] = useState<BetaCodeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [code, setCode] = useState("");
  const [maxRedemptions, setMaxRedemptions] = useState("");
  const [lastCreated, setLastCreated] = useState("");

  const load = useCallback(async () => {
    const response = await authedFetch("/api/admin/beta-codes");
    const payload = (await response.json()) as {
      rows?: BetaCodeRow[];
      error?: string;
    };
    if (!response.ok) throw new Error(payload.error || "Unable to load codes.");
    setRows(payload.rows || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (entitlement.role !== "admin") return;
    void load().catch((loadError: unknown) => {
      setError(loadError instanceof Error ? loadError.message : "Unable to load codes.");
      setLoading(false);
    });
  }, [entitlement.role, load]);

  if (entitlement.role !== "admin") return null;

  async function create() {
    setSaving(true);
    setError("");
    setLastCreated("");
    try {
      const response = await authedFetch("/api/admin/beta-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: code.trim() || undefined,
          maxRedemptions: Number(maxRedemptions) || 0,
        }),
      });
      const payload = (await response.json()) as {
        row?: BetaCodeRow;
        error?: string;
      };
      if (!response.ok) throw new Error(payload.error || "Unable to create that code.");
      if (payload.row) {
        setRows((current) => [payload.row as BetaCodeRow, ...current]);
        setLastCreated(payload.row.code);
      }
      setCode("");
    } catch (createError) {
      setError(
        createError instanceof Error ? createError.message : "Unable to create that code.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function deactivate(id: string) {
    setError("");
    try {
      const response = await authedFetch("/api/admin/beta-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "deactivate", id }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Unable to turn that off.");
      setRows((current) =>
        current.map((row) => (row.id === id ? { ...row, active: false } : row)),
      );
    } catch (offError) {
      setError(offError instanceof Error ? offError.message : "Unable to turn that off.");
    }
  }

  return (
    <div className="glass-strong mt-4 rounded-[24px] p-6">
      <p className="text-xs font-semibold uppercase tracking-widest text-violet">
        Admin
      </p>
      <h2 className="mt-2 font-display text-2xl font-bold text-ink">
        Ultra beta codes
      </h2>
      <p className="mt-1 text-sm text-ink-soft">
        Create a code, send it to a tester, and they redeem it in Settings for Ultra
        until {ULTRA_BETA_EXPIRES_LABEL}. Leave the code blank to auto-generate one.
        Max uses 0 = unlimited.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_120px_auto]">
        <input
          value={code}
          onChange={(event) => setCode(event.target.value)}
          placeholder="Optional custom code"
          className="field rounded-2xl px-4 py-3 text-sm text-ink"
        />
        <input
          value={maxRedemptions}
          onChange={(event) => setMaxRedemptions(event.target.value)}
          placeholder="Max uses"
          inputMode="numeric"
          className="field rounded-2xl px-4 py-3 text-sm text-ink"
        />
        <button
          type="button"
          disabled={saving}
          onClick={() => void create()}
          className="glass-violet rounded-full px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
        >
          {saving ? "Creating…" : "Create code"}
        </button>
      </div>

      {lastCreated ? (
        <p className="mt-3 rounded-xl bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400">
          Created <span className="font-mono font-semibold text-ink">{lastCreated}</span>
        </p>
      ) : null}

      {error ? (
        <p className="mt-3 text-sm text-coral" role="alert">
          {error}
        </p>
      ) : null}

      <div className="mt-5 space-y-2">
        {loading ? (
          <p className="text-sm text-ink-soft">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-ink-soft">No Ultra beta codes yet.</p>
        ) : (
          rows.map((row) => (
            <div
              key={row.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-surface px-4 py-3 text-sm"
            >
              <div>
                <p className="font-mono font-semibold text-ink">{row.code}</p>
                <p className="text-xs text-ink-soft">
                  {row.active ? "Active" : "Off"} · {row.timesRedeemed}
                  {row.maxRedemptions > 0 ? ` / ${row.maxRedemptions}` : ""} used ·
                  expires {ULTRA_BETA_EXPIRES_LABEL}
                </p>
              </div>
              {row.active ? (
                <button
                  type="button"
                  onClick={() => void deactivate(row.id)}
                  className="rounded-full border border-coral/30 px-3 py-1.5 text-xs font-semibold text-coral"
                >
                  Deactivate
                </button>
              ) : null}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
