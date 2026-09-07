import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import {
  applyCheckoutSessionObject,
  applySubscription,
  clearPaidPlan,
} from "@/lib/stripe-entitlements";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Reject signed events older than this (replay protection). Stripe default is 300s. */
const WEBHOOK_TOLERANCE_SECONDS = (() => {
  const raw = Number(process.env.STRIPE_WEBHOOK_TOLERANCE_SECONDS);
  if (Number.isFinite(raw) && raw > 0 && raw <= 600) return Math.floor(raw);
  return 300;
})();

function webhookSecrets(): string[] {
  return [
    process.env.STRIPE_WEBHOOK_SECRET,
    process.env.STRIPE_WEBHOOK_SECRET_LOCAL,
  ].filter((value): value is string => Boolean(value?.trim()));
}

function isFreshEvent(event: Stripe.Event, nowSec = Math.floor(Date.now() / 1000)) {
  const age = nowSec - event.created;
  return age >= 0 && age <= WEBHOOK_TOLERANCE_SECONDS;
}

export async function POST(request: NextRequest) {
  const secrets = webhookSecrets();
  const signature = request.headers.get("stripe-signature");
  if (!secrets.length || !signature) {
    return NextResponse.json({ error: "Webhook is not configured." }, { status: 400 });
  }

  // Verify signature + header timestamp BEFORE any entitlement writes.
  const stripe = getStripe();
  const payload = await request.text();
  let event: Stripe.Event | null = null;
  for (const secret of secrets) {
    try {
      event = stripe.webhooks.constructEvent(
        payload,
        signature,
        secret,
        WEBHOOK_TOLERANCE_SECONDS,
      );
      break;
    } catch {
      /* try the other endpoint secret (live vs stripe listen) */
    }
  }
  if (!event) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  // Belt-and-suspenders: reject stale events even if the SDK path changes.
  if (!isFreshEvent(event)) {
    return NextResponse.json({ error: "Event too old." }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await applyCheckoutSessionObject(session);
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.created": {
        await applySubscription(event.data.object as Stripe.Subscription);
        break;
      }
      case "customer.subscription.deleted": {
        await clearPaidPlan(event.data.object as Stripe.Subscription);
        break;
      }
      case "subscription_schedule.updated":
      case "subscription_schedule.released":
      case "subscription_schedule.completed": {
        const schedule = event.data.object as Stripe.SubscriptionSchedule;
        const subscriptionId =
          typeof schedule.subscription === "string"
            ? schedule.subscription
            : schedule.subscription?.id;
        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          await applySubscription(subscription);
        }
        break;
      }
      default:
        break;
    }
  } catch (error) {
    console.error("Stripe webhook handler failed:", error);
    return NextResponse.json({ error: "Handler failed." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
