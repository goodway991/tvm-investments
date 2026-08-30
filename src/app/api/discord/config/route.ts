import { NextResponse } from "next/server";
import { isDiscordOAuthConfigured } from "@/lib/discord-oauth";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ configured: isDiscordOAuthConfigured() });
}
