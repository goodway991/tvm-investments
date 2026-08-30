import { NextRequest, NextResponse } from "next/server";
import { requireSignedIn } from "@/lib/api-guard";
import { clearStaleStripeBilling, getEntitlementForUid } from "@/lib/firebase/admin";
import { appOrigin, getStripe, stripeConfigured } from "@/lib/stripe";
import {
  checkoutCustomerFields,
  isStripeResourceMissing,
  periodLockedPortalConfigurationId,
} from "@/lib/stripe-entitlements";

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
  const customerFields = await checkoutCustomerFields(
    stripe,
    entitlement.stripeCustomerId,
    gate.email || undefined,
  );
  if (!customerFields.customer) {
    await clearStaleStripeBilling(gate.uid);
    return NextResponse.json(
      { error: "No Stripe billing account is on file for this login." },
      { status: 400 },
    );
  }

  try {
    const configuration = await periodLockedPortalConfigurationId();
    const session = await stripe.billingPortal.sessions.create({
      customer: customerFields.customer,
      return_url: `${appOrigin(request)}/dashboard/settings`,
      configuration,
    });
    return NextResponse.json({ url: session.url });
  } catch (error) {
    if (isStripeResourceMissing(error)) {
      await clearStaleStripeBilling(gate.uid);
      return NextResponse.json(
        { error: "No Stripe billing account is on file for this login." },
        { status: 400 },
      );
    }
    console.error("[stripe/portal] session create failed", error);
    return NextResponse.json(
      { error: "Billing portal is not available yet." },
      { status: 502 },
    );
  }
}
