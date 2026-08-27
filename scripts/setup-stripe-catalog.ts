/**
 * One-shot: create TVM Pro / Ultra products and prices in the Stripe account
 * from STRIPE_SECRET_KEY. Prints env lines (price ids only) to stdout.
 *
 *   npx tsx scripts/setup-stripe-catalog.ts
 */
import Stripe from "stripe";

const secret = process.env.STRIPE_SECRET_KEY;
if (!secret) {
  console.error("STRIPE_SECRET_KEY is missing.");
  process.exit(1);
}

const stripe = new Stripe(secret);

async function ensureProduct(name: string, metadata: Record<string, string>) {
  const existing = await stripe.products.search({
    query: `name:'${name}' AND active:'true'`,
  });
  if (existing.data[0]) return existing.data[0];
  return stripe.products.create({
    name,
    metadata,
    tax_code: "txcd_10103001",
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
  const proMonthly = await ensurePrice(pro.id, 800, "month", { plan: "pro", interval: "monthly" });
  const proYearly = await ensurePrice(pro.id, 6000, "year", { plan: "pro", interval: "yearly" });
  const ultraMonthly = await ensurePrice(ultra.id, 1200, "month", {
    plan: "ultra",
    interval: "monthly",
  });
  const ultraYearly = await ensurePrice(ultra.id, 12000, "year", {
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
