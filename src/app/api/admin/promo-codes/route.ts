import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { isAdminEmail, verifyIdToken } from "@/lib/firebase/admin";
import { getStripe, stripeConfigured } from "@/lib/stripe";

export const dynamic = "force-dynamic";

async function requireAdmin(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : "";
  if (!token) return { error: "Sign in as admin." as const, status: 401 as const };
  const decoded = await verifyIdToken(token);
  if (!decoded || !isAdminEmail(decoded.email)) {
    return { error: "Sign in as admin." as const, status: 403 as const };
  }
  return { decoded };
}

function couponFromPromotion(promo: Stripe.PromotionCode) {
  const coupon = promo.promotion?.coupon;
  if (!coupon || typeof coupon === "string") {
    return {
      percent_off: null as number | null,
      amount_off: null as number | null,
      currency: null as string | null,
      duration: "once",
      name: null as string | null,
    };
  }
  return {
    percent_off: coupon.percent_off,
    amount_off: coupon.amount_off,
    currency: coupon.currency,
    duration: coupon.duration,
    name: coupon.name,
  };
}

function serializePromo(code: Stripe.PromotionCode) {
  const coupon = couponFromPromotion(code);
  return {
    id: code.id,
    code: code.code || "",
    active: code.active,
    expiresAt: code.expires_at || 0,
    maxRedemptions: code.max_redemptions || 0,
    timesRedeemed: code.times_redeemed || 0,
    percentOff: coupon.percent_off || 0,
    amountOff: coupon.amount_off || 0,
    currency: coupon.currency || "usd",
    duration: coupon.duration,
    name: coupon.name || "",
  };
}

export async function GET(request: NextRequest) {
  const gate = await requireAdmin(request);
  if ("error" in gate) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }
  if (!stripeConfigured()) {
    return NextResponse.json({ rows: [], configured: false });
  }
  try {
    const stripe = getStripe();
    const listed = await stripe.promotionCodes.list({
      limit: 40,
      expand: ["data.promotion.coupon"],
    });
    return NextResponse.json({
      configured: true,
      rows: listed.data.map(serializePromo),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to load promo codes.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const gate = await requireAdmin(request);
  if ("error" in gate) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }
  if (!stripeConfigured()) {
    return NextResponse.json(
      { error: "Stripe is not configured yet." },
      { status: 503 },
    );
  }

  let body: {
    code?: unknown;
    percentOff?: unknown;
    expiresAt?: unknown;
    maxRedemptions?: unknown;
    duration?: unknown;
    id?: unknown;
    action?: unknown;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  try {
    const stripe = getStripe();
    if (body.action === "deactivate") {
      const id = typeof body.id === "string" ? body.id.trim() : "";
      if (!id) {
        return NextResponse.json({ error: "Pick a code." }, { status: 400 });
      }
      await stripe.promotionCodes.update(id, { active: false });
      return NextResponse.json({ ok: true });
    }

    const percentOff = Number(body.percentOff);
    if (!Number.isInteger(percentOff) || percentOff < 1 || percentOff > 100) {
      return NextResponse.json(
        { error: "Percent off must be a whole number from 1 to 100." },
        { status: 400 },
      );
    }
    const code =
      typeof body.code === "string"
        ? body.code.trim().toUpperCase().replace(/[^A-Z0-9-]/g, "")
        : "";
    const expiresAt =
      typeof body.expiresAt === "string" && body.expiresAt
        ? Math.floor(new Date(`${body.expiresAt}T23:59:59`).getTime() / 1000)
        : 0;
    const maxRedemptions = Number(body.maxRedemptions) || 0;
    const duration = body.duration === "forever" ? "forever" : "once";

    const coupon = await stripe.coupons.create({
      percent_off: percentOff,
      duration,
      name: code ? `${code} ${percentOff}%` : `Beta ${percentOff}%`,
    });
    const promo = await stripe.promotionCodes.create({
      promotion: { type: "coupon", coupon: coupon.id },
      code: code || undefined,
      expires_at: expiresAt > 0 ? expiresAt : undefined,
      max_redemptions: maxRedemptions > 0 ? maxRedemptions : undefined,
    });
    const expanded = await stripe.promotionCodes.retrieve(promo.id, {
      expand: ["promotion.coupon"],
    });
    return NextResponse.json({ row: serializePromo(expanded) });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to create that code.",
      },
      { status: 500 },
    );
  }
}
