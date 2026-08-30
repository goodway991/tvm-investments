/**
 * One-shot: create TVM Pro / Ultra products and prices in the Stripe account
 * from STRIPE_SECRET_KEY. Prints env lines (price ids only) to stdout.
 *
 * Tax code txcd_10103001 (SaaS — business use) is eligible for Stripe Managed
 * Payments. Do not invent tax codes; see Stripe’s Managed Payments eligibility list.
 *
 *   npx tsx scripts/setup-stripe-catalog.ts
 *
 * Requires STRIPE_SECRET_KEY from the Stripe Dashboard (live or test).
 */
import Stripe from "stripe";

/** SaaS — business use; eligible for Managed Payments. */
const MANAGED_PAYMENTS_TAX_CODE = "txcd_10103001";

const secret = process.env.STRIPE_SECRET_KEY;
if (!secret) {
  console.error("STRIPE_SECRET_KEY is missing. Set it from the Stripe Dashboard.");
  process.exit(1);
}

const stripe = new Stripe(secret);

async function ensureProduct(name: string, metadata: Record<string, string>) {
  const existing = await stripe.products.search({
    query: `name:'${name}' AND active:'true'`,
  });
  if (existing.data[0]) {
    const product = existing.data[0];
    if (product.tax_code !== MANAGED_PAYMENTS_TAX_CODE) {
      return stripe.products.update(product.id, {
        tax_code: MANAGED_PAYMENTS_TAX_CODE,
      });
    }
    return product;
  }
  return stripe.products.create({
    name,
    metadata,
    tax_code: MANAGED_PAYMENTS_TAX_CODE,
  });
}

async function ensurePrice(
  productId: string,
  unitAmount: number,
  interval: "month" | "year",
  metadata: Record<string, string>,
) {
  const listed = await stripe.prices.list({ product: productId, active: true, limit: 20 });
  const match = listed.data.find(
    (price) =>
      price.unit_amount === unitAmount &&
      price.recurring?.interval === interval &&
      price.currency === "usd",
  );
  if (match) return match;
  return stripe.prices.create({
    product: productId,
    currency: "usd",
    unit_amount: unitAmount,
    recurring: { interval },
    metadata,
  });
}

async function main() {
  const pro = await ensureProduct("TVM Pro", { plan: "pro" });
  const ultra = await ensureProduct("TVM Ultra", { plan: "ultra" });
  const proMonthly = await ensurePrice(pro.id, 1200, "month", { plan: "pro", interval: "monthly" });
  const proYearly = await ensurePrice(pro.id, 9600, "year", { plan: "pro", interval: "yearly" });
  const ultraMonthly = await ensurePrice(ultra.id, 3500, "month", {
    plan: "ultra",
    interval: "monthly",
  });
  const ultraYearly = await ensurePrice(ultra.id, 30000, "year", {
    plan: "ultra",
    interval: "yearly",
  });

  console.log(`STRIPE_PRICE_MONTHLY=${proMonthly.id}`);
  console.log(`STRIPE_PRICE_YEARLY=${proYearly.id}`);
  console.log(`STRIPE_PRICE_PRO_MONTHLY=${proMonthly.id}`);
  console.log(`STRIPE_PRICE_PRO_YEARLY=${proYearly.id}`);
  console.log(`STRIPE_PRICE_ULTRA_MONTHLY=${ultraMonthly.id}`);
  console.log(`STRIPE_PRICE_ULTRA_YEARLY=${ultraYearly.id}`);
}

void main();
