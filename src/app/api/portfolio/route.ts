import { NextRequest, NextResponse } from "next/server";
import { requireSignedIn } from "@/lib/api-guard";
import {
  ensurePortfolio,
  removePortfolioPosition,
  upsertPortfolioCash,
  upsertPortfolioPosition,
} from "@/lib/portfolio-server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const gate = await requireSignedIn(request);
  if (!gate.ok) return gate.response;

  let body: {
    action?: string;
    cash?: number;
    totalValue?: number;
    symbol?: string;
    shares?: number;
    averageCost?: number;
    currentPrice?: number;
    purchasedAt?: string | null;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  try {
    const action = String(body.action || "");
    if (action === "ensure") {
      const portfolio = await ensurePortfolio(gate.uid);
      return NextResponse.json({ ok: true, portfolio });
    }
    if (action === "cash") {
      const portfolio = await upsertPortfolioCash(
        gate.uid,
        Number(body.cash),
        Number(body.totalValue),
      );
      return NextResponse.json({ ok: true, portfolio });
    }
    if (action === "position") {
      const position = await upsertPortfolioPosition(gate.uid, {
        symbol: String(body.symbol || ""),
        shares: Number(body.shares),
        averageCost: Number(body.averageCost),
        currentPrice: Number(body.currentPrice),
        purchasedAt: body.purchasedAt ?? null,
      });
      return NextResponse.json({ ok: true, position });
    }
    if (action === "remove") {
      await removePortfolioPosition(gate.uid, String(body.symbol || ""));
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to update portfolio.",
      },
      { status: 400 },
    );
  }
}
