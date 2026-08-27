import { NextRequest, NextResponse } from "next/server";
import { requireSignedIn } from "@/lib/api-guard";
import { showTvm10Labs } from "@/lib/beta-labs";
import {
  appOrigin,
  checkoutPlanAllowed,
  getStripe,
  stripeConfigured,
  stripePriceId,
} from "@/lib/stripe";
import { getEntitlementForUid } from "@/lib/firebase/admin";
import { changeSubscriptionPrice } from "@/lib/stripe-entitlements";
import type { BillingInterval, PaidPlanId } from "@/lib/plans";

export const dynamic = "force-dynamic";

function paidPlan(value: unknown): PaidPlanId {
  return value === "ultra" ? "ultra" : "pro";
}

function intervalOf(value: unknown): BillingInterval {
  return value === "yearly" ? "yearly" : "monthly";
}

export async function POST(request: NextRequest) {
  const gate = await requireSignedIn(request);
  if (!gate.ok) return gate.response;

  if (!stripeConfigured()) {
    return NextResponse.json(
      { error: "Checkout is not available yet. Please try again later." },
      { status: 503 },
    );
  }

  let plan: PaidPlanId = "pro";
  let interval: BillingInterval = "monthly";
  try {
    const body = (await request.json()) as { interval?: string; plan?: string };
    plan = paidPlan(body.plan);
    interval = intervalOf(body.interval);
  } catch {
    /* empty body */
  }

  if (!checkoutPlanAllowed(plan)) {
    return NextResponse.json(
      {
        error: showTvm10Labs()
          ? "That plan is not available."
          : "Ultra checkout stays on localhost until TVM 1.0 ships. Pro is available now.",
      },
      { status: 400 },
    );
  }

  const priceId = stripePriceId(plan, interval);
  if (!priceId) {
    return NextResponse.json(
      { error: "Checkout is not available yet. Please try again later." },
      { status: 503 },
    );
  }

  const entitlement = await getEntitlementForUid(gate.uid);
  if (entitlement?.role === "admin") {
    return NextResponse.json(
      { error: "The admin account is already unlocked." },
      { status: 400 },
    );
  }

  const origin = appOrigin(request);
  const stripe = getStripe();

  if (entitlement?.source === "stripe" && entitlement.stripeSubscriptionId) {
    const updated = await changeSubscriptionPrice({
      subscriptionId: entitlement.stripeSubscriptionId,
      uid: gate.uid,
      plan,
      priceId,
    });
    if (updated) {
      return NextResponse.json({ url: `${origin}/dashboard?billing=success` });
    }
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${origin}/dashboard?billing=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/dashboard?billing=cancel`,
    client_reference_id: gate.uid,
    customer: entitlement?.stripeCustomerId || undefined,
    customer_email: entitlement?.stripeCustomerId ? undefined : gate.email || undefined,
    allow_promotion_codes: true,
    billing_address_collection: "auto",
    metadata: {
      firebaseUid: gate.uid,
      plan,
      interval,
    },
    subscription_data: {
      metadata: {
        firebaseUid: gate.uid,
        plan,
      },
    },
  });

  if (!session.url) {
    return NextResponse.json(
      { error: "Could not start checkout. Try again in a moment." },
      { status: 502 },
    );
  }

  return NextResponse.json({ url: session.url });
}
