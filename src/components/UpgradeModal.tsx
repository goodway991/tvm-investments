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
  type PlanId,
} from "@/lib/plans";
import { ProGlowText } from "@/components/ProGlowText";
import { UltraShinePhrase } from "@/components/UltraText";
import { authedFetch } from "@/lib/authed-fetch";

const PLAN_RANK: Record<PlanId, number> = { free: 0, pro: 1, ultra: 2 };

function accessUntilLabel(unix: number) {
  if (!unix) return "";
  return new Date(unix * 1000).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function UpgradeModal({
  onClose,
  initialPlan,
}: {
  onClose: () => void;
  initialPlan?: PlanId;
}) {
  const { user, entitlement } = useAuth();
  const showUltra = showTvm10Labs();
  const alreadyPro = entitlement.plan === "pro";
  const alreadyUltra = entitlement.plan === "ultra";
  const billed = entitlement.source === "stripe" && Boolean(entitlement.stripeCustomerId);
  const canceling = billed && entitlement.stripeCancelAtPeriodEnd;
  const until = accessUntilLabel(entitlement.stripeAccessUntil);
  const [pickedPlan, setPickedPlan] = useState<PlanId>(() => {
    if (initialPlan === "ultra" && showUltra) return "ultra";
    if (initialPlan === "pro" || initialPlan === "free") return initialPlan;
    return entitlement.plan;
  });
  const [billing, setBilling] = useState<BillingInterval>("monthly");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const paidPick = pickedPlan === "pro" || pickedPlan === "ultra";
  const price = paidPick ? priceFor(pickedPlan, billing) : null;
  const savePercent = paidPick ? yearlySavingsPercent(pickedPlan) : 0;
  const glowClass =
    pickedPlan === "ultra" ? "ultra-profile-glow-move" : "pro-profile-glow-move";

  async function openPortal() {
    setError("");
    setLoading(true);
    try {
      const response = await authedFetch("/api/stripe/portal", { method: "POST" });
      const payload = (await response.json()) as { url?: string; error?: string };
      if (payload.url) {
        window.location.href = payload.url;
        return;
      }
      setError(payload.error || "Could not open billing.");
    } catch {
      setError("Could not open billing. Try again in a moment.");
    } finally {
      setLoading(false);
    }
  }

  async function startCheckout() {
    if (pickedPlan === "free") return;
    setError("");
    setNotice("");
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

  async function changePlan() {
    setError("");
    setNotice("");
    setLoading(true);
    try {
      const response = await authedFetch("/api/stripe/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interval: billing, plan: pickedPlan }),
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        error?: string;
        cancelAtPeriodEnd?: boolean;
        accessUntil?: number;
      };
      if (!response.ok) {
        setError(payload.error || "Could not update that plan.");
        return;
      }
      if (pickedPlan === "free" || payload.cancelAtPeriodEnd) {
        const date = accessUntilLabel(payload.accessUntil || entitlement.stripeAccessUntil);
        setNotice(
          date
            ? `You'll keep ${alreadyUltra ? "Ultra" : "Pro"} until ${date}, then this account goes back to Free.`
            : "Downgrade is scheduled at the end of this billing period.",
        );
        return;
      }
      setNotice(pickedPlan === "pro" ? "You're on Pro." : "Plan updated.");
    } catch {
      setError("Could not update that plan. Try again in a moment.");
    } finally {
      setLoading(false);
    }
  }

  const samePlan = pickedPlan === entitlement.plan;
  const upgrading = PLAN_RANK[pickedPlan] > PLAN_RANK[entitlement.plan];
  const downgrading = PLAN_RANK[pickedPlan] < PLAN_RANK[entitlement.plan];

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
                  <ProGlowText>
                    Tap Free, Pro, or Ultra in the table. You can move up or down.
                  </ProGlowText>
                ) : (
                  <ProGlowText>
                    Pro unlocks separate short-term and long-term lists, richer culture
                    write-ups, larger watchlists, and full backtests. Tap Free to
                    schedule a downgrade.
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

          {paidPick ? (
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
          ) : (
            <div className="mt-6" />
          )}

          <div className="mt-8 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
            <div>
              <p className="font-display text-3xl font-bold text-ink">
                {price ? (
                  <>
                    ${price.perMonth}
                    <span className="text-lg font-medium text-ink-soft">/mo</span>
                  </>
                ) : (
                  <>
                    $0
                    <span className="text-lg font-medium text-ink-soft">/mo</span>
                  </>
                )}
              </p>
              <p className="mt-1 text-sm text-ink-soft">
                {pickedPlan === "free"
                  ? canceling && until
                    ? `Downgrade is already scheduled for ${until}.`
                    : billed
                      ? "Cancels at the end of this billing period. You keep paid access until then."
                      : "The free desk: movers, screens, and a 10-name watchlist."
                  : billing === "yearly"
                    ? `$${price?.billed} billed once a year · $${price?.perMonth}/month effective`
                    : `$${price?.billed} billed each month`}
              </p>
            </div>

            {!user ? (
              <Link
                href="/login"
                onClick={onClose}
                className={`${glowClass} rounded-full bg-transparent px-7 py-3.5 text-center text-sm font-semibold transition-transform hover:-translate-y-0.5`}
              >
                Log in to upgrade
              </Link>
            ) : samePlan && canceling ? (
              <div className="flex flex-col items-stretch gap-2">
                <p className="rounded-full border border-ink/10 px-6 py-3 text-center text-sm font-semibold text-ink">
                  {until ? `Cancels ${until}` : "Downgrade scheduled"}
                </p>
                <button
                  type="button"
                  onClick={() => void changePlan()}
                  disabled={loading}
                  className="rounded-full px-6 py-2 text-center text-sm font-semibold text-violet hover:bg-violet/10 disabled:opacity-60"
                >
                  {loading ? "Saving…" : alreadyUltra ? "Keep Ultra" : "Keep Pro"}
                </button>
              </div>
            ) : samePlan ? (
              <div className="flex flex-col items-stretch gap-2">
                <p
                  className={`${
                    alreadyUltra
                      ? "ultra-profile-glow"
                      : alreadyPro
                        ? "pro-profile-glow bg-transparent"
                        : "border border-ink/10"
                  } rounded-full px-6 py-3 text-center text-sm font-semibold`}
                >
                  Currently on{" "}
                  {alreadyUltra ? (
                    <UltraShinePhrase>Ultra</UltraShinePhrase>
                  ) : alreadyPro ? (
                    <ProGlowText>Pro</ProGlowText>
                  ) : (
                    "Free"
                  )}
                </p>
                {billed ? (
                  <button
                    type="button"
                    onClick={() => void openPortal()}
                    disabled={loading}
                    className="rounded-full px-6 py-2 text-center text-sm font-semibold text-violet hover:bg-violet/10 disabled:opacity-60"
                  >
                    {loading ? "Opening billing…" : "Manage billing"}
                  </button>
                ) : null}
              </div>
            ) : upgrading ? (
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
            ) : downgrading && pickedPlan === "free" && billed ? (
              <button
                type="button"
                onClick={() => void changePlan()}
                disabled={loading}
                className="rounded-full border border-coral/30 px-7 py-3.5 text-sm font-semibold text-coral transition-transform hover:-translate-y-0.5 disabled:opacity-60"
              >
                {loading ? "Scheduling…" : "Downgrade to Free"}
              </button>
            ) : downgrading && billed ? (
              <button
                type="button"
                onClick={() => void changePlan()}
                disabled={loading}
                className="rounded-full bg-transparent px-7 py-3.5 text-sm font-semibold text-violet transition-transform hover:-translate-y-0.5 disabled:opacity-60"
              >
                {loading ? "Updating…" : "Switch to Pro"}
              </button>
            ) : downgrading ? (
              <p className="rounded-full border border-ink/10 px-6 py-3 text-center text-sm font-semibold text-ink-soft">
                Complimentary Pro isn’t billed, so there’s nothing to cancel here.
              </p>
            ) : null}
          </div>

          {notice ? (
            <p className="mt-4 rounded-2xl bg-violet/10 px-4 py-3 text-sm text-ink">
              {notice}
            </p>
          ) : null}
          {error ? (
            <p className="mt-4 rounded-2xl bg-coral/10 px-4 py-3 text-sm text-coral" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      }
      footer={
        <p className="text-[11px] leading-relaxed text-ink-soft">
          Secure checkout is powered by Stripe. Cancel anytime; paid access lasts
          through the end of the period you already paid for.
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
