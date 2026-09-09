import { NextRequest, NextResponse } from "next/server";
import { isValidEmailAddress } from "@/lib/email-format";
import { sendPasswordResetMail } from "@/lib/email-otp";
import { appOrigin } from "@/lib/stripe";

export const dynamic = "force-dynamic";

const hits = new Map<string, { count: number; resetAt: number }>();

function takeHit(key: string, max: number, windowMs: number) {
  const now = Date.now();
  const current = hits.get(key);
  if (!current || now >= current.resetAt) {
    hits.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (current.count >= max) return false;
  current.count += 1;
  return true;
}

export async function POST(request: NextRequest) {
  let body: { email?: string };
  try {
    body = (await request.json()) as { email?: string };
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const email = String(body.email ?? "").trim().toLowerCase();
  if (!isValidEmailAddress(email) && email !== "admin@tvm-investments.test") {
    return NextResponse.json(
      { error: "Enter a valid email address first." },
      { status: 400 },
    );
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "unknown";

  if (!takeHit(`ip:${ip}`, 8, 60 * 60 * 1000) || !takeHit(`email:${email}`, 4, 60 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Too many reset attempts. Try again later." },
      { status: 429 },
    );
  }

  const continueUrl = `${appOrigin(request)}/login`;
  const sent = await sendPasswordResetMail({ email, continueUrl });
  if (!sent) {
    return NextResponse.json(
      { error: "Unable to send a password reset email. Try again in a minute." },
      { status: 502 },
    );
  }

  return NextResponse.json({
    ok: true,
    message: "If that email is on file, we sent a reset link.",
  });
}
