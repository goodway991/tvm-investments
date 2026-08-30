import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { requireAdmittedBeta, requireSignedIn } from "@/lib/api-guard";
import {
  appOrigin,
  checkoutPlanAllowed,
  getStripe,
  stripeConfigured,
  stripePriceId,
} from "@/lib/stripe";
import { clearStaleStripeBilling, getEntitlementForUid } from "@/lib/firebase/admin";
import {
  changeSubscriptionPrice,
  checkoutCustomerFields,
  isStripeResourceMissing,
} from "@/lib/stripe-entitlements";
import { REFUND_POLICY_CHECKOUT } from "@/lib/refund-policy";
import type { BillingInterval, PaidPlanId } from "@/lib/plans";

export const dynamic = "force-dynamic";

function paidPlan(value: unknown): PaidPlanId {
  return value === "ultra" ? "ultra" : "pro";
}

function intervalOf(value: unknown): BillingInterval {
  return value === "yearly" ? "yearly" : "monthly";
}

function checkoutSessionParams(input: {
  origin: string;
  uid: string;
  email: string | undefined;
  plan: PaidPlanId;
  interval: BillingInterval;
  priceId: string;
  customer?: string;
  customer_email?: string;
}): Stripe.Checkout.SessionCreateParams {
  return {
    mode: "subscription",
    line_items: [{ price: input.priceId, quantity: 1 }],
    success_url: `${input.origin}/dashboard?billing=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${input.origin}/dashboard?billing=cancel`,
    client_reference_id: input.uid,
    customer: input.customer,
    customer_email: input.customer ? undefined : input.customer_email,
    allow_promotion_codes: true,
    billing_address_collection: "required",
    custom_text: {
      submit: {
        message: REFUND_POLICY_CHECKOUT,
      },
    },
    metadata: {
      firebaseUid: input.uid,
      plan: input.plan,
      interval: input.interval,
    },
    subscription_data: {
      metadata: {
        firebaseUid: input.uid,
        plan: input.plan,
      },
    },
    managed_payments: { enabled: true },
  };
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
        error: "That plan is not available.",
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

  const admitted = await requireAdmittedBeta(gate.uid, gate.email);
  if (!admitted.ok) return admitted.response;

  let entitlement = await getEntitlementForUid(gate.uid);
  if (entitlement?.role === "admin") {
    return NextResponse.json(
      { error: "The admin account is already unlocked." },
      { status: 400 },
    );
  }

  const origin = appOrigin(request);
  const stripe = getStripe();

  if (entitlement?.source === "stripe" && entitlement.stripeSubscriptionId) {
    try {
      const updated = await changeSubscriptionPrice({
        subscriptionId: entitlement.stripeSubscriptionId,
        uid: gate.uid,
        plan,
        priceId,
      });
      if (updated) {
        const latest = await getEntitlementForUid(gate.uid);
        return NextResponse.json({
          url: `${origin}/dashboard?billing=success`,
          scheduled: true,
          pendingPlan: latest?.stripePendingPlan || plan,
          pendingUntil: latest?.stripePendingUntil || 0,
        });
      }
    } catch (error) {
      if (isStripeResourceMissing(error)) {
        await clearStaleStripeBilling(gate.uid);
        entitlement = await getEntitlementForUid(gate.uid);
      } else {
        console.error("[stripe/checkout] plan change failed", error);
        return NextResponse.json(
          { error: "Could not start checkout. Try again in a moment." },
          { status: 502 },
        );
      }
    }
  }

  let customerFields = await checkoutCustomerFields(
    stripe,
    entitlement?.stripeCustomerId,
    gate.email || undefined,
  );
  if (
    entitlement?.stripeCustomerId &&
    !customerFields.customer &&
    customerFields.customer_email
  ) {
    await clearStaleStripeBilling(gate.uid);
  }

  try {
    const session = await stripe.checkout.sessions.create(
      checkoutSessionParams({
        origin,
        uid: gate.uid,
        email: gate.email || undefined,
        plan,
        interval,
        priceId,
        ...customerFields,
      }),
    );

    if (!session.url) {
      return NextResponse.json(
        { error: "Could not start checkout. Try again in a moment." },
        { status: 502 },
      );
    }

    return NextResponse.json({ url: session.url });
  } catch (error) {
    if (
      isStripeResourceMissing(error) &&
      entitlement?.stripeCustomerId &&
      customerFields.customer
    ) {
      await clearStaleStripeBilling(gate.uid);
      customerFields = { customer_email: gate.email || undefined };
      try {
        const session = await stripe.checkout.sessions.create(
          checkoutSessionParams({
            origin,
            uid: gate.uid,
            email: gate.email || undefined,
            plan,
            interval,
            priceId,
            ...customerFields,
          }),
        );
        if (session.url) {
          return NextResponse.json({ url: session.url });
        }
      } catch (retryError) {
        console.error("[stripe/checkout] retry failed", retryError);
      }
    }

    console.error("[stripe/checkout] session create failed", error);
    if (isStripeResourceMissing(error)) {
      return NextResponse.json(
        { error: "Checkout is not available yet. Please try again later." },
        { status: 503 },
      );
    }
    return NextResponse.json(
      { error: "Could not start checkout. Try again in a moment." },
      { status: 502 },
    );
  }
}
