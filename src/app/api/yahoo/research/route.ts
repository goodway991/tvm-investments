import { NextRequest, NextResponse } from "next/server";
import { researchSymbol } from "@/lib/analysis-pipeline";
import { requireApiUser } from "@/lib/api-guard";
import { getPlanForUser } from "@/lib/firebase/admin";
import { planHasPro } from "@/lib/plans";
import { parseTicker } from "@/lib/ticker";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const gate = await requireApiUser(request, "research");
  if (!gate.ok) return gate.response;

  const symbol = parseTicker(request.nextUrl.searchParams.get("symbol"));
  if (!symbol) {
    return NextResponse.json({ error: "Valid ticker required" }, { status: 400 });
  }

  const plan = await getPlanForUser(gate.uid, gate.email);
  const wantsPro = request.nextUrl.searchParams.get("pro") === "1";
  const withProCulture = wantsPro && planHasPro(plan);

  try {
    const payload = await researchSymbol(symbol, withProCulture);
    return NextResponse.json(payload);
  } catch (error) {
    console.error("Research error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not build a research card for this name.",
      },
      { status: 502 },
    );
  }
}
