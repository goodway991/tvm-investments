import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  discordAvatarUrl,
  discordDisplayName,
  discordHandle,
  discordPendingCookie,
} from "@/lib/discord-oauth";
import {
  loadPendingDiscordLink,
  parsePendingCookieId,
} from "@/lib/discord-pending";

export const dynamic = "force-dynamic";

export async function GET() {
  const jar = await cookies();
  const pendingId = parsePendingCookieId(jar.get(discordPendingCookie.name)?.value);
  const pending = pendingId ? await loadPendingDiscordLink(pendingId) : null;
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
