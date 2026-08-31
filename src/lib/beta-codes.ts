import { createHash, randomBytes } from "crypto";

/** Ultra beta access ends at Sept 24, 2026 11:59:59.999 PM America/New_York. */
export const ULTRA_BETA_EXPIRES_AT_MS = Date.parse("2026-09-25T03:59:59.999Z");

export const ULTRA_BETA_EXPIRES_LABEL = "9/24 at 11:59 PM EST";

export function ultraBetaStillActive(expiresAtMs: number | null | undefined, now = Date.now()) {
  if (!expiresAtMs || !Number.isFinite(expiresAtMs)) return false;
  return now <= Math.min(expiresAtMs, ULTRA_BETA_EXPIRES_AT_MS);
}

export function normalizeBetaCode(raw: string) {
  return raw.trim().toUpperCase().replace(/\s+/g, "");
}

export function hashBetaCode(code: string) {
  return createHash("sha256").update(normalizeBetaCode(code)).digest("hex");
}

export function generateBetaCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(8);
  let out = "TVM-";
  for (let i = 0; i < 8; i += 1) {
    out += alphabet[bytes[i]! % alphabet.length];
    if (i === 3) out += "-";
  }
  return out;
}
