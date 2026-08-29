/** Flip to false when Varish says the beta period is over. */
export const SHOW_BETA_WAITLIST = true;

export const DISCORD_PENDING_KEY = "tvm-discord-joined";

export type WaitlistStatus = "none" | "pending" | "admitted";

export type BetaStatus = {
  waitlistStatus: WaitlistStatus;
  betaTester: boolean;
  discordConnected: boolean;
};

export const EMPTY_BETA_STATUS: BetaStatus = {
  waitlistStatus: "none",
  betaTester: false,
  discordConnected: false,
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
  };
}
