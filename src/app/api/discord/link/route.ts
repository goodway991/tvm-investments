import { NextRequest, NextResponse } from "next/server";
import { requireSignedIn } from "@/lib/api-guard";
import {
  addDiscordUserToGuild,
  discordPendingCookie,
  getDiscordOAuthConfig,
} from "@/lib/discord-oauth";
import {
  deletePendingDiscordLink,
  loadPendingDiscordLink,
  parsePendingCookieId,
} from "@/lib/discord-pending";
import { linkDiscordAccount } from "@/lib/firebase/admin";
import { SHOW_BETA_WAITLIST } from "@/lib/beta-waitlist";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const gate = await requireSignedIn(request);
  if (!gate.ok) return gate.response;

  const pendingId = parsePendingCookieId(
    request.cookies.get(discordPendingCookie.name)?.value,
  );
  const pending = pendingId ? await loadPendingDiscordLink(pendingId) : null;
  if (!pending) {
    return NextResponse.json({ linked: false });
  }

  try {
    const config = getDiscordOAuthConfig();
    if (config && pending.accessToken) {
      try {
        await addDiscordUserToGuild(pending.discordId, pending.accessToken, config);
      } catch (guildError) {
        console.warn("[discord] guild join skipped:", guildError);
      }
    }

    const status = await linkDiscordAccount(gate.uid, gate.email, pending, {
      joinWaitlist: SHOW_BETA_WAITLIST,
      tokens: pending.accessToken
        ? {
            accessToken: pending.accessToken,
            refreshToken: pending.refreshToken,
            expiresIn: pending.expiresIn,
          }
        : undefined,
    });
    if (pendingId) await deletePendingDiscordLink(pendingId);
    const response = NextResponse.json({ linked: true, ...status });
    response.cookies.set(discordPendingCookie.name, "", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 0,
      path: "/",
    });
    return response;
  } catch (error) {
    return NextResponse.json(
      {
        linked: false,
        error: error instanceof Error ? error.message : "Unable to link Discord.",
      },
      { status: 400 },
    );
  }
}
