import { NextRequest, NextResponse } from "next/server";
import {
  addDiscordUserToGuild,
  discordDisplayName,
  discordPendingCookie,
  exchangeDiscordCode,
  fetchDiscordUser,
  getDiscordOAuthConfig,
  serializePendingDiscord,
  toDiscordLinkPayload,
  verifyOAuthState,
} from "@/lib/discord-oauth";
import { findUidByDiscordId, linkDiscordAccount } from "@/lib/firebase/admin";
import {
  linkedRoleSuccessHtml,
  pushDiscordRoleConnection,
  resolveDiscordRoleMetadata,
} from "@/lib/discord-linked-roles";
import {
  storeDiscordOAuthTokens,
  syncGuildMemberRoles,
} from "@/lib/discord-role-sync";
import { escapeHtml } from "@/lib/sanitize-text";

export const dynamic = "force-dynamic";

function redirectWithStatus(
  request: NextRequest,
  returnTo: string,
  status: "linked" | "ready" | "error",
  reason?: string,
) {
  const url = new URL(returnTo, request.nextUrl.origin);
  url.searchParams.set("discord", status);
  if (reason) url.searchParams.set("discord_reason", reason);
  return NextResponse.redirect(url);
}

function linkedRoleErrorHtml(message: string) {
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
      background: linear-gradient(180deg,#0a0c14,#07090f); color: #f8faff;
    }
    .card {
      width: min(28rem, calc(100vw - 2rem)); padding: 1.75rem 1.5rem;
      border-radius: 24px; background: rgba(20,28,46,.92);
      border: 1px solid rgba(180,210,255,.18); text-align: center;
    }
    h1 { margin: 0; font-size: 1.25rem; }
    p { margin: 0.75rem 0 0; color: #c6d4e8; line-height: 1.5; }
    a { color: #93c5fd; }
  </style>
</head>
<body>
  <main class="card">
    <h1>Verification didn’t finish</h1>
    <p>${escapeHtml(message)}</p>
    <p><a href="https://tvminvest.com/dashboard/settings?tab=discord">Link Discord in TVM Settings</a>, then try again from Discord.</p>
  </main>
</body>
</html>`;
}

export async function GET(request: NextRequest) {
  const config = getDiscordOAuthConfig();
  if (!config) {
    return redirectWithStatus(request, "/login", "error", "not_configured");
  }

  const code = request.nextUrl.searchParams.get("code");
  const stateRaw = request.nextUrl.searchParams.get("state");
  const oauthError = request.nextUrl.searchParams.get("error");

  const state = stateRaw ? verifyOAuthState(stateRaw) : null;
  const linkedRole = state?.flow === "linked_role";

  if (oauthError) {
    if (linkedRole) {
      return new NextResponse(linkedRoleErrorHtml(oauthError), {
        status: 400,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }
    return redirectWithStatus(request, "/login", "error", oauthError);
  }

  if (!code || !state) {
    if (linkedRole || stateRaw) {
      return new NextResponse(linkedRoleErrorHtml("Invalid or expired Discord session."), {
        status: 400,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }
    return redirectWithStatus(request, state?.returnTo || "/login", "error", "invalid_state");
  }

  try {
    const tokens = await exchangeDiscordCode(code, config);
    const discordUser = await fetchDiscordUser(tokens.accessToken);

    if (linkedRole) {
      const metadata = await resolveDiscordRoleMetadata(discordUser.id);
      await pushDiscordRoleConnection(tokens.accessToken, discordUser, metadata);
      const uid = await findUidByDiscordId(discordUser.id);
      if (uid) {
        await storeDiscordOAuthTokens(uid, tokens);
        await syncGuildMemberRoles(
          discordUser.id,
          metadata.is_ultra ? "ultra" : metadata.is_pro ? "pro" : "free",
        );
      }
      return new NextResponse(
        linkedRoleSuccessHtml({
          displayName: discordDisplayName(discordUser),
          metadata,
        }),
        {
          status: 200,
          headers: { "Content-Type": "text/html; charset=utf-8" },
        },
      );
    }

    const payload = toDiscordLinkPayload(discordUser, tokens);

    try {
      await addDiscordUserToGuild(discordUser.id, tokens.accessToken, config);
    } catch (guildError) {
      console.warn("[discord] guild join skipped:", guildError);
    }

    if (state.uid && !state.guest) {
      await linkDiscordAccount(state.uid, "", payload, {
        joinWaitlist:
          state.returnTo.startsWith("/login") || state.returnTo.startsWith("/signup"),
        tokens,
      });
      return redirectWithStatus(request, state.returnTo, "linked");
    }

    const response = redirectWithStatus(request, state.returnTo, "ready");
    response.cookies.set(discordPendingCookie.name, serializePendingDiscord(payload), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: discordPendingCookie.maxAge,
      path: "/",
    });
    return response;
  } catch (error) {
    const reason = error instanceof Error ? error.message : "oauth_failed";
    if (linkedRole) {
      return new NextResponse(linkedRoleErrorHtml(reason), {
        status: 500,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }
    return redirectWithStatus(request, state.returnTo, "error", reason.slice(0, 120));
  }
}
