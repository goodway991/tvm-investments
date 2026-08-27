import { NextRequest, NextResponse } from "next/server";
import { requireSignedIn } from "@/lib/api-guard";
import { showTvm10Labs } from "@/lib/beta-labs";
import { getEntitlementForUid } from "@/lib/firebase/admin";
import type { BillingInterval, PaidPlanId, PlanId } from "@/lib/plans";
import {
  checkoutPlanAllowed,
  stripeConfigured,
  stripePriceId,
} from "@/lib/stripe";
import {
  changeSubscriptionPrice,
  periodEndUnix,
  resumeSubscription,
  scheduleCancel,
} from "@/lib/stripe-entitlements";

export const dynamic = "force-dynamic";

function planOf(value: unknown): PlanId {
  if (value === "free" || value === "ultra" || value === "pro") return value;
  return "pro";
}

function intervalOf(value: unknown): BillingInterval {
  return value === "yearly" ? "yearly" : "monthly";
}

export async function POST(request: NextRequest) {
  const gate = await requireSignedIn(request);
  if (!gate.ok) return gate.response;

  if (!stripeConfigured()) {
    return NextResponse.json(
      { error: "Billing is not available yet." },
      { status: 503 },
    );
  }

  let plan: PlanId = "pro";
  let interval: BillingInterval = "monthly";
  try {
    const body = (await request.json()) as { plan?: string; interval?: string };
    plan = planOf(body.plan);
    interval = intervalOf(body.interval);
  } catch {
    /* empty body */
  }

  const entitlement = await getEntitlementForUid(gate.uid);
  if (entitlement?.role === "admin") {
    return NextResponse.json(
      { error: "The admin account is already unlocked." },
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
    if (plan === "free") {
      const subscription = await scheduleCancel(
        gate.uid,
        entitlement.stripeSubscriptionId,
      );
      return NextResponse.json({
        ok: true,
        plan: entitlement.plan,
        cancelAtPeriodEnd: true,
        accessUntil: periodEndUnix(subscription),
      });
    }

    const paid = plan as PaidPlanId;
    if (!checkoutPlanAllowed(paid)) {
      return NextResponse.json(
        {
          error: showTvm10Labs()
            ? "That plan is not available."
            : "Ultra checkout stays on localhost until TVM 1.0 ships. Pro is available now.",
        },
        { status: 400 },
      );
    }

    if (entitlement.plan === paid && entitlement.stripeCancelAtPeriodEnd) {
      const subscription = await resumeSubscription(
        gate.uid,
        entitlement.stripeSubscriptionId,
      );
      return NextResponse.json({
        ok: true,
        plan: paid,
        cancelAtPeriodEnd: false,
        accessUntil: periodEndUnix(subscription),
      });
    }

    const priceId = stripePriceId(paid, interval);
    if (!priceId) {
      return NextResponse.json(
        { error: "That plan is not available yet." },
        { status: 503 },
      );
    }

    const updated = await changeSubscriptionPrice({
      subscriptionId: entitlement.stripeSubscriptionId,
      uid: gate.uid,
      plan: paid,
      priceId,
    });
    if (!updated) {
      return NextResponse.json(
        { error: "There is no active plan to change." },
        { status: 400 },
      );
    }
    return NextResponse.json({
      ok: true,
      plan: paid,
      cancelAtPeriodEnd: updated.cancel_at_period_end,
      accessUntil: periodEndUnix(updated),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not update that plan.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
