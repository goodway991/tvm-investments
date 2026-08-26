import { NextRequest, NextResponse } from "next/server";
import { requireApiUser } from "@/lib/api-guard";
import { applyFilters } from "@/lib/scoring";
import { getDashboardSnapshot, parseArchiveDate } from "@/lib/snapshot";
import type { FilterCriteria } from "@/types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const gate = await requireApiUser(request, "market");
  if (!gate.ok) return gate.response;

  const params = request.nextUrl.searchParams;

  const filters: FilterCriteria = {
    peMin: num(params.get("peMin")),
    peMax: num(params.get("peMax")),
    betaMin: num(params.get("betaMin")),
    betaMax: num(params.get("betaMax")),
    volumeMin: num(params.get("volumeMin")),
    epsMin: num(params.get("epsMin")),
    marketCapMin: num(params.get("marketCapMin")),
    marketCapMax: num(params.get("marketCapMax")),
  };

  const snapshot = await getDashboardSnapshot(
    parseArchiveDate(params.get("date") ?? params.get("archive")),
  );
  const filtered = applyFilters(snapshot.screenedStocks, filters);

  return NextResponse.json({
    count: filtered.length,
    stocks: filtered.map((s) => ({
      symbol: s.symbol,
      name: s.name,
      sector: s.sector,
      industry: s.industry,
      price: s.price,
      changePercent: s.changePercent,
      compositeScore: s.compositeScore,
      shortTermScore: s.shortTermScore,
      longTermScore: s.longTermScore,
      peRatio: s.fundamentals.peRatio,
      beta: s.fundamentals.beta,
      eps: s.fundamentals.eps,
      marketCap: s.fundamentals.marketCap,
      volume: s.volume,
      indexMembership: s.indexMembership,
    })),
  });
}

function num(v: string | null): number | undefined {
  if (v == null || v === "") return undefined;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : undefined;
}
