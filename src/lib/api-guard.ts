import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { consumeApiQuota, type ApiQuotaKind } from "@/lib/firebase/admin";
import { verifyUserToken } from "@/lib/verify-user-token";

const BURST_WINDOW_MS = 60_000;
const BURST_MAX = 90;

const burst = new Map<string, { count: number; resetAt: number }>();

function bearerToken(request: NextRequest) {
  const header = request.headers.get("authorization");
  return header?.startsWith("Bearer ") ? header.slice("Bearer ".length).trim() : "";
}

function secondsUntilEtMidnight() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const read = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? 0);
  const elapsed = read("hour") * 3600 + read("minute") * 60 + read("second");
  return Math.max(60, 24 * 3600 - elapsed);
}

function tooMany(message: string, retryAfterSec: number, extra?: Record<string, string>) {
  const headers = new Headers({
    "Retry-After": String(retryAfterSec),
    ...extra,
  });
  return NextResponse.json({ error: message }, { status: 429, headers });
}

function takeBurst(uid: string) {
  const now = Date.now();
  const current = burst.get(uid);
  if (!current || now >= current.resetAt) {
    burst.set(uid, { count: 1, resetAt: now + BURST_WINDOW_MS });
    return { ok: true as const };
  }
  if (current.count >= BURST_MAX) {
    return {
      ok: false as const,
      retryAfterSec: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    };
  }
  current.count += 1;
  return { ok: true as const };
}

export async function requireSignedIn(request: NextRequest): Promise<
  | { ok: true; uid: string; email: string }
  | { ok: false; response: NextResponse }
> {
  const token = bearerToken(request);
  if (!token) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Sign in required." }, { status: 401 }),
    };
  }
  const user = await verifyUserToken(token);
  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Sign in required." }, { status: 401 }),
    };
  }
  return { ok: true, uid: user.uid, email: user.email };
}

export async function requireApiUser(
  request: NextRequest,
  kind: ApiQuotaKind,
): Promise<
  | { ok: true; uid: string; email: string }
  | { ok: false; response: NextResponse }
> {
  const signedIn = await requireSignedIn(request);
  if (!signedIn.ok) return signedIn;

  const burstGate = takeBurst(signedIn.uid);
  if (!burstGate.ok) {
    return {
      ok: false,
      response: tooMany(
        "Too many requests. Wait a minute and try again.",
        burstGate.retryAfterSec,
      ),
    };
  }

  const quota = await consumeApiQuota(signedIn.uid, signedIn.email, kind);
  if (!quota.ok) {
    const retryAfterSec = secondsUntilEtMidnight();
    return {
      ok: false,
      response: tooMany(
        "You've hit today's request limit. It resets at midnight Eastern.",
        retryAfterSec,
        {
          "X-RateLimit-Limit": String(quota.limit),
          "X-RateLimit-Remaining": "0",
        },
      ),
    };
  }

  return signedIn;
}
