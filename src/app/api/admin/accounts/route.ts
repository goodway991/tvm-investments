import { NextRequest, NextResponse } from "next/server";
import {
  isAdminEmail,
  isQuotaError,
  listAdminAccounts,
  setAdminPlan,
  verifyIdToken,
} from "@/lib/firebase/admin";
import { stripeConfigured } from "@/lib/stripe";
import { cancelSubscriptionNow } from "@/lib/stripe-entitlements";
import type { PlanId } from "@/lib/plans";

export const dynamic = "force-dynamic";

function parsePlan(value: unknown): PlanId | null {
  if (value === "free" || value === "pro" || value === "ultra") return value;
  return null;
}

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

export async function GET(request: NextRequest) {
  const gate = await requireAdmin(request);
  if ("error" in gate) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  try {
    const { rows, plansLoaded } = await listAdminAccounts();
    return NextResponse.json({ rows, plansLoaded });
  } catch (error) {
    const message = isQuotaError(error)
      ? "Firestore daily read quota is used up, so account plans could not load."
      : error instanceof Error
        ? error.message
        : "Unable to load accounts.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const gate = await requireAdmin(request);
  if ("error" in gate) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  let body: { uid?: string; plan?: string; grant?: boolean };
  try {
    body = (await request.json()) as { uid?: string; plan?: string; grant?: boolean };
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const uid = String(body.uid || "").trim();
  if (!uid) {
    return NextResponse.json({ error: "Pick an account." }, { status: 400 });
  }

  const plan =
    parsePlan(body.plan) ||
    (typeof body.grant === "boolean" ? (body.grant ? "pro" : "free") : null);
  if (!plan) {
    return NextResponse.json({ error: "Pick Free, Pro, or Ultra." }, { status: 400 });
  }

  try {
    const previous = await setAdminPlan(uid, plan);
    if (previous.stripeSubscriptionId && stripeConfigured()) {
      try {
        await cancelSubscriptionNow(previous.stripeSubscriptionId);
      } catch {
        /* Plan is already on TVM. Finish the Stripe cancel in the Dashboard. */
      }
    }
    const { rows, plansLoaded } = await listAdminAccounts();
    const nextRows = plansLoaded
      ? rows
      : rows.map((row) =>
          row.uid === uid
            ? {
                ...row,
                plan,
                source: plan === "free" ? "none" : "comp",
              }
            : row,
        );
    return NextResponse.json({ rows: nextRows, plansLoaded });
  } catch (error) {
    const message = isQuotaError(error)
      ? "Firestore daily quota is used up, so the plan could not be saved yet."
      : error instanceof Error
        ? error.message
        : "Unable to update that plan.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
