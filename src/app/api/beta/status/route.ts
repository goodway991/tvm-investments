import { NextRequest, NextResponse } from "next/server";
import { requireSignedIn } from "@/lib/api-guard";
import {
  connectDiscordStatus,
  getBetaStatus,
  joinBetaWaitlist,
} from "@/lib/firebase/admin";
import { SHOW_BETA_WAITLIST } from "@/lib/beta-waitlist";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const gate = await requireSignedIn(request);
  if (!gate.ok) return gate.response;
  const status = await getBetaStatus(gate.uid);
  return NextResponse.json({ ...status, show: SHOW_BETA_WAITLIST });
}

export async function POST(request: NextRequest) {
  const gate = await requireSignedIn(request);
  if (!gate.ok) return gate.response;
  if (!SHOW_BETA_WAITLIST) {
    return NextResponse.json({ error: "Beta waitlist is closed." }, { status: 410 });
  }

  let action = "";
  try {
    const body = (await request.json()) as { action?: string };
    action = String(body.action || "");
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  try {
    if (action === "waitlist") {
      const status = await joinBetaWaitlist(gate.uid, gate.email);
      return NextResponse.json(status);
    }
    if (action === "discord") {
      const status = await connectDiscordStatus(gate.uid, gate.email);
      return NextResponse.json(status);
    }
    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to update beta status.",
      },
      { status: 500 },
    );
  }
}
