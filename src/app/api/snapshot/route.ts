import { NextRequest, NextResponse } from "next/server";
import { requireArchiveDate } from "@/lib/archive-access";
import { requireApiUser } from "@/lib/api-guard";
import { getDashboardSnapshot, parseArchiveDate } from "@/lib/snapshot";
import { applyPlanSnapshotCaps } from "@/lib/snapshot-view";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(request: NextRequest) {
  const gate = await requireApiUser(request, "market");
  if (!gate.ok) return gate.response;

  const date = parseArchiveDate(request.nextUrl.searchParams.get("date")) ?? null;
  const archive = await requireArchiveDate(gate.uid, gate.email, date);
  if (!archive.ok) return archive.response;

  const snapshot = await getDashboardSnapshot(date);
  return NextResponse.json(applyPlanSnapshotCaps(snapshot, archive.plan));
}
