import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import type { DiscordLinkPayload } from "@/lib/discord-oauth";

const PENDING_MAX_AGE_MS = 10 * 60 * 1000;

function oauthSecret() {
  const secret =
    process.env.DISCORD_OAUTH_SECRET?.trim() || process.env.CRON_SECRET?.trim();
  if (secret) return secret;
  if (process.env.NODE_ENV !== "production" && process.env.VERCEL_ENV !== "production") {
    return "tvm-discord-oauth-dev";
  }
  throw new Error("DISCORD_OAUTH_SECRET (or CRON_SECRET) must be set.");
}

function signId(id: string) {
  return createHmac("sha256", oauthSecret()).update(id).digest("base64url");
}

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

/** Cookie value is only `id.signature` — tokens stay in Firestore. */
export function serializePendingCookie(pendingId: string) {
  return `${pendingId}.${signId(pendingId)}`;
}

export function parsePendingCookieId(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const [id, signature] = raw.split(".");
  if (!id || !signature || !safeEqual(signId(id), signature)) return null;
  return id;
}

export async function createPendingDiscordLink(payload: DiscordLinkPayload) {
  const { getAdminDb } = await import("@/lib/firebase/admin");
  const { encryptDiscordSecret } = await import("@/lib/discord-role-sync");
  const db = await getAdminDb();
  if (!db) throw new Error("Discord pending store is unavailable.");

  const id = randomBytes(24).toString("base64url");
  const expiresAt = Date.now() + PENDING_MAX_AGE_MS;
  await db.collection("discord_pending").doc(id).set({
    discordId: payload.discordId,
    discordUsername: payload.discordUsername,
    discordGlobalName: payload.discordGlobalName,
    discordAvatar: payload.discordAvatar,
    accessTokenEnc: payload.accessToken
      ? encryptDiscordSecret(payload.accessToken)
      : null,
    refreshTokenEnc: payload.refreshToken
      ? encryptDiscordSecret(payload.refreshToken)
      : null,
    expiresIn: payload.expiresIn ?? null,
    expiresAt,
    createdAt: new Date().toISOString(),
  });
  return id;
}

export async function loadPendingDiscordLink(
  pendingId: string,
): Promise<DiscordLinkPayload | null> {
  const { getAdminDb } = await import("@/lib/firebase/admin");
  const { decryptDiscordSecret } = await import("@/lib/discord-role-sync");
  const db = await getAdminDb();
  if (!db) return null;
  const snap = await db.collection("discord_pending").doc(pendingId).get();
  if (!snap.exists) return null;
  const data = snap.data() || {};
  const expiresAt = Number(data.expiresAt) || 0;
  if (!expiresAt || Date.now() > expiresAt) {
    await snap.ref.delete().catch(() => undefined);
    return null;
  }
  const discordId = String(data.discordId || "");
  const discordUsername = String(data.discordUsername || "");
  if (!discordId || !discordUsername) return null;
  return {
    discordId,
    discordUsername,
    discordGlobalName:
      typeof data.discordGlobalName === "string" ? data.discordGlobalName : null,
    discordAvatar: typeof data.discordAvatar === "string" ? data.discordAvatar : null,
    accessToken: decryptDiscordSecret(
      typeof data.accessTokenEnc === "string" ? data.accessTokenEnc : null,
    ) || undefined,
    refreshToken: decryptDiscordSecret(
      typeof data.refreshTokenEnc === "string" ? data.refreshTokenEnc : null,
    ) || undefined,
    expiresIn: typeof data.expiresIn === "number" ? data.expiresIn : undefined,
  };
}

export async function deletePendingDiscordLink(pendingId: string) {
  const { getAdminDb } = await import("@/lib/firebase/admin");
  const db = await getAdminDb();
  if (!db) return;
  await db.collection("discord_pending").doc(pendingId).delete().catch(() => undefined);
}
