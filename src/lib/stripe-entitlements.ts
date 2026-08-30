import "server-only";
import type Stripe from "stripe";
import {
  applyStripeEntitlement,
  admitBetaTester,
} from "@/lib/firebase/admin";
import { getStripe, planFromPriceId } from "@/lib/stripe";
import { isWithinRefundGrace, REFUND_GRACE_DAYS } from "@/lib/refund-policy";
import type { PaidPlanId } from "@/lib/plans";

function uidFrom(metadata?: Stripe.Metadata | null, fallback?: string | null) {
  return metadata?.firebaseUid || fallback || "";
}

function customerId(value: string | Stripe.Customer | Stripe.DeletedCustomer | null) {
  if (!value) return "";
  return typeof value === "string" ? value : value.id;
}

export function isStripeResourceMissing(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const stripeError = error as Stripe.errors.StripeError;
  if (stripeError.code === "resource_missing") return true;
  const message = stripeError.message || "";
  return /no such (customer|price|subscription)/i.test(message);
}

/** Reuse a saved customer only if it exists in the connected Stripe account. */
export async function checkoutCustomerFields(
  stripe: ReturnType<typeof getStripe>,
  customerId: string | undefined,
  email: string | undefined,
): Promise<{ customer?: string; customer_email?: string }> {
  if (!customerId) {
    return email ? { customer_email: email } : {};
  }
  try {
    const customer = await stripe.customers.retrieve(customerId);
    if ("deleted" in customer && customer.deleted) {
      return email ? { customer_email: email } : {};
    }
    return { customer: customerId };
  } catch (error) {
    if (isStripeResourceMissing(error)) {
      return email ? { customer_email: email } : {};
    }
    throw error;
  }
}

function priceIdFromSubscription(subscription: Stripe.Subscription) {
  const item = subscription.items.data[0];
  const price = item?.price;
  return typeof price === "string" ? price : price?.id;
}

function paidStatus(status: Stripe.Subscription.Status) {
  return status === "active" || status === "trialing" || status === "past_due";
}

function scheduleIdOf(subscription: Stripe.Subscription) {
  const value = subscription.schedule;
  if (!value) return "";
  return typeof value === "string" ? value : value.id;
}

function priceIdFromPhase(
  phase: Stripe.SubscriptionSchedule.Phase | undefined,
) {
  const price = phase?.items[0]?.price;
  if (!price) return "";
  return typeof price === "string" ? price : price.id;
}

export function periodEndUnix(subscription: Stripe.Subscription) {
  return (
    subscription.items.data[0]?.current_period_end ||
    subscription.cancel_at ||
    0
  );
}

async function pendingChange(subscription: Stripe.Subscription) {
  const scheduleId = scheduleIdOf(subscription);
  if (!scheduleId) return { plan: null as PaidPlanId | null, until: 0 };
  const stripe = getStripe();
  try {
    const schedule = await stripe.subscriptionSchedules.retrieve(scheduleId);
    if (schedule.status !== "active" && schedule.status !== "not_started") {
      return { plan: null as PaidPlanId | null, until: 0 };
    }
    if (schedule.phases.length < 2) {
      return { plan: null as PaidPlanId | null, until: 0 };
    }
    const nextPrice = priceIdFromPhase(schedule.phases[schedule.phases.length - 1]);
    const currentPrice = priceIdFromSubscription(subscription);
    const nextPlan = planFromPriceId(nextPrice);
    if (!nextPlan || nextPrice === currentPrice) {
      return { plan: null as PaidPlanId | null, until: 0 };
    }
    return {
      plan: nextPlan,
      until: schedule.phases[0]?.end_date || periodEndUnix(subscription),
    };
  } catch {
    return { plan: null as PaidPlanId | null, until: 0 };
  }
}

