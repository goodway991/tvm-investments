import { NextRequest, NextResponse } from "next/server";
import {
  isAdminEmail,
  isQuotaError,
  listAdminAccounts,
  setComplimentaryPro,
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

  let body: { uid?: string; grant?: boolean };
  try {
    body = (await request.json()) as { uid?: string; grant?: boolean };
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const uid = String(body.uid || "").trim();
  if (!uid) {
    return NextResponse.json({ error: "Pick an account." }, { status: 400 });
  }

  try {
    await setComplimentaryPro(uid, Boolean(body.grant));
    const { rows, plansLoaded } = await listAdminAccounts();
    const nextRows = plansLoaded
      ? rows
      : rows.map((row) =>
          row.uid === uid
            ? {
                ...row,
                plan: body.grant ? "pro" : "free",
                source: body.grant ? "comp" : "none",
              }
            : row,
        );
    return NextResponse.json({ rows: nextRows, plansLoaded });
  } catch (error) {
    const message = isQuotaError(error)
      ? "Firestore daily quota is used up, so gifting could not be saved yet."
      : error instanceof Error
        ? error.message
        : "Unable to update that plan.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
