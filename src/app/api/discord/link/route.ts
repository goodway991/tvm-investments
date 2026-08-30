import { NextRequest, NextResponse } from "next/server";
import { requireSignedIn } from "@/lib/api-guard";
import {
  addDiscordUserToGuild,
  discordPendingCookie,
  getDiscordOAuthConfig,
  parsePendingDiscord,
} from "@/lib/discord-oauth";
import { linkDiscordAccount } from "@/lib/firebase/admin";
import { SHOW_BETA_WAITLIST } from "@/lib/beta-waitlist";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const gate = await requireSignedIn(request);
  if (!gate.ok) return gate.response;

  const pending = parsePendingDiscord(request.cookies.get(discordPendingCookie.name)?.value);
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
    });
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
