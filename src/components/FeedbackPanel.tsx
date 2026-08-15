"use client";

import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { BogenHeading } from "@/components/BogenProvider";

export function FeedbackPanel() {
  const { user } = useAuth();
  const [kind, setKind] = useState<"bug" | "feature">("bug");
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");

  async function submit() {
    if (!user) {
      setError("Sign in to send feedback.");
      setStatus("error");
      return;
    }
    if (rating < 1) {
      setError("Pick a rating from 1 to 5 stars.");
      setStatus("error");
      return;
    }
    if (message.trim().length < 8) {
      setError("Write between 8 and 4,000 characters.");
      setStatus("error");
      return;
    }
    setStatus("sending");
    setError("");
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ kind, rating, message: message.trim() }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;
      if (!response.ok) {
        throw new Error(payload?.error || "Unable to send feedback.");
      }
      setStatus("sent");
      setMessage("");
      setRating(0);
    } catch (submitError) {
      setStatus("error");
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to send feedback.",
      );
    }
  }

  const shown = hoverRating || rating;

  return (
    <div className="glass-strong mt-8 rounded-[24px] p-6">
      <p className="text-xs font-semibold uppercase tracking-widest text-violet">
        Feedback
      </p>
      <h2 className="mt-2 font-display text-2xl font-bold text-ink">
        <BogenHeading id="feedback">Report a bug or request a feature</BogenHeading>
      </h2>
      <p className="mt-2 text-sm text-ink-soft">
        Sent from {user?.email ?? "your account"}. Rate the issue or idea up to 5
        stars.
      </p>

      <div className="mt-5 flex flex-wrap gap-2">
        {(
          [
            ["bug", "Bug report"],
            ["feature", "Feature request"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setKind(value)}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${
              kind === value
                ? "glass-violet text-white"
                : "bg-surface text-ink-soft hover:text-ink"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-5">
        <p className="text-xs text-ink-soft">Rating</p>
        <div className="mt-1 flex items-center gap-1" onMouseLeave={() => setHoverRating(0)}>
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onMouseEnter={() => setHoverRating(star)}
              onClick={() => setRating(star)}
              className={`grid h-9 w-9 place-items-center rounded-full text-lg ${
                star <= shown ? "text-violet" : "text-zinc-300"
              }`}
              aria-label={`${star} of 5 stars`}
            >
              ★
            </button>
          ))}
          <span className="ml-2 text-sm font-semibold text-ink-soft" aria-live="polite">
            {shown ? `${shown}/5 stars` : "0/5 stars"}
          </span>
        </div>
      </div>

      <label className="mt-5 block">
        <span className="text-xs text-ink-soft">Details</span>
        <textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          rows={5}
          placeholder={
            kind === "bug"
              ? "What happened, and what did you expect?"
              : "What should TVM add or change?"
          }
          className="field mt-1 w-full rounded-2xl px-4 py-3 text-sm text-ink"
        />
      </label>

      <button
        type="button"
        onClick={submit}
        disabled={status === "sending"}
        className="glass-violet mt-4 rounded-full px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
      >
        {status === "sending" ? "Sending…" : "Submit"}
      </button>

      {status === "sent" && (
        <p className="mt-3 text-sm text-emerald-600" role="status">
          Thanks — we received it.
        </p>
      )}
      {status === "error" && (
        <p className="mt-3 text-sm text-coral" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
