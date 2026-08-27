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

export async function POST(request: NextRequest) {
  const secrets = [
    process.env.STRIPE_WEBHOOK_SECRET,
    process.env.STRIPE_WEBHOOK_SECRET_LOCAL,
  ].filter((value): value is string => Boolean(value));
  const signature = request.headers.get("stripe-signature");
  if (!secrets.length || !signature) {
    return NextResponse.json({ error: "Webhook is not configured." }, { status: 400 });
  }

  const stripe = getStripe();
  const payload = await request.text();
  let event: Stripe.Event | null = null;
  for (const secret of secrets) {
    try {
      event = stripe.webhooks.constructEvent(payload, signature, secret);
      break;
    } catch {
      /* try the other endpoint secret (live vs stripe listen) */
    }
  }
  if (!event) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
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
      default:
        break;
    }
  } catch (error) {
    console.error("Stripe webhook handler failed:", error);
    return NextResponse.json({ error: "Handler failed." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
