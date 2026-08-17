import { NextRequest, NextResponse } from "next/server";
import { getDashboardSnapshot, parseArchiveDate } from "@/lib/snapshot";

export const dynamic = "force-dynamic";
export const maxDuration = 15;

export async function GET(request: NextRequest) {
  const date = parseArchiveDate(request.nextUrl.searchParams.get("date"));
  const snapshot = await getDashboardSnapshot(date);
  return NextResponse.json(snapshot);
}
