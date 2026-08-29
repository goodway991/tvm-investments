import { NextRequest, NextResponse } from "next/server";
import { requireApiUser } from "@/lib/api-guard";
import { showTvm10Labs } from "@/lib/beta-labs";
import { getPlanForUser } from "@/lib/firebase/admin";
import { buildMorningBrief } from "@/lib/morning-brief";
import { getDashboardSnapshot, parseArchiveDate } from "@/lib/snapshot";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(request: NextRequest) {
  const gate = await requireApiUser(request, "research");
  if (!gate.ok) return gate.response;
  if (!showTvm10Labs()) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  const plan = await getPlanForUser(gate.uid, gate.email);
  if (plan !== "ultra") {
    return NextResponse.json({ error: "Ultra only." }, { status: 403 });
  }

  const date = parseArchiveDate(request.nextUrl.searchParams.get("date"));
  const snapshot = await getDashboardSnapshot(date);
  return NextResponse.json(buildMorningBrief(snapshot));
}