async function releaseScheduleIfAny(subscription: Stripe.Subscription) {
  const scheduleId = scheduleIdOf(subscription);
  if (!scheduleId) return subscription;
  const stripe = getStripe();
  try {
    await stripe.subscriptionSchedules.release(scheduleId);
  } catch {
    /* already released */
  }
  return stripe.subscriptions.retrieve(subscription.id) as Promise<Stripe.Subscription>;
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
  const pending = await pendingChange(subscription);
  const plan =
    planFromPriceId(priceIdFromSubscription(subscription)) ||
    (subscription.metadata?.plan === "ultra" ? "ultra" : null) ||
    "pro";
  await applyStripeEntitlement({
    uid,
    plan,
    stripeCustomerId: customer,
    stripeSubscriptionId: subscription.id,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    accessUntil: periodEndUnix(subscription),
    pendingPlan: pending.plan || undefined,
    pendingUntil: pending.until || undefined,
  });
  await admitBetaTester(uid);
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

/** Ends Stripe billing immediately. Refunds stay in the Stripe Dashboard. */
export async function cancelSubscriptionNow(subscriptionId: string) {
  const id = subscriptionId.trim();
  if (!id) return;
  const stripe = getStripe();
  try {
    await stripe.subscriptions.cancel(id);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (!/no such subscription|already been canceled|resource_missing/i.test(message)) {
      throw error;
    }
  }
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
  await admitBetaTester(uid);
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
    let current: Stripe.Subscription = subscription;
    if (scheduleIdOf(current)) {
      current = await releaseScheduleIfAny(current);
    }
    if (current.cancel_at_period_end) {
      current = await stripe.subscriptions.update(current.id, {
        cancel_at_period_end: false,
        metadata: {
          ...current.metadata,
          firebaseUid: input.uid,
          plan: input.plan,
        },
      });
    }
    await applySubscription(current);
    return current;
  }

  let current: Stripe.Subscription = subscription;
  if (current.cancel_at_period_end) {
    current = await stripe.subscriptions.update(current.id, {
      cancel_at_period_end: false,
    });
  }

  let scheduleId = scheduleIdOf(current);
  if (!scheduleId) {
    const created = await stripe.subscriptionSchedules.create({
      from_subscription: current.id,
    });
    scheduleId = created.id;
  }

  const schedule = await stripe.subscriptionSchedules.retrieve(scheduleId);
  const startDate = schedule.phases[0]?.start_date;
  const endDate = periodEndUnix(current);
  if (!startDate || !endDate || !currentPrice) {
    throw new Error("Could not schedule that plan change.");
  }

  await stripe.subscriptionSchedules.update(scheduleId, {
    end_behavior: "release",
    phases: [
      {
        items: [{ price: currentPrice, quantity: 1 }],
        start_date: startDate,
        end_date: endDate,
        proration_behavior: "none",
      },
      {
        items: [{ price: input.priceId, quantity: 1 }],
        start_date: endDate,
        proration_behavior: "none",
        metadata: {
          firebaseUid: input.uid,
          plan: input.plan,
        },
      },
    ],
    metadata: {
      firebaseUid: input.uid,
      pendingPlan: input.plan,
    },
  });

  const scheduled = await stripe.subscriptions.retrieve(current.id);
  await applySubscription(scheduled);
  return scheduled;
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
  let current: Stripe.Subscription = subscription;
  if (scheduleIdOf(current)) {
    current = await releaseScheduleIfAny(current);
  }
  if (current.cancel_at_period_end) return current;
  const updated = await stripe.subscriptions.update(current.id, {
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
  let current: Stripe.Subscription = subscription;
  if (scheduleIdOf(current)) {
    current = await releaseScheduleIfAny(current);
  }
  if (!current.cancel_at_period_end) {
    await applySubscription(current);
    return current;
  }
  const updated = await stripe.subscriptions.update(current.id, {
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

export async function refundLatestCharge(uid: string, subscriptionId: string) {
  const stripe = getStripe();
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const owner = uidFrom(subscription.metadata);
  if (owner && owner !== uid) {
    throw new Error("That subscription does not belong to this account.");
  }
  if (!paidStatus(subscription.status) && subscription.status !== "canceled") {
    throw new Error("There is no paid charge to refund.");
  }

  const invoices = await stripe.invoices.list({
    subscription: subscriptionId,
    status: "paid",
    limit: 5,
  });
  const invoice = invoices.data[0];
  if (!invoice) {
    throw new Error("No paid invoice was found for this plan.");
  }
  const paidAt = invoice.status_transitions?.paid_at || invoice.created;
  if (!isWithinRefundGrace(paidAt)) {
    throw new Error(
      `The ${REFUND_GRACE_DAYS}-day refund window has closed. Cancel auto-renew to stop the next charge.`,
    );
  }

  const payments = await stripe.invoicePayments.list({
    invoice: invoice.id,
    status: "paid",
    limit: 5,
  });
  const payment = payments.data[0];
  const paymentIntent =
    typeof payment?.payment.payment_intent === "string"
      ? payment.payment.payment_intent
      : payment?.payment.payment_intent?.id;
  const charge =
    typeof payment?.payment.charge === "string"
      ? payment.payment.charge
      : payment?.payment.charge?.id;
  if (!paymentIntent && !charge) {
    throw new Error("Could not find the payment to refund.");
  }
  try {
    await stripe.refunds.create({
      ...(paymentIntent ? { payment_intent: paymentIntent } : { charge }),
      reason: "requested_by_customer",
    });
  } catch (error) {
    const text = error instanceof Error ? error.message : "";
    if (!/already been refunded|charge_already_refunded/i.test(text)) {
      throw error;
    }
  }

  if (subscription.status !== "canceled") {
    await stripe.subscriptions.cancel(subscriptionId);
  }
  await applyStripeEntitlement({
    uid,
    plan: "free",
    stripeCustomerId: customerId(subscription.customer),
    stripeSubscriptionId: subscriptionId,
  });
}

const PORTAL_HEADLINE = "TVM Investments billing";

export async function periodLockedPortalConfigurationId() {
  const stripe = getStripe();
  const listed = await stripe.billingPortal.configurations.list({
    active: true,
    limit: 20,
  });
  const existing = listed.data.find(
    (item) => item.business_profile?.headline === PORTAL_HEADLINE,
  );
  const features: Stripe.BillingPortal.ConfigurationCreateParams.Features = {
    customer_update: {
      enabled: true,
      allowed_updates: ["email", "address"],
    },
    invoice_history: { enabled: true },
    payment_method_update: { enabled: true },
    subscription_cancel: {
      enabled: true,
      mode: "at_period_end",
      proration_behavior: "none",
    },
    subscription_update: { enabled: false },
  };
  const business_profile = {
    headline: PORTAL_HEADLINE,
    privacy_policy_url: "https://tvminvest.com/privacy",
    terms_of_service_url: "https://tvminvest.com/terms",
  };
  if (existing) {
    if (existing.features.subscription_update?.enabled) {
      await stripe.billingPortal.configurations.update(existing.id, {
        features: { subscription_update: { enabled: false } },
      });
    }
    return existing.id;
  }
  const created = await stripe.billingPortal.configurations.create({
    business_profile,
    features,
  });
  return created.id;
}
