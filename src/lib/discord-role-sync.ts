import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import type { PlanId } from "@/lib/plans";
import {
  getDiscordOAuthConfig,
  refreshDiscordTokens,
  type DiscordUser,
} from "@/lib/discord-oauth";
import {
  pushDiscordRoleConnection,
  type DiscordRoleMetadataValues,
} from "@/lib/discord-linked-roles";

const DISCORD_API = "https://discord.com/api/v10";

function tokenCryptoKey() {
  const raw =
    process.env.DISCORD_TOKEN_KEY?.trim() ||
    process.env.DISCORD_OAUTH_SECRET?.trim() ||
    process.env.CRON_SECRET?.trim() ||
    "tvm-discord-token-dev";
  return createHash("sha256").update(raw).digest();
}

export function encryptDiscordSecret(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", tokenCryptoKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64url");
}

export function decryptDiscordSecret(blob: string | undefined | null) {
  if (!blob) return null;
  try {
    const packed = Buffer.from(blob, "base64url");
    if (packed.length < 29) return null;
    const iv = packed.subarray(0, 12);
    const tag = packed.subarray(12, 28);
    const data = packed.subarray(28);
    const decipher = createDecipheriv("aes-256-gcm", tokenCryptoKey(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}

export function metadataForPlan(plan: PlanId | string | undefined): DiscordRoleMetadataValues {
  const normalized = plan === "ultra" || plan === "pro" ? plan : "free";
  return {
    website_linked: 1,
    is_ultra: normalized === "ultra" ? 1 : 0,
    is_pro: normalized === "pro" || normalized === "ultra" ? 1 : 0,
  };
}

function guildRoleIds() {
  return {
    linked: process.env.DISCORD_ROLE_LINKED?.trim() || "",
    pro: process.env.DISCORD_ROLE_PRO?.trim() || "",
    ultra: process.env.DISCORD_ROLE_ULTRA?.trim() || "",
  };
}

/** Assign/remove configured guild roles from plan. No-op if role IDs unset. */
export async function syncGuildMemberRoles(discordId: string, plan: PlanId | string) {
  const config = getDiscordOAuthConfig();
  if (!config?.guildId || !config.botToken) return { ok: false as const, reason: "no_guild" };

  const roles = guildRoleIds();
  const wanted = new Set<string>();
  if (roles.linked) wanted.add(roles.linked);
  if ((plan === "pro" || plan === "ultra") && roles.pro) wanted.add(roles.pro);
  if (plan === "ultra" && roles.ultra) wanted.add(roles.ultra);

  const managed = [roles.linked, roles.pro, roles.ultra].filter(Boolean);
  if (managed.length === 0) return { ok: false as const, reason: "no_role_ids" };

  for (const roleId of managed) {
    const shouldHave = wanted.has(roleId);
    const url = `${DISCORD_API}/guilds/${config.guildId}/members/${discordId}/roles/${roleId}`;
    const response = await fetch(url, {
      method: shouldHave ? "PUT" : "DELETE",
      headers: {
        Authorization: `Bot ${config.botToken}`,
        "X-Audit-Log-Reason": shouldHave
          ? `TVM plan sync (${plan})`
          : `TVM plan sync remove (${plan})`,
      },
    });
    // 204 success; 404 member/role missing is fine to ignore
    if (!response.ok && response.status !== 204 && response.status !== 404) {
      const text = await response.text().catch(() => "");
      console.warn(`[discord] role ${roleId} sync ${response.status}:`, text.slice(0, 160));
    }
  }
  return { ok: true as const };
}

type StoredDiscordAuth = {
  discordId: string;
  discordUsername: string;
  discordGlobalName: string | null;
  discordAvatar: string | null;
  accessTokenEnc?: string;
  refreshTokenEnc?: string;
  tokenExpiresAt?: number;
};

async function loadDiscordAuth(uid: string): Promise<StoredDiscordAuth | null> {
  const { getAdminDb } = await import("@/lib/firebase/admin");
  const db = await getAdminDb();
  if (!db) return null;
  const snap = await db.collection("beta_status").doc(uid).get();
  if (!snap.exists) return null;
  const data = snap.data() || {};
  if (data.discordConnected !== true || typeof data.discordId !== "string") return null;
  return {
    discordId: data.discordId,
    discordUsername: typeof data.discordUsername === "string" ? data.discordUsername : "",
    discordGlobalName:
      typeof data.discordGlobalName === "string" ? data.discordGlobalName : null,
    discordAvatar: typeof data.discordAvatar === "string" ? data.discordAvatar : null,
    accessTokenEnc:
      typeof data.discordAccessTokenEnc === "string" ? data.discordAccessTokenEnc : undefined,
    refreshTokenEnc:
      typeof data.discordRefreshTokenEnc === "string" ? data.discordRefreshTokenEnc : undefined,
    tokenExpiresAt:
      typeof data.discordTokenExpiresAt === "number" ? data.discordTokenExpiresAt : undefined,
  };
}

async function persistDiscordTokens(
  uid: string,
  tokens: { accessToken: string; refreshToken?: string; expiresAt: number },
) {
  const { getAdminDb } = await import("@/lib/firebase/admin");
  const db = await getAdminDb();
  if (!db) return;
  const { FieldValue } = await import("firebase-admin/firestore");
  await db.collection("beta_status").doc(uid).set(
    {
      discordAccessTokenEnc: encryptDiscordSecret(tokens.accessToken),
      discordRefreshTokenEnc: tokens.refreshToken
        ? encryptDiscordSecret(tokens.refreshToken)
        : FieldValue.delete(),
      discordTokenExpiresAt: tokens.expiresAt,
      discordRolesSyncedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
}

async function accessTokenForUid(uid: string, stored: StoredDiscordAuth) {
  const access = decryptDiscordSecret(stored.accessTokenEnc);
  const refresh = decryptDiscordSecret(stored.refreshTokenEnc);
  const stillValid =
    access &&
    stored.tokenExpiresAt &&
    stored.tokenExpiresAt > Date.now() + 60_000;
  if (stillValid && access) return access;

  if (!refresh) return access;
  try {
    const next = await refreshDiscordTokens(refresh);
    await persistDiscordTokens(uid, {
      accessToken: next.accessToken,
      refreshToken: next.refreshToken || refresh,
      expiresAt: next.expiresAt,
    });
    return next.accessToken;
  } catch (error) {
    console.warn("[discord] token refresh failed:", error);
    return access;
  }
}

/**
 * Push Linked Roles metadata + optional guild roles for a TVM user.
 * Safe to call after connect, Stripe, beta redeem, or admin gift.
 */
export async function syncDiscordRolesForUid(uid: string): Promise<{
  ok: boolean;
  reason?: string;
}> {
  try {
    const stored = await loadDiscordAuth(uid);
    if (!stored) return { ok: false, reason: "not_linked" };

    const { getEntitlementForUid } = await import("@/lib/firebase/admin");
    const entitlement = await getEntitlementForUid(uid);
    const plan = (entitlement?.plan || "free") as PlanId;
    const metadata = metadataForPlan(plan);

    const accessToken = await accessTokenForUid(uid, stored);
    if (accessToken) {
      const user: DiscordUser = {
        id: stored.discordId,
        username: stored.discordUsername || stored.discordId,
        global_name: stored.discordGlobalName,
        avatar: stored.discordAvatar,
      };
      try {
        await pushDiscordRoleConnection(accessToken, user, metadata);
      } catch (error) {
        console.warn("[discord] linked-role metadata push:", error);
      }
    } else {
      console.warn(
        "[discord] no role_connections token for",
        uid,
        "— reconnect Discord once to enable auto role sync",
      );
    }

    await syncGuildMemberRoles(stored.discordId, plan);

    const { getAdminDb } = await import("@/lib/firebase/admin");
    const db = await getAdminDb();
    if (db) {
      const { FieldValue } = await import("firebase-admin/firestore");
      await db.collection("beta_status").doc(uid).set(
        {
          discordPlanSynced: plan,
          discordRolesSyncedAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    }

    return { ok: true };
  } catch (error) {
    console.warn("[discord] syncDiscordRolesForUid:", error);
    return {
      ok: false,
      reason: error instanceof Error ? error.message : "sync_failed",
    };
  }
}

export async function storeDiscordOAuthTokens(
  uid: string,
  tokens: { accessToken: string; refreshToken?: string; expiresIn?: number; expiresAt?: number },
) {
  const expiresAt =
    tokens.expiresAt ||
    Date.now() + Math.max(60, tokens.expiresIn || 604800) * 1000;
  await persistDiscordTokens(uid, {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    expiresAt,
  });
}
