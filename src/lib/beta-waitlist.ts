import { parseDiscordProfile, type DiscordProfile } from "@/lib/discord-profile";
import { planHasPro, type PlanId } from "@/lib/plans";

/** Flip to false when Varish says the beta period is over. */
export const SHOW_BETA_WAITLIST = true;

export const DISCORD_PENDING_KEY = "tvm-discord-joined";

export type WaitlistStatus = "none" | "pending" | "admitted";

export type DeskPhase = "open" | "join" | "pending" | "pay";

export type BetaStatus = {
  waitlistStatus: WaitlistStatus;
  betaTester: boolean;
  discordConnected: boolean;
  discord: DiscordProfile | null;
};

export const EMPTY_BETA_STATUS: BetaStatus = {
  waitlistStatus: "none",
  betaTester: false,
  discordConnected: false,
  discord: null,
};

export function parseBetaStatus(data: Record<string, unknown> | undefined): BetaStatus {
  const waitlistStatus =
    data?.waitlistStatus === "pending" || data?.waitlistStatus === "admitted"
      ? data.waitlistStatus
      : "none";
  return {
    waitlistStatus,
    betaTester: data?.betaTester === true || waitlistStatus === "admitted",
    discordConnected: data?.discordConnected === true,
    discord: parseDiscordProfile(data),
  };
}

export function isAdmittedBeta(status: Pick<BetaStatus, "waitlistStatus" | "betaTester">) {
  return status.betaTester || status.waitlistStatus === "admitted";
}

export function deskPhase(input: {
  show: boolean;
  role: "client" | "admin";
  plan: PlanId;
  waitlistStatus: WaitlistStatus;
  betaTester: boolean;
}): DeskPhase {
  if (!input.show || input.role === "admin") return "open";
  if (!isAdmittedBeta(input)) {
    return input.waitlistStatus === "pending" ? "pending" : "join";
  }
  return planHasPro(input.plan) ? "open" : "pay";
}
