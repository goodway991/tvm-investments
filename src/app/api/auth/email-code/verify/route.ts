import { NextRequest, NextResponse } from "next/server";
import { requireSignedIn } from "@/lib/api-guard";
import { consumeEmailOtp } from "@/lib/email-otp";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const signedIn = await requireSignedIn(request, { allowUnverified: true });
  if (!signedIn.ok) return signedIn.response;

  let body: { code?: string };
  try {
    body = (await request.json()) as { code?: string };
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const result = await consumeEmailOtp({
    uid: signedIn.uid,
    email: signedIn.email,
    code: String(body.code ?? ""),
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ ok: true });
}
