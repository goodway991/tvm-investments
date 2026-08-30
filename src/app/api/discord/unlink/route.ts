import { NextRequest, NextResponse } from "next/server";
import { requireSignedIn } from "@/lib/api-guard";
import { unlinkDiscordAccount } from "@/lib/firebase/admin";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const gate = await requireSignedIn(request);
  if (!gate.ok) return gate.response;

  try {
    const status = await unlinkDiscordAccount(gate.uid, gate.email);
    return NextResponse.json(status);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to unlink Discord.",
      },
      { status: 500 },
    );
  }
}
