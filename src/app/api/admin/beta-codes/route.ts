import { NextRequest, NextResponse } from "next/server";
import {
  createBetaCode,
  deactivateBetaCode,
  isAdminEmail,
  listBetaCodes,
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
    const rows = await listBetaCodes();
    return NextResponse.json({ rows });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load codes." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const gate = await requireAdmin(request);
  if ("error" in gate) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  let body: { action?: string; code?: string; maxRedemptions?: number; id?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  try {
    if (body.action === "deactivate") {
      const id = String(body.id || "").trim();
      if (!id) return NextResponse.json({ error: "Pick a code." }, { status: 400 });
      await deactivateBetaCode(id);
      return NextResponse.json({ ok: true });
    }

    const row = await createBetaCode({
      code: body.code,
      maxRedemptions: body.maxRedemptions,
      createdBy: gate.decoded.email || gate.decoded.uid,
    });
    return NextResponse.json({ row });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to update beta codes.",
      },
      { status: 400 },
    );
  }
}
