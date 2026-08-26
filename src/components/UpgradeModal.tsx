"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { OverlaySheet } from "@/components/OverlaySheet";
import { PlanComparisonTable } from "@/components/PlanComparisonTable";
import { TVMIcon } from "@/components/TVMBrand";
import { showTvm10Labs } from "@/lib/beta-labs";
import {
  priceFor,
  yearlySavingsPercent,
  type BillingInterval,
  type PaidPlanId,
} from "@/lib/plans";
import { ProGlowText } from "@/components/ProGlowText";
import { UltraShinePhrase } from "@/components/UltraText";
import { authedFetch } from "@/lib/authed-fetch";

export function UpgradeModal({ onClose }: { onClose: () => void }) {
  const { user, entitlement } = useAuth();
  const showUltra = showTvm10Labs();
  const alreadyPro = entitlement.plan === "pro";
  const alreadyUltra = entitlement.plan === "ultra";
  const [pickedPlan, setPickedPlan] = useState<PaidPlanId>(
    alreadyUltra ? "ultra" : "pro",
  );
  const [billing, setBilling] = useState<BillingInterval>("monthly");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const price = priceFor(pickedPlan, billing);
  const savePercent = yearlySavingsPercent(pickedPlan);
  const glowClass =
    pickedPlan === "ultra" ? "ultra-profile-glow-move" : "pro-profile-glow-move";

  async function startCheckout() {
    setError("");
    setLoading(true);
    try {
      const response = await authedFetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interval: billing, plan: pickedPlan }),
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
                {alreadyUltra ? (
                  <UltraShinePhrase>Your plan</UltraShinePhrase>
                ) : alreadyPro ? (
                  "Your plan"
                ) : showUltra ? (
                  <ProGlowText>Pick a plan</ProGlowText>
                ) : (
                  <ProGlowText>Free vs Pro</ProGlowText>
                )}
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-soft">
                {showUltra ? (
                  "Tap Pro or Ultra in the table. Monthly and yearly prices follow that plan."
                ) : (
                  <ProGlowText>
                    Pro unlocks separate short-term and long-term lists, richer culture
                    write-ups, larger watchlists, and full backtests.
                  </ProGlowText>
                )}
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
                className={`relative rounded-full px-5 py-2 text-sm font-semibold transition-all ${glowClass} ${
                  billing === value
                    ? pickedPlan === "ultra"
                      ? "text-white"
                      : "text-ink"
                    : "opacity-70"
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
                  ? `$${price.billed} billed once a year · $${price.perMonth}/month effective`
                  : `$${price.billed} billed each month`}
              </p>
            </div>

            {alreadyUltra ? (
              <p className="ultra-profile-glow rounded-full px-6 py-3 text-center text-sm font-semibold">
                Currently on <UltraShinePhrase>Ultra</UltraShinePhrase>
              </p>
            ) : alreadyPro && pickedPlan === "pro" ? (
              <p className="pro-profile-glow rounded-full bg-transparent px-6 py-3 text-center text-sm font-semibold">
                Currently on <ProGlowText>Pro</ProGlowText>
              </p>
            ) : user ? (
              <button
                type="button"
                onClick={startCheckout}
                disabled={loading}
                className={`${glowClass} rounded-full bg-transparent px-7 py-3.5 text-sm font-semibold transition-transform hover:-translate-y-0.5 disabled:opacity-60`}
              >
                {loading ? (
                  "Opening Stripe…"
                ) : pickedPlan === "ultra" ? (
                  <UltraShinePhrase>Upgrade to Ultra</UltraShinePhrase>
                ) : (
                  <ProGlowText>Upgrade to Pro</ProGlowText>
                )}
              </button>
            ) : (
              <Link
                href="/login"
                onClick={onClose}
                className={`${glowClass} rounded-full bg-transparent px-7 py-3.5 text-center text-sm font-semibold transition-transform hover:-translate-y-0.5`}
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
      <PlanComparisonTable
        currentPlan={entitlement.plan}
        selectedPlan={pickedPlan}
        onSelectPlan={setPickedPlan}
      />
    </OverlaySheet>
  );
}
