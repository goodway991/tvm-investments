"use client";

import Script from "next/script";
import { createElement } from "react";

export function stripePricingTableConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_STRIPE_PRICING_TABLE_ID &&
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  );
}

export function StripePricingTable({
  clientReferenceId,
  customerEmail,
  className,
}: {
  clientReferenceId?: string;
  customerEmail?: string;
  className?: string;
}) {
  const pricingTableId = process.env.NEXT_PUBLIC_STRIPE_PRICING_TABLE_ID;
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  if (!pricingTableId || !publishableKey) return null;

  return (
    <div className={className}>
      <Script src="https://js.stripe.com/v3/pricing-table.js" strategy="lazyOnload" />
      {createElement("stripe-pricing-table", {
        "pricing-table-id": pricingTableId,
        "publishable-key": publishableKey,
        ...(clientReferenceId ? { "client-reference-id": clientReferenceId } : {}),
        ...(customerEmail ? { "customer-email": customerEmail } : {}),
      })}
    </div>
  );
}
