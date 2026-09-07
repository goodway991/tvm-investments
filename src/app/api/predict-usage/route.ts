import { NextRequest, NextResponse } from "next/server";
import { requireSignedIn } from "@/lib/api-guard";
import {
  consumeServerPredictUsage,
  getPlanForUser,
  readServerPredictUsage,
} from "@/lib/firebase/admin";
import type { PredictKind } from "@/lib/predict-limits";

export const dynamic = "force-dynamic";

function parseKind(value: unknown): PredictKind | null {
  if (
    value === "pulse" ||
    value === "score" ||
    value === "addition" ||
    value === "horizon" ||
    value === "advanced"
  ) {
    return value;
  }
  return null;
}

export async function GET(request: NextRequest) {
  const gate = await requireSignedIn(request);
  if (!gate.ok) return gate.response;
  const usage = await readServerPredictUsage(gate.uid);
  return NextResponse.json({ usage });
}

export async function POST(request: NextRequest) {
  const gate = await requireSignedIn(request);
  if (!gate.ok) return gate.response;

  let kind: PredictKind | null = null;
  try {
    const body = (await request.json()) as { kind?: unknown };
    kind = parseKind(body.kind);
  } catch {
    kind = null;
  }
  if (!kind) {
    return NextResponse.json({ error: "Pick a predict kind." }, { status: 400 });
  }

  const plan = await getPlanForUser(gate.uid, gate.email);
  const result = await consumeServerPredictUsage(gate.uid, plan, kind);
  if (!result.ok) {
    return NextResponse.json(
      { error: "Weekly predict limit reached.", usage: result.usage },
      { status: 429 },
    );
  }
  return NextResponse.json({ ok: true, usage: result.usage });
}
