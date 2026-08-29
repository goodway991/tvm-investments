import { NextRequest, NextResponse } from "next/server";
import {
  getSiteMaintenance,
  isAdminEmail,
  updateSiteMaintenance,
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
    const site = await getSiteMaintenance();
    return NextResponse.json({ site });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to load maintenance.",
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

  let body: {
    enabled?: unknown;
    warning?: unknown;
    start?: unknown;
    end?: unknown;
    message?: unknown;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  try {
    const site = await updateSiteMaintenance({
      enabled: body.enabled === true,
      warning: body.warning === true,
      start: typeof body.start === "string" ? body.start : "",
      end: typeof body.end === "string" ? body.end : "",
      message: typeof body.message === "string" ? body.message : "",
    });
    return NextResponse.json({ site });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to update maintenance.",
      },
      { status: 500 },
    );
  }
}
