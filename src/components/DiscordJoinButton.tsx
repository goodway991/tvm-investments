"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { markDiscordPending, useBetaStatus } from "@/components/BetaStatusProvider";
import { DISCORD_INVITE_URL } from "@/lib/community";
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

  const connected = discordConnected || localJoined;

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

  if (connected) {
    return (
      <p className="mt-3 w-full rounded-full border border-emerald-500/30 bg-emerald-500/10 px-6 py-3 text-center text-[15px] font-medium text-emerald-700">
        Discord connected
      </p>
    );
  }

  return (
    <button
      type="button"
      onClick={() => void join()}
      className="mt-3 inline-flex w-full items-center justify-center rounded-full border border-violet/20 bg-violet/8 px-6 py-3.5 text-[15px] font-medium text-violet transition-all duration-200 hover:-translate-y-0.5 hover:bg-violet/12"
    >
      Join Discord
    </button>
  );
}
