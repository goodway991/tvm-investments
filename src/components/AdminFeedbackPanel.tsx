"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";

type FeedbackRow = {
  id: string;
  email: string;
  kind: "bug" | "feature";
  rating: number;
  message: string;
  createdAt: string;
  emailed: boolean;
};

export function AdminFeedbackPanel() {
  const { user, entitlement } = useAuth();
  const [rows, setRows] = useState<FeedbackRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!user) {
      setError("Sign in as admin.");
      setLoading(false);
      return;
    }
    setError("");
    const token = await user.getIdToken();
    const response = await fetch("/api/feedback", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const payload = (await response.json()) as {
      rows?: FeedbackRow[];
      error?: string;
    };
    if (!response.ok) {
      throw new Error(payload.error || "Unable to load notes.");
    }
    setRows(payload.rows || []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (entitlement.role !== "admin") return;
    void load().catch((loadError: unknown) => {
      setError(
        loadError instanceof Error ? loadError.message : "Unable to load notes.",
      );
      setLoading(false);
    });
  }, [entitlement.role, load]);

  if (entitlement.role !== "admin") return null;

  return (
    <div className="glass-strong mt-8 rounded-[24px] p-6">
      <p className="text-xs font-semibold uppercase tracking-widest text-violet">
        Inbox
      </p>
      <h2 className="mt-2 font-display text-2xl font-bold text-ink">
        Bug reports and feature requests
      </h2>
      <p className="mt-2 text-sm text-ink-soft">
        Signed-in notes land here even if mail is delayed.
      </p>

      {loading ? (
        <p className="mt-4 text-sm text-ink-soft">Loading…</p>
      ) : error ? (
        <p className="mt-4 text-sm text-coral" role="alert">
          {error}
        </p>
      ) : rows.length === 0 ? (
        <p className="mt-4 text-sm text-ink-soft">No notes yet.</p>
      ) : (
        <ul className="mt-5 space-y-4">
          {rows.map((row) => (
            <li
              key={row.id}
              className="rounded-2xl border border-ink/[0.08] bg-white/60 p-4"
            >
              <p className="text-sm font-semibold text-ink">{row.email}</p>
              <p className="mt-1 text-xs text-ink-soft">
                {row.kind === "bug" ? "Bug report" : "Feature request"}
                {" · "}
                {row.rating}/5 stars
                {row.createdAt ? ` · ${row.createdAt.slice(0, 10)}` : ""}
                {row.emailed ? " · mailed" : " · saved"}
              </p>
              <p className="mt-2 whitespace-pre-wrap text-sm text-ink">
                {row.message}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
