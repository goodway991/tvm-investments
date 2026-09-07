import "server-only";
import {
  discordDisplayName,
  getDiscordOAuthConfig,
  type DiscordUser,
} from "@/lib/discord-oauth";
import {
  findUidByDiscordId,
  getEntitlementForUid,
} from "@/lib/firebase/admin";

const DISCORD_API = "https://discord.com/api/v10";

/** Boolean_equal metadata type — Discord Application Role Connection Metadata. */
const BOOLEAN_EQ = 7;

export const DISCORD_ROLE_METADATA = [
  {
    key: "website_linked",
    name: "Website Linked",
    description: "Linked their TVM Investments account",
    type: BOOLEAN_EQ,
  },
  {
    key: "is_ultra",
    name: "Ultra Member",
    description: "Has Ultra on TVM Investments",
    type: BOOLEAN_EQ,
  },
  {
    key: "is_pro",
    name: "Pro Member",
    description: "Has Pro or Ultra on TVM Investments",
    type: BOOLEAN_EQ,
  },
] as const;

export type DiscordRoleMetadataValues = {
  website_linked: 0 | 1;
  is_ultra: 0 | 1;
  is_pro: 0 | 1;
};

export function linkedRolesVerificationUrl(origin?: string) {
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");
  if (appUrl) return `${appUrl}/api/discord/linked-role`;
  if (origin) return `${origin.replace(/\/$/, "")}/api/discord/linked-role`;
  if (process.env.VERCEL_ENV === "production") {
    return "https://tvminvest.com/api/discord/linked-role";
  }
  return "http://localhost:3000/api/discord/linked-role";
}

export async function registerDiscordRoleConnectionMetadata() {
  const config = getDiscordOAuthConfig();
  if (!config?.botToken) {
    throw new Error("DISCORD_BOT_TOKEN is required to register linked-role metadata.");
  }
  const response = await fetch(
    `${DISCORD_API}/applications/${config.clientId}/role-connections/metadata`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bot ${config.botToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(DISCORD_ROLE_METADATA),
    },
  );
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(text || `Metadata register failed (${response.status}).`);
  }
  return response.json();
}

export async function resolveDiscordRoleMetadata(
  discordId: string,
): Promise<DiscordRoleMetadataValues> {
  const uid = await findUidByDiscordId(discordId);
  if (!uid) {
    return { website_linked: 0, is_ultra: 0, is_pro: 0 };
  }
  const entitlement = await getEntitlementForUid(uid);
  const plan = entitlement?.plan || "free";
  const isUltra = plan === "ultra" ? 1 : 0;
  const isPro = plan === "pro" || plan === "ultra" ? 1 : 0;
  return {
    website_linked: 1,
    is_ultra: isUltra,
    is_pro: isPro,
  };
}

export async function pushDiscordRoleConnection(
  accessToken: string,
  user: DiscordUser,
  metadata: DiscordRoleMetadataValues,
) {
  const config = getDiscordOAuthConfig();
  if (!config) throw new Error("Discord OAuth is not configured.");

  const response = await fetch(
    `${DISCORD_API}/users/@me/applications/${config.clientId}/role-connection`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        platform_name: "TVM Investments",
        platform_username: discordDisplayName(user),
        metadata: {
          website_linked: String(metadata.website_linked),
          is_ultra: String(metadata.is_ultra),
          is_pro: String(metadata.is_pro),
        },
      }),
    },
  );
  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { message?: string };
    throw new Error(payload.message || `Unable to update Discord linked roles (${response.status}).`);
  }
}

export function linkedRoleSuccessHtml(opts: {
  displayName: string;
  metadata: DiscordRoleMetadataValues;
}) {
  const status = opts.metadata.website_linked
    ? opts.metadata.is_ultra
      ? "Ultra member"
      : opts.metadata.is_pro
        ? "Pro member"
        : "Website linked"
    : "Connected — link Discord in TVM Settings for member roles";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Linked roles · TVM Investments</title>
  <style>
    :root { color-scheme: dark; }
    body {
      margin: 0; min-height: 100vh; display: grid; place-items: center;
      font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif;
      background: radial-gradient(58vw 42vw at 0% 0%, rgba(18,110,118,.07), transparent 58%),
        radial-gradient(52vw 40vw at 100% 100%, rgba(32,68,140,.06), transparent 56%),
        linear-gradient(180deg,#0a0c14,#07090f);
      color: #f8faff;
    }
    .card {
      width: min(28rem, calc(100vw - 2rem));
      padding: 1.75rem 1.5rem;
      border-radius: 24px;
      background: rgba(20,28,46,.92);
      border: 1px solid rgba(180,210,255,.18);
      box-shadow: 0 24px 60px rgba(0,0,0,.35);
      text-align: center;
    }
    h1 { margin: 0; font-size: 1.35rem; letter-spacing: -0.02em; }
    p { margin: 0.75rem 0 0; color: #c6d4e8; line-height: 1.5; font-size: 0.95rem; }
    .ok { margin-top: 1rem; color: #34d399; font-weight: 600; font-size: 0.9rem; }
    a {
      display: inline-block; margin-top: 1.25rem; padding: 0.7rem 1.25rem;
      border-radius: 999px; background: #5865f2; color: white; text-decoration: none;
      font-weight: 600; font-size: 0.9rem;
    }
  </style>
</head>
<body>
  <main class="card">
    <h1>You're verified</h1>
    <p><strong>${escapeHtml(opts.displayName)}</strong> · ${escapeHtml(status)}</p>
    <p class="ok">✓ Linked roles updated — you can return to Discord.</p>
    <a href="https://discord.com/channels/@me">Back to Discord</a>
  </main>
</body>
</html>`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
