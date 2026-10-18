"use client";

import {
  priceFor,
  ultraSalePercent,
  ULTRA_WAS_PRICES,
  type BillingInterval,
} from "@/lib/plans";
import { showTvm10Labs } from "@/lib/beta-labs";

export function ultraSaleLive() {
  return showTvm10Labs();
}

export function UltraSaleBang({ className = "" }: { className?: string }) {
  if (!ultraSaleLive()) return null;
  return (
    <span
      className={`ultra-sale-bang ${className}`.trim()}
      aria-label="Ultra sale"
      title="Massive discounts for Ultra"
    >
      !
    </span>
  );
}

export function UltraSalePrice({
  interval,
  size = "lg",
}: {
  interval: BillingInterval;
  size?: "lg" | "md";
}) {
  const now = priceFor("ultra", interval);
  const was = ULTRA_WAS_PRICES[interval];
  const off = ultraSalePercent(interval);
  const amountClass =
    size === "lg" ? "font-display text-3xl font-bold text-ink" : "stripe-plan-amount";

  return (
    <span className="ultra-sale-price">
      <span className="ultra-sale-was" aria-label={`Was $${was.perMonth}`}>
        ${was.perMonth}
      </span>
      <span className={amountClass}>${now.perMonth}</span>
      <span
        className={
          size === "lg" ? "text-lg font-medium text-ink-soft" : "stripe-plan-period"
        }
      >
        /mo
      </span>
      <span className="ultra-sale-gold">{off}% off</span>
    </span>
  );
}

export function UltraSaleBanner({
  compact = false,
  onUpgrade,
}: {
  compact?: boolean;
  onUpgrade: () => void;
}) {
  if (!ultraSaleLive()) return null;

  if (compact) {
    return (
      <button
        type="button"
        onClick={onUpgrade}
        className="ultra-sale-banner ultra-sale-banner--compact"
        aria-label="Massive discounts for Ultra"
        title="Massive discounts for Ultra"
      >
        <span className="ultra-sale-bang">!</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onUpgrade}
      className="ultra-sale-banner"
    >
      <span className="ultra-sale-banner-kicker">Limited cut</span>
      <span className="ultra-sale-banner-copy">Massive discounts for Ultra</span>
      <span className="ultra-sale-gold ultra-sale-banner-off">
        Up to {ultraSalePercent("monthly")}% off
      </span>
    </button>
  );
}
