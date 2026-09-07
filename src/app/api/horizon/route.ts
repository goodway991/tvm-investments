import { NextRequest, NextResponse } from "next/server";
import { requireSignedIn } from "@/lib/api-guard";
import {
  ensureHorizonSim,
  horizonBuy,
  horizonReset,
  horizonSell,
} from "@/lib/horizon-server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const gate = await requireSignedIn(request);
  if (!gate.ok) return gate.response;

  let body: {
    action?: string;
    symbol?: string;
    shares?: number;
    price?: number;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  try {
    const action = String(body.action || "");
    if (action === "ensure") {
      const sim = await ensureHorizonSim(gate.uid);
      return NextResponse.json({ ok: true, sim });
    }
    if (action === "buy") {
      const result = await horizonBuy(gate.uid, {
        symbol: String(body.symbol || ""),
        shares: Number(body.shares),
        price: Number(body.price),
      });
      return NextResponse.json({ ok: true, ...result });
    }
    if (action === "sell") {
      const result = await horizonSell(gate.uid, {
        symbol: String(body.symbol || ""),
        shares: Number(body.shares),
        price: Number(body.price),
      });
      return NextResponse.json({ ok: true, ...result });
    }
    if (action === "reset") {
      const sim = await horizonReset(gate.uid);
      return NextResponse.json({ ok: true, sim });
    }
    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to update Horizon.",
      },
      { status: 400 },
    );
  }
}
