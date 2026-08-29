"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { authedFetch } from "@/lib/authed-fetch";
import { DEFAULT_WARNING_MESSAGE } from "@/lib/maintenance";

type SitePayload = {
  enabled?: boolean;
  warning?: boolean;
  start?: string;
  end?: string;
  message?: string;
};

export function AdminMaintenancePanel() {
  const { entitlement } = useAuth();
  const [enabled, setEnabled] = useState(false);
  const [warning, setWarning] = useState(false);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [message, setMessage] = useState(DEFAULT_WARNING_MESSAGE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");

  const apply = useCallback((site: SitePayload) => {
    setEnabled(site.enabled === true);
    setWarning(site.warning === true);
    setStart(typeof site.start === "string" ? site.start : "");
    setEnd(typeof site.end === "string" ? site.end : "");
    setMessage(
      typeof site.message === "string" && site.message
        ? site.message
        : DEFAULT_WARNING_MESSAGE,
    );
  }, []);

  const load = useCallback(async () => {
    const response = await authedFetch("/api/admin/maintenance");
    const payload = (await response.json()) as {
      site?: SitePayload;
      error?: string;
    };
    if (!response.ok) throw new Error(payload.error || "Unable to load maintenance.");
    if (payload.site) apply(payload.site);
    setLoading(false);
  }, [apply]);

  useEffect(() => {
    if (entitlement.role !== "admin") return;
    void load().catch((loadError: unknown) => {
      setError(
        loadError instanceof Error ? loadError.message : "Unable to load maintenance.",
      );
      setLoading(false);
    });
  }, [entitlement.role, load]);

  if (entitlement.role !== "admin") return null;

  async function save() {
    setSaving(true);
    setError("");
    setSaved("");
    try {
      const response = await authedFetch("/api/admin/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled, warning, start, end, message }),
      });
      const payload = (await response.json()) as {
        site?: SitePayload;
        error?: string;
      };
      if (!response.ok) throw new Error(payload.error || "Unable to save.");
      if (payload.site) apply(payload.site);
      setSaved("Saved. The lock only flips when you turn it on — dates do not auto-lock.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="glass-strong mt-4 rounded-[24px] p-6">
      <p className="text-xs font-semibold uppercase tracking-widest text-violet">
        Admin
      </p>
      <h2 className="mt-2 font-display text-2xl font-bold text-ink">
        Maintenance
      </h2>
      <p className="mt-1 text-sm text-ink-soft">
        Lock the desk for everyone except you, or show a warning banner. Dates
        are for the message only — they do not turn the lock on by themselves.
      </p>

      {loading ? (
        <p className="mt-4 text-sm text-ink-soft">Loading maintenance…</p>
      ) : (
        <>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <label className="flex cursor-pointer items-center justify-between rounded-2xl bg-surface px-4 py-3">
              <span className="text-sm font-semibold text-ink">Lock the desk</span>
              <input
                type="checkbox"
                checked={enabled}
                onChange={(event) => setEnabled(event.target.checked)}
                className="h-4 w-4 accent-violet"
              />
            </label>
            <label className="flex cursor-pointer items-center justify-between rounded-2xl bg-surface px-4 py-3">
              <span className="text-sm font-semibold text-ink">
                Show warning banner
              </span>
              <input
                type="checkbox"
                checked={warning}
                onChange={(event) => setWarning(event.target.checked)}
                className="h-4 w-4 accent-violet"
              />
            </label>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-ink">
                Starts
              </span>
              <input
                value={start}
                onChange={(event) => setStart(event.target.value)}
                placeholder="Sep 1, 2026 5:00 PM ET"
                className="field w-full rounded-2xl px-4 py-3 text-sm text-ink"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-ink">Ends</span>
              <input
                value={end}
                onChange={(event) => setEnd(event.target.value)}
                placeholder="Sep 2, 2026 8:00 AM ET"
                className="field w-full rounded-2xl px-4 py-3 text-sm text-ink"
              />
            </label>
          </div>

          <label className="mt-4 block">
            <span className="mb-1.5 block text-sm font-medium text-ink">
              Banner message
            </span>
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              rows={3}
              placeholder={DEFAULT_WARNING_MESSAGE}
              className="field w-full rounded-2xl px-4 py-3 text-sm text-ink"
            />
            <span className="mt-1 block text-xs text-ink-soft">
              Use {"{start}"} and {"{end}"} to insert the times above.
            </span>
          </label>

          <button
            type="button"
            disabled={saving}
            onClick={() => void save()}
            className="glass-violet mt-5 rounded-full px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save maintenance"}
          </button>
        </>
      )}
      {saved ? (
        <p className="mt-3 text-sm text-emerald-700" role="status">
          {saved}
        </p>
      ) : null}
      {error ? (
        <p className="mt-3 text-sm text-coral" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
