import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  discordAvatarUrl,
  discordDisplayName,
  discordHandle,
  discordPendingCookie,
  parsePendingDiscord,
} from "@/lib/discord-oauth";

export const dynamic = "force-dynamic";

export async function GET() {
  const jar = await cookies();
  const pending = parsePendingDiscord(jar.get(discordPendingCookie.name)?.value);
  if (!pending) {
    return NextResponse.json({ pending: false });
  }
  return NextResponse.json({
    pending: true,
    discord: {
      discordId: pending.discordId,
      discordUsername: pending.discordUsername,
      discordGlobalName: pending.discordGlobalName,
      discordAvatar: pending.discordAvatar,
      displayName: discordDisplayName({
        username: pending.discordUsername,
        global_name: pending.discordGlobalName,
      }),
      handle: discordHandle({ username: pending.discordUsername }),
      avatarUrl: discordAvatarUrl({
        id: pending.discordId,
        avatar: pending.discordAvatar,
      }),
    },
  });
}
