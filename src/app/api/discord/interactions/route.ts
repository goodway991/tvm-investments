import { NextRequest, NextResponse } from "next/server";
import {
  discordInteractionResponse,
  verifyDiscordInteractionSignature,
} from "@/lib/discord-interactions";

export const dynamic = "force-dynamic";

type DiscordInteractionBody = {
  type?: number;
  data?: { name?: string };
};

export async function POST(request: NextRequest) {
  const publicKey = process.env.DISCORD_PUBLIC_KEY?.trim();
  if (!publicKey) {
    return NextResponse.json({ error: "Discord interactions not configured." }, { status: 503 });
  }

  const signature = request.headers.get("x-signature-ed25519") || "";
  const timestamp = request.headers.get("x-signature-timestamp") || "";
  const rawBody = await request.text();

  if (
    !signature ||
    !timestamp ||
    !verifyDiscordInteractionSignature(publicKey, signature, timestamp, rawBody)
  ) {
    return new NextResponse("invalid request signature", { status: 401 });
  }

  let body: DiscordInteractionBody;
  try {
    body = JSON.parse(rawBody) as DiscordInteractionBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  // Discord ping / endpoint validation
  if (body.type === 1) {
    return NextResponse.json({ type: 1 });
  }

  // Application command
  if (body.type === 2) {
    return NextResponse.json(discordInteractionResponse(body.data?.name));
  }

  return NextResponse.json({ error: "Unsupported interaction." }, { status: 400 });
}
