import { NextRequest, NextResponse } from "next/server";
import { requireSignedIn } from "@/lib/api-guard";
import { redeemBetaCode } from "@/lib/firebase/admin";
import { ULTRA_BETA_EXPIRES_LABEL } from "@/lib/beta-codes";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const gate = await requireSignedIn(request);
  if (!gate.ok) return gate.response;

  let code = "";
  try {
    const body = (await request.json()) as { code?: string };
    code = String(body.code || "");
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  try {
    const result = await redeemBetaCode(gate.uid, gate.email, code);
    return NextResponse.json({
      ...result,
      label: `Ultra Beta Tester — Expires ${ULTRA_BETA_EXPIRES_LABEL}`,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to redeem that code.",
      },
      { status: 400 },
    );
  }
}
