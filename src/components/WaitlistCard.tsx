"use client";

import { useState } from "react";
import { useBetaStatus } from "@/components/BetaStatusProvider";
import { DiscordJoinButton } from "@/components/DiscordJoinButton";
import { SHOW_BETA_WAITLIST } from "@/lib/beta-waitlist";

export function WaitlistCard() {
  const { show, waitlistStatus, betaTester, loading, joinWaitlist } = useBetaStatus();
  const [error, setError] = useState("");

  if (!SHOW_BETA_WAITLIST || !show) return null;

  async function join() {
    setError("");
    try {
      await joinWaitlist();
    } catch (joinError) {
      setError(
        joinError instanceof Error ? joinError.message : "Unable to join the waitlist.",
      );
    }
  }

  const admitted = betaTester || waitlistStatus === "admitted";

  return (
    <div className="glass-strong rounded-[24px] p-5">
      <p className="text-xs font-semibold uppercase tracking-widest text-violet">
        Beta
      </p>
      <h2 className="mt-1 font-display text-xl font-bold text-ink">
        {admitted
          ? "You're a beta tester"
          : waitlistStatus === "pending"
            ? "You're on the waitlist"
            : "Join the waitlist"}
      </h2>
      <p className="mt-1 text-sm text-ink-soft">
        {admitted
          ? "You're in the TVM beta. Keep an eye on Discord for tester rooms."
          : waitlistStatus === "pending"
            ? "You're in line. We'll make you a beta tester when you're admitted."
            : "The desk is open. Join the waitlist if you want to be a beta tester."}
      </p>
      {waitlistStatus === "none" && !admitted ? (
        <button
          type="button"
          disabled={loading}
          onClick={() => void join()}
          className="glass-violet mt-4 rounded-full px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {loading ? "Joining…" : "Join the waitlist"}
        </button>
      ) : null}
      <div className="mt-2 max-w-xs">
        <DiscordJoinButton />
      </div>
      {error ? (
        <p className="mt-3 text-sm text-coral" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
