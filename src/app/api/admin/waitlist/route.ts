import { NextRequest, NextResponse } from "next/server";
import {
  admitBetaTester,
  isAdminEmail,
  isQuotaError,
  listAdminAccounts,
  verifyIdToken,
} from "@/lib/firebase/admin";

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

export async function GET(request: NextRequest) {
  const gate = await requireAdmin(request);
  if ("error" in gate) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }
  try {
    const { rows, plansLoaded } = await listAdminAccounts();
    const pending = rows.filter(
      (row) => row.role !== "admin" && row.waitlistStatus === "pending",
    );
    return NextResponse.json({ rows: pending, plansLoaded });
  } catch (error) {
    const message = isQuotaError(error)
      ? "Firestore daily read quota is used up, so the waitlist could not load."
      : error instanceof Error
        ? error.message
        : "Unable to load the waitlist.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const gate = await requireAdmin(request);
  if ("error" in gate) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  let uid = "";
  try {
    const body = (await request.json()) as { uid?: string };
    uid = String(body.uid || "").trim();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  if (!uid) {
    return NextResponse.json({ error: "Pick an account." }, { status: 400 });
  }

  try {
    await admitBetaTester(uid);
    const { rows, plansLoaded } = await listAdminAccounts();
    const pending = rows.filter(
      (row) => row.role !== "admin" && row.waitlistStatus === "pending",
    );
    return NextResponse.json({ rows: pending, plansLoaded });
  } catch (error) {
    const message = isQuotaError(error)
      ? "Firestore daily quota is used up, so they could not be admitted yet."
      : error instanceof Error
        ? error.message
        : "Unable to admit that account.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
