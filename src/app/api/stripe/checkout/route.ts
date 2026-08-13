import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  let interval = "monthly";
  try {
    const body = (await request.json()) as { interval?: string };
    if (body.interval === "yearly" || body.interval === "monthly") {
      interval = body.interval;
    }
  } catch {
    /* empty body */
  }

  const secret = process.env.STRIPE_SECRET_KEY;
  const priceId =
    interval === "yearly"
      ? process.env.STRIPE_PRICE_YEARLY
      : process.env.STRIPE_PRICE_MONTHLY;

  if (!secret || !priceId) {
    return NextResponse.json(
      {
        error:
          "Checkout is not available yet. Please try again later.",
      },
      { status: 503 },
    );
  }

  return NextResponse.json(
    {
      error: "Checkout is not available yet. Please try again later.",
    },
    { status: 501 },
  );
}
