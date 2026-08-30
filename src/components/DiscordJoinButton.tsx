"use client";

import { usePathname } from "next/navigation";
import { useBetaStatus } from "@/components/BetaStatusProvider";
import { DiscordConnectPanel } from "@/components/DiscordConnectPanel";
import { SHOW_BETA_WAITLIST } from "@/lib/beta-waitlist";

export function DiscordJoinButton() {
  const pathname = usePathname();
  const { discordConnected } = useBetaStatus();

  if (!SHOW_BETA_WAITLIST) return null;

  if (discordConnected) {
    return (
      <p className="mt-4 text-center text-xs font-medium text-emerald-400/90">
        Discord account linked
      </p>
    );
  }

  return (
    <DiscordConnectPanel variant="auth" returnTo={pathname || "/dashboard"} />
  );
}
