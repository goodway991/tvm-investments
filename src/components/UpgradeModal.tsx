"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { TVMIcon } from "@/components/TVMBrand";
import { PLAN_FEATURES, PLAN_PRICES, yearlySavingsPercent, type BillingInterval } from "@/lib/plans";

function PlanMark({ included }: { included: boolean }) {
  if (included) {
    return (
      <span className="plan-mark plan-mark-yes" aria-label="Included">
        <svg viewBox="0 0 20 20" aria-hidden className="h-3.5 w-3.5">
          <path
            d="M4.5 10.5 8.2 14 15.5 6.2"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    );
  }

  return (
    <span className="plan-mark plan-mark-no" aria-label="Not included">
      <svg viewBox="0 0 20 20" aria-hidden className="h-3.5 w-3.5">
        <path
          d="M6 6 14 14M14 6 6 14"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}

export function UpgradeModal({ onClose }: { onClose: () => void }) {
  const { user, entitlement } = useAuth();
  const [billing, setBilling] = useState<BillingInterval>("monthly");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const price = PLAN_PRICES[billing];
  const alreadyPro = entitlement.plan === "pro";
  const savePercent = yearlySavingsPercent();

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

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
    <div className="fixed inset-0 z-[80] grid place-items-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-ink/25 backdrop-blur-sm"
        aria-label="Close upgrade plans"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="upgrade-title"
        className="glass-strong relative z-10 max-h-[min(92vh,880px)] w-[min(920px,100%)] overflow-y-auto rounded-[28px] p-5 sm:p-8"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-violet">
              Your plan
            </p>
            <h2 id="upgrade-title" className="mt-1 font-display text-3xl font-bold text-ink">
              Upgrade to Pro
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-soft">
              Pro unlocks separate short-term and long-term lists, richer culture
              write-ups, larger watchlists, and full backtests.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-ink-soft hover:bg-violet/10 hover:text-violet"
            aria-label="Close"
          >
            <TVMIcon name="close" size={18} />
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

        <div className="mt-10 overflow-hidden rounded-[22px] border border-violet/15">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-violet/[0.06]">
                <th className="px-4 py-4 font-display text-xs font-semibold uppercase tracking-widest text-ink-soft sm:px-5">
                  Features
                </th>
                <th className="px-3 py-4 text-center font-display text-base font-bold text-ink">
                  Free
                </th>
                <th className="bg-violet/[0.08] px-3 py-4 text-center font-display text-base font-bold text-violet">
                  Pro
                </th>
              </tr>
            </thead>
            <tbody>
              {PLAN_FEATURES.map((feature) => (
                <tr key={feature.name} className="border-t border-violet/10">
                  <th className="px-4 py-3.5 font-medium text-ink sm:px-5">
                    {feature.name}
                  </th>
                  <td className="px-3 py-3.5">
                    <div className="grid place-items-center">
                      <PlanMark included={feature.free} />
                    </div>
                  </td>
                  <td className="bg-violet/[0.04] px-3 py-3.5">
                    <div className="grid place-items-center">
                      <PlanMark included={feature.pro} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
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
              Currently on Pro
            </p>
          ) : user ? (
            <button
              type="button"
              onClick={startCheckout}
              disabled={loading}
              className="glass-violet rounded-full px-7 py-3.5 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5 disabled:opacity-60"
            >
              {loading ? "Opening Stripe…" : "Upgrade to Pro"}
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

        <p className="mt-5 text-[11px] leading-relaxed text-ink-soft">
          Secure checkout is powered by Stripe. Cancel anytime. TVM Investments is
          not a broker or investment adviser.
        </p>
      </div>
    </div>
  );
}
