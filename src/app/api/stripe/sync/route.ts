import { NextRequest, NextResponse } from "next/server";
import { requireSignedIn } from "@/lib/api-guard";
import { applyCheckoutSession } from "@/lib/stripe-entitlements";
import { stripeConfigured } from "@/lib/stripe";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const gate = await requireSignedIn(request);
  if (!gate.ok) return gate.response;
  if (!stripeConfigured()) {
    return NextResponse.json({ error: "Stripe is not configured." }, { status: 503 });
  }

  let sessionId = "";
  try {
    const body = (await request.json()) as { sessionId?: string };
    sessionId = String(body.sessionId || "");
  } catch {
    sessionId = "";
  }
  if (!sessionId.startsWith("cs_")) {
    return NextResponse.json({ error: "Missing checkout session." }, { status: 400 });
  }

  try {
    await applyCheckoutSession(sessionId, gate.uid);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not confirm that checkout.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
