import "server-only";
import type Stripe from "stripe";
import {
  applyStripeEntitlement,
} from "@/lib/firebase/admin";
import { getStripe, planFromPriceId } from "@/lib/stripe";
import type { PaidPlanId } from "@/lib/plans";

function uidFrom(metadata?: Stripe.Metadata | null, fallback?: string | null) {
  return metadata?.firebaseUid || fallback || "";
}

function customerId(value: string | Stripe.Customer | Stripe.DeletedCustomer | null) {
  if (!value) return "";
  return typeof value === "string" ? value : value.id;
}

function priceIdFromSubscription(subscription: Stripe.Subscription) {
  const item = subscription.items.data[0];
  const price = item?.price;
  return typeof price === "string" ? price : price?.id;
}

function paidStatus(status: Stripe.Subscription.Status) {
  return status === "active" || status === "trialing" || status === "past_due";
}

export function periodEndUnix(subscription: Stripe.Subscription) {
  return (
    subscription.items.data[0]?.current_period_end ||
    subscription.cancel_at ||
    0
  );
}

export async function applySubscription(subscription: Stripe.Subscription) {
  const uid = uidFrom(subscription.metadata);
  if (!uid) return;
  const customer = customerId(subscription.customer);
  if (!paidStatus(subscription.status)) {
    await applyStripeEntitlement({
      uid,
      plan: "free",
      stripeCustomerId: customer,
      stripeSubscriptionId: subscription.id,
    });
    return;
  }
  const plan =
    (subscription.metadata?.plan === "ultra" ? "ultra" : null) ||
    planFromPriceId(priceIdFromSubscription(subscription)) ||
    "pro";
  await applyStripeEntitlement({
    uid,
    plan,
    stripeCustomerId: customer,
    stripeSubscriptionId: subscription.id,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    accessUntil: periodEndUnix(subscription),
  });
}

export async function clearPaidPlan(subscription: Stripe.Subscription) {
  const uid = uidFrom(subscription.metadata);
  if (!uid) return;
  await applyStripeEntitlement({
    uid,
    plan: "free",
    stripeCustomerId: customerId(subscription.customer),
    stripeSubscriptionId: subscription.id,
  });
}

export async function applyCheckoutSessionObject(session: Stripe.Checkout.Session) {
  const uid = uidFrom(session.metadata, session.client_reference_id);
  if (!uid) return;
  if (session.mode !== "subscription" || session.payment_status === "unpaid") return;

  const stripe = getStripe();
  const subscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id;
  if (subscriptionId) {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    if (!subscription.metadata?.firebaseUid) {
      await stripe.subscriptions.update(subscriptionId, {
        metadata: {
          ...subscription.metadata,
          firebaseUid: uid,
          plan: session.metadata?.plan || subscription.metadata?.plan || "pro",
        },
      });
    }
    await applySubscription({
      ...subscription,
      metadata: {
        ...subscription.metadata,
        firebaseUid: uid,
        plan: session.metadata?.plan || subscription.metadata?.plan || "pro",
      },
    });
    return;
  }

  const plan = (session.metadata?.plan === "ultra" ? "ultra" : "pro") as PaidPlanId;
  await applyStripeEntitlement({
    uid,
    plan,
    stripeCustomerId: customerId(session.customer),
    stripeSubscriptionId: "",
  });
}

export async function changeSubscriptionPrice(input: {
  subscriptionId: string;
  uid: string;
  plan: PaidPlanId;
  priceId: string;
}) {
  const stripe = getStripe();
  const subscription = await stripe.subscriptions.retrieve(input.subscriptionId);
  const owner = uidFrom(subscription.metadata);
  if (owner && owner !== input.uid) {
    throw new Error("That subscription does not belong to this account.");
  }
  if (!paidStatus(subscription.status)) return null;

  const currentPrice = priceIdFromSubscription(subscription);
  if (currentPrice === input.priceId) {
    if (subscription.cancel_at_period_end) {
      const resumed = await stripe.subscriptions.update(input.subscriptionId, {
        cancel_at_period_end: false,
        metadata: {
          ...subscription.metadata,
          firebaseUid: input.uid,
          plan: input.plan,
        },
      });
      await applySubscription(resumed);
      return resumed;
    }
    await applySubscription({
      ...subscription,
      metadata: {
        ...subscription.metadata,
        firebaseUid: input.uid,
        plan: input.plan,
      },
    });
    return subscription;
  }

  const itemId = subscription.items.data[0]?.id;
  if (!itemId) throw new Error("Could not update that subscription.");

  const updated = await stripe.subscriptions.update(input.subscriptionId, {
    items: [{ id: itemId, price: input.priceId }],
    cancel_at_period_end: false,
    metadata: {
      ...subscription.metadata,
      firebaseUid: input.uid,
      plan: input.plan,
    },
    proration_behavior: "create_prorations",
  });
  await applySubscription(updated);
  return updated;
}

export async function scheduleCancel(uid: string, subscriptionId: string) {
  const stripe = getStripe();
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const owner = uidFrom(subscription.metadata);
  if (owner && owner !== uid) {
    throw new Error("That subscription does not belong to this account.");
  }
  if (!paidStatus(subscription.status)) {
    throw new Error("There is no active plan to cancel.");
  }
  if (subscription.cancel_at_period_end) return subscription;
  const updated = await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  });
  await applySubscription(updated);
  return updated;
}

export async function resumeSubscription(uid: string, subscriptionId: string) {
  const stripe = getStripe();
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const owner = uidFrom(subscription.metadata);
  if (owner && owner !== uid) {
    throw new Error("That subscription does not belong to this account.");
  }
  if (!paidStatus(subscription.status)) {
    throw new Error("There is no active plan to keep.");
  }
  if (!subscription.cancel_at_period_end) return subscription;
  const updated = await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: false,
  });
  await applySubscription(updated);
  return updated;
}

export async function applyCheckoutSession(sessionId: string, uid: string) {
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  const sessionUid = uidFrom(session.metadata, session.client_reference_id);
  if (sessionUid !== uid) {
    throw new Error("That checkout does not belong to this account.");
  }
  if (session.status === "expired") {
    throw new Error("That checkout expired.");
  }
  await applyCheckoutSessionObject(session);
}
