import { NextResponse } from "next/server";
import { getBacktestSummary } from "@/lib/firebase/admin";
import type { BacktestSummary } from "@/types";

export const dynamic = "force-dynamic";

const DEMO_BACKTEST: BacktestSummary = {
  totalDays: 30,
  avgReturn1d: 0.82,
  avgReturn1w: 2.14,
  avgReturn1m: 4.67,
  spAvgReturn1d: 0.21,
  spAvgReturn1w: 0.95,
  spAvgReturn1m: 2.31,
  entries: [],
};

export async function GET() {
  const summary = await getBacktestSummary();
  return NextResponse.json(summary ?? DEMO_BACKTEST);
}
