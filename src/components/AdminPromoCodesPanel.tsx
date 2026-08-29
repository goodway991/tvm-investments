"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { authedFetch } from "@/lib/authed-fetch";

type PromoRow = {
  id: string;
  code: string;
  active: boolean;
  expiresAt: number;
  maxRedemptions: number;
  timesRedeemed: number;
  percentOff: number;
  duration: string;
};

function expireLabel(unix: number) {
  if (!unix) return "No expiration";
  return new Date(unix * 1000).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function AdminPromoCodesPanel() {
  const { entitlement } = useAuth();
  const [rows, setRows] = useState<PromoRow[]>([]);
  const [configured, setConfigured] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [code, setCode] = useState("");
  const [percentOff, setPercentOff] = useState("50");
  const [expiresAt, setExpiresAt] = useState("");
  const [maxRedemptions, setMaxRedemptions] = useState("");
  const [duration, setDuration] = useState<"once" | "forever">("once");

  const load = useCallback(async () => {
    const response = await authedFetch("/api/admin/promo-codes");
    const payload = (await response.json()) as {
      rows?: PromoRow[];
      configured?: boolean;
      error?: string;
    };
    if (!response.ok) throw new Error(payload.error || "Unable to load codes.");
    setRows(payload.rows || []);
    setConfigured(payload.configured !== false);
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
    try {
      const response = await authedFetch("/api/admin/promo-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          percentOff: Number(percentOff),
          expiresAt,
          maxRedemptions: Number(maxRedemptions) || 0,
          duration,
        }),
      });
      const payload = (await response.json()) as { row?: PromoRow; error?: string };
      if (!response.ok) throw new Error(payload.error || "Unable to create that code.");
      if (payload.row) setRows((current) => [payload.row as PromoRow, ...current]);
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
      const response = await authedFetch("/api/admin/promo-codes", {
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
        Beta discount codes
      </h2>
      <p className="mt-1 text-sm text-ink-soft">
        Checkout already has “Add promotion code.” Create a code here or in the
        Stripe Dashboard. Set an expiration date, a use limit, or both.
      </p>

      {!configured ? (
        <p className="mt-4 text-sm text-ink-soft">
          Stripe is not configured yet. After you add the secret key and prices,
          codes you create here show up on checkout.
        </p>
      ) : (
        <form
          className="mt-5 grid gap-3 sm:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            void create();
          }}
        >
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-ink">Code</span>
            <input
              value={code}
              onChange={(event) => setCode(event.target.value.toUpperCase())}
              placeholder="BETA50"
              className="field w-full rounded-2xl px-4 py-3 text-sm text-ink"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-ink">
              Percent off
            </span>
            <input
              type="number"
              min={1}
              max={100}
              value={percentOff}
              onChange={(event) => setPercentOff(event.target.value)}
              className="field w-full rounded-2xl px-4 py-3 text-sm text-ink"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-ink">
              Expires
            </span>
            <input
              type="date"
              value={expiresAt}
              onChange={(event) => setExpiresAt(event.target.value)}
              className="field w-full rounded-2xl px-4 py-3 text-sm text-ink"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-ink">
              Max uses
            </span>
            <input
              type="number"
              min={0}
              value={maxRedemptions}
              onChange={(event) => setMaxRedemptions(event.target.value)}
              placeholder="Unlimited"
              className="field w-full rounded-2xl px-4 py-3 text-sm text-ink"
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1.5 block text-sm font-medium text-ink">
              Applies to
            </span>
            <select
              value={duration}
              onChange={(event) =>
                setDuration(event.target.value === "forever" ? "forever" : "once")
              }
              className="field w-full rounded-2xl px-4 py-3 text-sm text-ink"
            >
              <option value="once">First invoice only</option>
              <option value="forever">Every invoice</option>
            </select>
          </label>
          <button
            type="submit"
            disabled={saving}
            className="glass-violet rounded-full px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50 sm:col-span-2"
          >
            {saving ? "Creating…" : "Create code"}
          </button>
        </form>
      )}

      {loading ? (
        <p className="mt-4 text-sm text-ink-soft">Loading codes…</p>
      ) : rows.length === 0 ? (
        <p className="mt-4 text-sm text-ink-soft">No codes yet.</p>
      ) : (
        <div className="mt-5 grid gap-3">
          {rows.map((row) => (
            <div key={row.id} className="rounded-2xl bg-surface p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-ink">{row.code || row.id}</p>
                  <p className="text-sm text-ink-soft">
                    {row.percentOff}% off · {row.duration === "forever" ? "every invoice" : "first invoice"} ·{" "}
                    {expireLabel(row.expiresAt)} ·{" "}
                    {row.maxRedemptions
                      ? `${row.timesRedeemed}/${row.maxRedemptions} used`
                      : `${row.timesRedeemed} used`}
                    {row.active ? "" : " · off"}
                  </p>
                </div>
                {row.active ? (
                  <button
                    type="button"
                    onClick={() => void deactivate(row.id)}
                    className="rounded-full px-4 py-2 text-sm font-semibold text-coral hover:bg-coral/10"
                  >
                    Turn off
                  </button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
      {error ? (
        <p className="mt-4 text-sm text-coral" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
