"use client";

import { useState } from "react";
import { authedFetch } from "@/lib/authed-fetch";
import { showTvm10Labs } from "@/lib/beta-labs";
import { ProGlowText } from "@/components/ProGlowText";
import { UltraShinePhrase } from "@/components/UltraText";
import {
  priceFor,
  yearlySavingsPercent,
  type BillingInterval,
  type PaidPlanId,
} from "@/lib/plans";

export function stripePricingTableConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
}

const PRO_FEATURES = [
  "Separate short- & long-term lists",
  "Richer culture write-ups",
  "100-name watchlist",
  "Full backtests",
];

const ULTRA_FEATURES = [
  "Everything in Pro",
  "Horizon suite & morning brief",
  "500-name watchlist",
  "Ultra desk tools",
];

export function StripePricingTable({
  clientReferenceId: _clientReferenceId,
  customerEmail: _customerEmail,
  className = "",
}: {
  clientReferenceId?: string;
  customerEmail?: string;
  className?: string;
}) {
  const showUltra = showTvm10Labs();
  const [interval, setInterval] = useState<BillingInterval>("monthly");
  const [loadingPlan, setLoadingPlan] = useState<PaidPlanId | null>(null);
  const [error, setError] = useState("");
  const ultraSave = yearlySavingsPercent("ultra");
  const proSave = yearlySavingsPercent("pro");

  async function checkout(plan: PaidPlanId) {
    setError("");
    setLoadingPlan(plan);
    try {
      const response = await authedFetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interval, plan }),
      });
      const payload = (await response.json()) as { url?: string; error?: string };
      if (payload.url) {
        window.location.href = payload.url;
        return;
      }
      setError(payload.error || "Checkout is not available yet.");
    } catch {
      setError("Could not start checkout. Try again in a moment.");
    } finally {
      setLoadingPlan(null);
    }
  }

  return (
    <div className={`stripe-checkout-plans ${className}`.trim()}>
      <div className="stripe-checkout-toggle-wrap">
        <div className="stripe-checkout-toggle" role="tablist" aria-label="Billing interval">
        {(
          [
            ["monthly", "Monthly"],
            ["yearly", "Yearly"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={interval === value}
            onClick={() => setInterval(value)}
            className={`stripe-checkout-toggle-btn ${interval === value ? "is-active" : ""}`}
          >
            {label}
            {value === "yearly" ? (
              <span className="stripe-checkout-save">Save up to {ultraSave}%</span>
            ) : null}
          </button>
        ))}
        </div>
      </div>

      <div className={`stripe-checkout-grid ${showUltra ? "stripe-checkout-grid--dual" : ""}`}>
        <PlanCard
          plan="pro"
          interval={interval}
          savePercent={proSave}
          features={PRO_FEATURES}
          loading={loadingPlan === "pro"}
          onCheckout={() => void checkout("pro")}
        />
        {showUltra ? (
          <PlanCard
            plan="ultra"
            interval={interval}
            savePercent={ultraSave}
            features={ULTRA_FEATURES}
            recommended
            loading={loadingPlan === "ultra"}
            onCheckout={() => void checkout("ultra")}
          />
        ) : null}
      </div>

      {error ? (
        <p className="mt-4 rounded-2xl bg-coral/10 px-4 py-3 text-sm text-coral" role="alert">
          {error}
        </p>
      ) : null}

      <p className="stripe-checkout-footnote">
        Secure checkout by Stripe · Tax calculated at checkout · Add a promo code on the Stripe page
      </p>
    </div>
  );
}

function PlanCard({
  plan,
  interval,
  savePercent,
  features,
  recommended = false,
  loading,
  onCheckout,
}: {
  plan: PaidPlanId;
  interval: BillingInterval;
  savePercent: number;
  features: string[];
  recommended?: boolean;
  loading: boolean;
  onCheckout: () => void;
}) {
  const price = priceFor(plan, interval);
  const isUltra = plan === "ultra";

  return (
    <article
      className={`stripe-plan-card ${recommended ? "stripe-plan-card--recommended" : ""} ${
        isUltra ? "stripe-plan-card--ultra" : "stripe-plan-card--pro"
      }`}
    >
      {recommended ? (
        <span className="stripe-plan-badge">Recommended</span>
      ) : null}

      <header className="stripe-plan-header">
        <h3 className="stripe-plan-name">
          {isUltra ? <UltraShinePhrase>TVM Ultra</UltraShinePhrase> : <ProGlowText>TVM Pro</ProGlowText>}
        </h3>
        <p className="stripe-plan-price">
          <span className="stripe-plan-amount">${price.perMonth}</span>
          <span className="stripe-plan-period">/mo</span>
        </p>
        <p className="stripe-plan-billed">
          {interval === "yearly" ? (
            <>
              ${price.billed} billed yearly
              <span className="stripe-plan-save-inline"> · save {savePercent}%</span>
            </>
          ) : (
            <>${price.billed} billed monthly</>
          )}
        </p>
      </header>

      <ul className="stripe-plan-features">
        {features.map((feature) => (
          <li key={feature}>{feature}</li>
        ))}
      </ul>

      <button
        type="button"
        disabled={loading}
        onClick={onCheckout}
        className={`stripe-plan-cta ${isUltra ? "stripe-plan-cta--ultra" : "stripe-plan-cta--pro"}`}
      >
        {loading ? "Opening Stripe…" : isUltra ? "Subscribe to Ultra" : "Subscribe to Pro"}
      </button>
    </article>
  );
}
