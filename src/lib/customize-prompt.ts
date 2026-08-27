/** Bump this when Varish wants “Let’s customize” to auto-open again for every account. */
export const CURRENT_CUSTOMIZE_ID = "customize-1";
export const LEGACY_CUSTOMIZE_KEY = "tvm-customize-v1";

export function customizeIsAcknowledged(seen?: string) {
  return seen === CURRENT_CUSTOMIZE_ID;
}

export function customizeLocalKey(uid: string) {
  return `tvm-customize:${uid}:${CURRENT_CUSTOMIZE_ID}`;
}

export function hasLocalCustomizeAck(uid: string) {
  try {
    return Boolean(window.localStorage.getItem(customizeLocalKey(uid)));
  } catch {
    return false;
  }
}

export type CustomizeAutoAction = "hold" | "ack" | "open";

/**
 * First-time accounts see the four-step prompt once (after the tour).
 * Existing accounts are marked done and never auto-opened again unless
 * CURRENT_CUSTOMIZE_ID is bumped.
 */
export function customizeAutoAction(input: {
  uid?: string;
  loading: boolean;
  tourPending: boolean;
  profileReady: boolean;
  seenCustomize?: string;
  country?: string;
  timeZone?: string;
  role?: string;
  createdAt?: Date | null;
}): CustomizeAutoAction {
  if (input.loading || !input.uid || !input.profileReady) return "hold";
  if (customizeIsAcknowledged(input.seenCustomize)) return "hold";
  if (hasLocalCustomizeAck(input.uid)) return "ack";
  if (input.tourPending) return "hold";
  const neverPrompted = !input.seenCustomize;
  const createdAt = input.createdAt?.getTime() ?? 0;
  const agedAccount = createdAt > 0 && Date.now() - createdAt > 24 * 60 * 60 * 1000;
  const alreadySetUp =
    input.role === "admin" ||
    Boolean(input.country && input.timeZone) ||
    agedAccount;
  if (neverPrompted && alreadySetUp) return "ack";
  return "open";
}
