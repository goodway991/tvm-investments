import { NextRequest, NextResponse } from "next/server";
import { requireSignedIn } from "@/lib/api-guard";
import { getEntitlementForUid } from "@/lib/firebase/admin";
import { appOrigin, getStripe, stripeConfigured } from "@/lib/stripe";
import { periodLockedPortalConfigurationId } from "@/lib/stripe-entitlements";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const gate = await requireSignedIn(request);
  if (!gate.ok) return gate.response;

  if (!stripeConfigured()) {
    return NextResponse.json(
      { error: "Billing portal is not available yet." },
      { status: 503 },
    );
  }

  const entitlement = await getEntitlementForUid(gate.uid);
  if (!entitlement?.stripeCustomerId) {
    return NextResponse.json(
      { error: "No Stripe billing account is on file for this login." },
      { status: 400 },
    );
  }

  const stripe = getStripe();
  const configuration = await periodLockedPortalConfigurationId();
  const session = await stripe.billingPortal.sessions.create({
    customer: entitlement.stripeCustomerId,
    return_url: `${appOrigin(request)}/dashboard/settings`,
    configuration,
  });

  return NextResponse.json({ url: session.url });
}
