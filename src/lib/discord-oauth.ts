import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "crypto";

export type DiscordOAuthConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  guildId?: string;
  botToken?: string;
};

export type DiscordUser = {
  id: string;
  username: string;
  global_name: string | null;
  avatar: string | null;
  discriminator?: string;
};

export type DiscordLinkPayload = {
  discordId: string;
  discordUsername: string;
  discordGlobalName: string | null;
  discordAvatar: string | null;
  accessToken?: string;
};

export type OAuthState = {
  returnTo: string;
  guest: boolean;
  uid?: string;
  exp: number;
  nonce: string;
};

const DISCORD_API = "https://discord.com/api/v10";
const PENDING_COOKIE = "tvm_discord_pending";
const PENDING_MAX_AGE_SEC = 600;

function discordRedirectUri() {
  const explicit = process.env.DISCORD_REDIRECT_URI?.trim();
  if (explicit) return explicit;
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");
  if (appUrl) return `${appUrl}/api/discord/callback`;
  if (process.env.VERCEL_ENV === "production") {
    return "https://tvminvest.com/api/discord/callback";
  }
  return "http://localhost:3000/api/discord/callback";
}

function oauthSecret() {
  return (
    process.env.DISCORD_OAUTH_SECRET?.trim() ||
    process.env.CRON_SECRET?.trim() ||
    "tvm-discord-oauth-dev"
  );
}

export function getDiscordOAuthConfig(): DiscordOAuthConfig | null {
  const clientId = process.env.DISCORD_CLIENT_ID?.trim();
  const clientSecret = process.env.DISCORD_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) return null;
  return {
    clientId,
    clientSecret,
    redirectUri: discordRedirectUri(),
    guildId: process.env.DISCORD_GUILD_ID?.trim() || undefined,
    botToken: process.env.DISCORD_BOT_TOKEN?.trim() || undefined,
  };
}

export function isDiscordOAuthConfigured() {
  return getDiscordOAuthConfig() !== null;
}

function signPayload(payload: string) {
  return createHmac("sha256", oauthSecret()).update(payload).digest("base64url");
}

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function signOAuthState(input: Omit<OAuthState, "nonce" | "exp"> & { exp?: number }) {
  const state: OAuthState = {
    returnTo: sanitizeReturnTo(input.returnTo),
    guest: input.guest,
    uid: input.uid,
    nonce: randomBytes(16).toString("hex"),
    exp: input.exp ?? Date.now() + 10 * 60 * 1000,
  };
  const payload = Buffer.from(JSON.stringify(state)).toString("base64url");
  return `${payload}.${signPayload(payload)}`;
}

export function verifyOAuthState(raw: string): OAuthState | null {
  const [payload, signature] = raw.split(".");
  if (!payload || !signature || !safeEqual(signPayload(payload), signature)) return null;
  try {
    const state = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as OAuthState;
    if (!state.exp || Date.now() > state.exp) return null;
    if (!state.returnTo) return null;
    state.returnTo = sanitizeReturnTo(state.returnTo);
    return state;
  } catch {
    return null;
  }
}

function sanitizeReturnTo(value: string | undefined) {
  const path = (value || "/dashboard/settings").trim();
  if (!path.startsWith("/") || path.startsWith("//")) return "/dashboard/settings";
  return path;
}

export function discordAvatarUrl(user: Pick<DiscordUser, "id" | "avatar">, size = 128) {
  if (user.avatar) {
    return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=${size}`;
  }
  const fallback = Number(user.id) % 6;
  return `https://cdn.discordapp.com/embed/avatars/${fallback}.png`;
}

export function discordDisplayName(user: Pick<DiscordUser, "username" | "global_name">) {
  return user.global_name?.trim() || user.username;
}

export function discordHandle(user: Pick<DiscordUser, "username">) {
  return `@${user.username}`;
}

export function toDiscordLinkPayload(
  user: DiscordUser,
  accessToken?: string,
): DiscordLinkPayload {
  return {
    discordId: user.id,
    discordUsername: user.username,
    discordGlobalName: user.global_name,
    discordAvatar: user.avatar,
    accessToken,
  };
}

export function buildDiscordAuthorizeUrl(state: string, config: DiscordOAuthConfig) {
  const scopes = config.guildId && config.botToken ? "identify guilds.join" : "identify";
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    scope: scopes,
    state,
    prompt: "consent",
  });
  return `https://discord.com/api/oauth2/authorize?${params.toString()}`;
}

export async function exchangeDiscordCode(code: string, config: DiscordOAuthConfig) {
  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    grant_type: "authorization_code",
    code,
    redirect_uri: config.redirectUri,
  });
  const response = await fetch(`${DISCORD_API}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const payload = (await response.json()) as { access_token?: string; error?: string };
  if (!response.ok || !payload.access_token) {
    throw new Error(payload.error || "Discord authorization failed.");
  }
  return payload.access_token;
}

export async function fetchDiscordUser(accessToken: string) {
  const response = await fetch(`${DISCORD_API}/users/@me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const payload = (await response.json()) as DiscordUser & { message?: string };
  if (!response.ok || !payload.id) {
    throw new Error(payload.message || "Unable to read your Discord profile.");
  }
  return payload;
}

export async function addDiscordUserToGuild(
  userId: string,
  accessToken: string,
  config: DiscordOAuthConfig,
) {
  if (!config.guildId || !config.botToken) return;
  const response = await fetch(`${DISCORD_API}/guilds/${config.guildId}/members/${userId}`, {
    method: "PUT",
    headers: {
      Authorization: `Bot ${config.botToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ access_token: accessToken }),
  });
  if (!response.ok && response.status !== 204) {
    const payload = (await response.json().catch(() => ({}))) as { message?: string };
    throw new Error(payload.message || "Unable to add you to the Discord server.");
  }
}

export function serializePendingDiscord(payload: DiscordLinkPayload) {
  const body = Buffer.from(
    JSON.stringify({ ...payload, exp: Date.now() + PENDING_MAX_AGE_SEC * 1000 }),
  ).toString("base64url");
  return `${body}.${signPayload(body)}`;
}

export function parsePendingDiscord(raw: string | undefined | null): DiscordLinkPayload | null {
  if (!raw) return null;
  const [body, signature] = raw.split(".");
  if (!body || !signature || !safeEqual(signPayload(body), signature)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as DiscordLinkPayload & {
      exp?: number;
    };
    if (!parsed.discordId || !parsed.exp || Date.now() > parsed.exp) return null;
    return {
      discordId: parsed.discordId,
      discordUsername: parsed.discordUsername,
      discordGlobalName: parsed.discordGlobalName ?? null,
      discordAvatar: parsed.discordAvatar ?? null,
      accessToken: parsed.accessToken,
    };
  } catch {
    return null;
  }
}

export const discordPendingCookie = {
  name: PENDING_COOKIE,
  maxAge: PENDING_MAX_AGE_SEC,
};
