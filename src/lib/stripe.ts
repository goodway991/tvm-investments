import "server-only";
import Stripe from "stripe";

import { showTvm10Labs } from "@/lib/beta-labs";
import type { BillingInterval, PaidPlanId } from "@/lib/plans";

let client: Stripe | null = null;

export function getStripe() {
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) {
    throw new Error("STRIPE_SECRET_KEY is not set.");
  }
  if (!client) {
    client = new Stripe(secret);
  }
  return client;
}

export function stripeConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY && stripePriceId("pro", "monthly"));
}

export function stripePriceId(plan: PaidPlanId, interval: BillingInterval) {
  if (plan === "ultra") {
    return interval === "yearly"
      ? process.env.STRIPE_PRICE_ULTRA_YEARLY
      : process.env.STRIPE_PRICE_ULTRA_MONTHLY;
  }
  return interval === "yearly"
    ? process.env.STRIPE_PRICE_YEARLY || process.env.STRIPE_PRICE_PRO_YEARLY
    : process.env.STRIPE_PRICE_MONTHLY || process.env.STRIPE_PRICE_PRO_MONTHLY;
}

/** Archived live Pro prices so existing subscribers still map after the catalog change. */
const LEGACY_PRO_PRICE_IDS = [
  "price_1U8tSfJhvXEbbFikxmUBZNWx",
  "price_1U8tSgJhvXEbbFik712ReGSl",
];

export function planFromPriceId(priceId: string | null | undefined): PaidPlanId | null {
  if (!priceId) return null;
  const ultra = [
    process.env.STRIPE_PRICE_ULTRA_MONTHLY,
    process.env.STRIPE_PRICE_ULTRA_YEARLY,
  ];
  if (ultra.includes(priceId)) return "ultra";
  const pro = [
    process.env.STRIPE_PRICE_MONTHLY,
    process.env.STRIPE_PRICE_YEARLY,
    process.env.STRIPE_PRICE_PRO_MONTHLY,
    process.env.STRIPE_PRICE_PRO_YEARLY,
    ...LEGACY_PRO_PRICE_IDS,
  ];
  if (pro.includes(priceId)) return "pro";
  return null;
}

export function checkoutPlanAllowed(plan: PaidPlanId) {
  return plan === "pro" || (plan === "ultra" && showTvm10Labs());
}

const LOCAL_HOSTS = new Set(["localhost:3000", "127.0.0.1:3000"]);

export function portalConfigurationId() {
  if (showTvm10Labs()) {
    return (
      process.env.STRIPE_PORTAL_CONFIGURATION_LABS ||
      process.env.STRIPE_PORTAL_CONFIGURATION ||
      ""
    );
  }
  return process.env.STRIPE_PORTAL_CONFIGURATION || "";
}

export function appOrigin(request: { headers: Headers }) {
  const host = request.headers.get("host") || "";
  const originHeader = (request.headers.get("origin") || "").replace(/\/$/, "");
  if (LOCAL_HOSTS.has(host)) return `http://${host}`;
  if (originHeader.startsWith("http://localhost") || originHeader.startsWith("http://127.0.0.1")) {
    return originHeader;
  }
  if (host === "tvminvest.com" || host === "www.tvminvest.com") {
    return `https://${host}`;
  }
  if (host.endsWith(".vercel.app")) return `https://${host}`;
  const configured = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");
  if (configured) return configured;
  return "https://tvminvest.com";
}
