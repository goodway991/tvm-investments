"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { markDiscordPending, useBetaStatus } from "@/components/BetaStatusProvider";
import { DISCORD_INVITE_URL, JOIN_DISCORD_LABEL } from "@/lib/community";
import { DISCORD_PENDING_KEY, SHOW_BETA_WAITLIST } from "@/lib/beta-waitlist";

export function DiscordJoinButton() {
  const { user } = useAuth();
  const { discordConnected, connectDiscord } = useBetaStatus();
  const [localJoined, setLocalJoined] = useState(false);

  useEffect(() => {
    try {
      setLocalJoined(window.localStorage.getItem(DISCORD_PENDING_KEY) === "1");
    } catch {
      setLocalJoined(false);
    }
  }, []);

  if (!SHOW_BETA_WAITLIST) return null;

  const linked = discordConnected || localJoined;

  async function join() {
    markDiscordPending();
    setLocalJoined(true);
    window.open(DISCORD_INVITE_URL, "_blank", "noopener,noreferrer");
    if (user) {
      try {
        await connectDiscord();
      } catch {
        /* invite still opened */
      }
    }
  }

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={() => void join()}
        className="glass-violet inline-flex w-full items-center justify-center rounded-full px-6 py-3.5 text-[15px] font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-50"
      >
        {JOIN_DISCORD_LABEL}
      </button>
      {linked ? (
        <p className="mt-2 text-center text-xs font-medium text-emerald-400/90">
          Linked to your account
        </p>
      ) : null}
    </div>
  );
}
