/**
 * Creates the Customer Portal configs and the live webhook endpoint in test
 * mode. Writes ids/secrets into .env.local without printing secrets.
 *
 *   npx tsx scripts/setup-stripe-ops.ts
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import Stripe from "stripe";

const ROOT = resolve(process.cwd());
const ENV_PATH = resolve(ROOT, ".env.local");
const LIVE_WEBHOOK = "https://tvminvest.com/api/stripe/webhook";
const EVENTS: Stripe.WebhookEndpointCreateParams.EnabledEvent[] = [
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "subscription_schedule.updated",
  "subscription_schedule.released",
  "subscription_schedule.completed",
];

function readEnvFile() {
  try {
    return readFileSync(ENV_PATH, "utf8");
  } catch {
    return "";
  }
}

function envValue(text: string, key: string) {
  const match = text.match(new RegExp(`^${key}=(.*)$`, "m"));
  return match ? match[1].trim().replace(/^["']|["']$/g, "") : "";
}

function upsertEnv(text: string, key: string, value: string) {
  const line = `${key}=${value}`;
  if (new RegExp(`^${key}=`, "m").test(text)) {
    return text.replace(new RegExp(`^${key}=.*$`, "m"), line);
  }
  return `${text.replace(/\s*$/, "")}\n${line}\n`;
}

function secretFromEnv() {
  return process.env.STRIPE_SECRET_KEY || envValue(readEnvFile(), "STRIPE_SECRET_KEY");
}

async function ensurePortal(
  stripe: Stripe,
  name: string,
  _products: Array<{ product: string; prices: string[] }>,
) {
  const listed = await stripe.billingPortal.configurations.list({ limit: 20, active: true });
  const existing = listed.data.find((item) => item.business_profile?.headline === name);
  if (existing) return existing;
  return stripe.billingPortal.configurations.create({
    business_profile: {
      headline: name,
      privacy_policy_url: "https://tvminvest.com/privacy",
      terms_of_service_url: "https://tvminvest.com/terms",
    },
    features: {
      customer_update: {
        enabled: true,
        allowed_updates: ["email", "address"],
      },
      invoice_history: { enabled: true },
      payment_method_update: { enabled: true },
      subscription_cancel: {
        enabled: true,
        mode: "at_period_end",
        proration_behavior: "none",
      },
      subscription_update: {
        enabled: false,
      },
    },
  });
}

async function ensureWebhook(stripe: Stripe) {
  const listed = await stripe.webhookEndpoints.list({ limit: 100 });
  const existing = listed.data.find((item) => item.url === LIVE_WEBHOOK);
  if (existing) {
    await stripe.webhookEndpoints.update(existing.id, { enabled_events: EVENTS });
    return { id: existing.id, secret: "" };
  }
  const created = await stripe.webhookEndpoints.create({
    url: LIVE_WEBHOOK,
    enabled_events: EVENTS,
  });
  return { id: created.id, secret: created.secret || "" };
}

async function main() {
  const secret = secretFromEnv();
  if (!secret) {
    console.error("STRIPE_SECRET_KEY is missing.");
    process.exit(1);
  }

  const stripe = new Stripe(secret);
  let envText = readEnvFile();
  const proMonthly =
    envValue(envText, "STRIPE_PRICE_PRO_MONTHLY") || envValue(envText, "STRIPE_PRICE_MONTHLY");
  const proYearly =
    envValue(envText, "STRIPE_PRICE_PRO_YEARLY") || envValue(envText, "STRIPE_PRICE_YEARLY");
  const ultraMonthly = envValue(envText, "STRIPE_PRICE_ULTRA_MONTHLY");
  const ultraYearly = envValue(envText, "STRIPE_PRICE_ULTRA_YEARLY");
  if (!proMonthly || !proYearly) {
    console.error("Run scripts/setup-stripe-catalog.ts first.");
    process.exit(1);
  }

  const proPrice = await stripe.prices.retrieve(proMonthly);
  const ultraPrice = ultraMonthly ? await stripe.prices.retrieve(ultraMonthly) : null;
  const proProduct = typeof proPrice.product === "string" ? proPrice.product : proPrice.product.id;
  const ultraProduct =
    ultraPrice && (typeof ultraPrice.product === "string" ? ultraPrice.product : ultraPrice.product.id);

  const livePortal = await ensurePortal(stripe, "TVM Investments billing", [
    { product: proProduct, prices: [proMonthly, proYearly] },
  ]);
  envText = upsertEnv(envText, "STRIPE_PORTAL_CONFIGURATION", livePortal.id);

  if (ultraProduct && ultraMonthly && ultraYearly) {
    const labsPortal = await ensurePortal(stripe, "TVM Investments billing (labs)", [
      { product: proProduct, prices: [proMonthly, proYearly] },
      { product: ultraProduct, prices: [ultraMonthly, ultraYearly] },
    ]);
    envText = upsertEnv(envText, "STRIPE_PORTAL_CONFIGURATION_LABS", labsPortal.id);
  }

  const webhook = await ensureWebhook(stripe);
  if (webhook.secret) {
    envText = upsertEnv(envText, "STRIPE_WEBHOOK_SECRET", webhook.secret);
    console.log("STRIPE_WEBHOOK_SECRET=written");
  } else {
    console.log("STRIPE_WEBHOOK_SECRET=already_exists_use_dashboard");
  }

  writeFileSync(ENV_PATH, envText.endsWith("\n") ? envText : `${envText}\n`);
  console.log(`STRIPE_PORTAL_CONFIGURATION=${livePortal.id}`);
  console.log(`STRIPE_WEBHOOK_ENDPOINT=${LIVE_WEBHOOK}`);
}

void main();
