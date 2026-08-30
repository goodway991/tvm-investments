import { NextRequest, NextResponse } from "next/server";
import {
  addDiscordUserToGuild,
  discordPendingCookie,
  exchangeDiscordCode,
  fetchDiscordUser,
  getDiscordOAuthConfig,
  serializePendingDiscord,
  toDiscordLinkPayload,
  verifyOAuthState,
} from "@/lib/discord-oauth";
import { linkDiscordAccount } from "@/lib/firebase/admin";

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

export async function GET(request: NextRequest) {
  const config = getDiscordOAuthConfig();
  if (!config) {
    return redirectWithStatus(request, "/login", "error", "not_configured");
  }

  const code = request.nextUrl.searchParams.get("code");
  const stateRaw = request.nextUrl.searchParams.get("state");
  const oauthError = request.nextUrl.searchParams.get("error");

  if (oauthError) {
    return redirectWithStatus(request, "/login", "error", oauthError);
  }

  const state = stateRaw ? verifyOAuthState(stateRaw) : null;
  if (!code || !state) {
    return redirectWithStatus(request, state?.returnTo || "/login", "error", "invalid_state");
  }

  try {
    const accessToken = await exchangeDiscordCode(code, config);
    const discordUser = await fetchDiscordUser(accessToken);
    const payload = toDiscordLinkPayload(discordUser, accessToken);

    try {
      await addDiscordUserToGuild(discordUser.id, accessToken, config);
    } catch (guildError) {
      console.warn("[discord] guild join skipped:", guildError);
    }

    if (state.uid && !state.guest) {
      await linkDiscordAccount(state.uid, "", payload, {
        joinWaitlist:
          state.returnTo.startsWith("/login") || state.returnTo.startsWith("/signup"),
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
    return redirectWithStatus(request, state.returnTo, "error", reason.slice(0, 120));
  }
}
