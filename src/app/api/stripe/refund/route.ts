import { NextRequest, NextResponse } from "next/server";
import { requireSignedIn } from "@/lib/api-guard";
import { getEntitlementForUid } from "@/lib/firebase/admin";
import { stripeConfigured } from "@/lib/stripe";
import { refundLatestCharge } from "@/lib/stripe-entitlements";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const gate = await requireSignedIn(request);
  if (!gate.ok) return gate.response;

  if (!stripeConfigured()) {
    return NextResponse.json(
      { error: "Billing is not available yet." },
      { status: 503 },
    );
  }

  const entitlement = await getEntitlementForUid(gate.uid);
  if (entitlement?.role === "admin") {
    return NextResponse.json(
      { error: "The admin account is not billed." },
      { status: 400 },
    );
  }
  if (entitlement?.source !== "stripe" || !entitlement.stripeSubscriptionId) {
    return NextResponse.json(
      { error: "No billed plan is on file for this login." },
      { status: 400 },
    );
  }

  try {
    await refundLatestCharge(gate.uid, entitlement.stripeSubscriptionId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not issue that refund.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
