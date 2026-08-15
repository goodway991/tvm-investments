"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { OverlaySheet } from "@/components/OverlaySheet";
import { PlanComparisonTable } from "@/components/PlanComparisonTable";
import { TVMIcon } from "@/components/TVMBrand";
import { PLAN_PRICES, yearlySavingsPercent, type BillingInterval } from "@/lib/plans";
import { ProGlowText } from "@/components/ProGlowText";

export function UpgradeModal({ onClose }: { onClose: () => void }) {
  const { user, entitlement } = useAuth();
  const [billing, setBilling] = useState<BillingInterval>("monthly");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const price = PLAN_PRICES[billing];
  const alreadyPro = entitlement.plan === "pro";
  const savePercent = yearlySavingsPercent();

  async function startCheckout() {
    setError("");
    setLoading(true);
    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interval: billing }),
      });
      const payload = (await response.json()) as { url?: string; error?: string };
      if (payload.url) {
        window.location.href = payload.url;
        return;
      }
      setError(
        payload.error ||
          "Checkout is not available yet. Please try again later.",
      );
    } catch {
      setError("Could not start checkout. Try again in a moment.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <OverlaySheet
      labelledBy="upgrade-title"
      onClose={onClose}
      variant="card"
      headerClassName="px-5 pt-8 sm:px-8 sm:pt-10"
      footerClassName="px-5 pb-4 sm:px-8 sm:pb-4"
      header={
        <div>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-violet">
                Your plan
              </p>
              <h2 id="upgrade-title" className="mt-1 font-display text-3xl font-bold text-ink">
                {alreadyPro ? "Your plan" : <ProGlowText>Free vs Pro</ProGlowText>}
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-soft">
                <ProGlowText>
                  Pro unlocks separate short-term and long-term lists, richer culture
                  write-ups, larger watchlists, and full backtests.
                </ProGlowText>
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex shrink-0 items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold text-ink-soft hover:bg-violet/10 hover:text-violet"
            >
              <TVMIcon name="close" size={16} />
              Close
            </button>
          </div>

          <div className="mt-6 mb-2 flex flex-wrap items-center justify-center gap-2">
            {(
              [
                ["monthly", "Monthly"],
                ["yearly", "Yearly"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setBilling(value)}
                className={`relative rounded-full px-5 py-2 text-sm font-semibold transition-all ${
                  billing === value
                    ? "glass-violet text-white"
                    : "bg-white/60 text-ink-soft hover:text-ink"
                }`}
              >
                {label}
                {value === "yearly" ? (
                  <span className="absolute -bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-coral px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                    Save {savePercent}%
                  </span>
                ) : null}
              </button>
            ))}
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
            <div>
              <p className="font-display text-3xl font-bold text-ink">
                ${price.perMonth}
                <span className="text-lg font-medium text-ink-soft">/mo</span>
              </p>
              <p className="mt-1 text-sm text-ink-soft">
                {billing === "yearly"
                  ? `$${PLAN_PRICES.yearly.billed} billed once a year · $${PLAN_PRICES.yearly.perMonth}/month effective`
                  : `$${PLAN_PRICES.monthly.billed} billed each month`}
              </p>
            </div>

            {alreadyPro ? (
              <p className="glass-violet rounded-full px-6 py-3 text-center text-sm font-semibold text-white">
                Currently on <ProGlowText>Pro</ProGlowText>
              </p>
            ) : user ? (
              <button
                type="button"
                onClick={startCheckout}
                disabled={loading}
                className="glass-violet rounded-full px-7 py-3.5 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5 disabled:opacity-60"
              >
                {loading ? "Opening Stripe…" : <ProGlowText>Upgrade to Pro</ProGlowText>}
              </button>
            ) : (
              <Link
                href="/login"
                onClick={onClose}
                className="glass-violet rounded-full px-7 py-3.5 text-center text-sm font-semibold text-white transition-transform hover:-translate-y-0.5"
              >
                Log in to upgrade
              </Link>
            )}
          </div>

          {error ? (
            <p className="mt-4 rounded-2xl bg-coral/10 px-4 py-3 text-sm text-coral" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      }
      footer={
        <p className="text-[11px] leading-relaxed text-ink-soft">
          Secure checkout is powered by Stripe. Cancel anytime.
        </p>
      }
    >
      <PlanComparisonTable currentPlan={entitlement.plan} />
    </OverlaySheet>
  );
}
