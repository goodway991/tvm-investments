import { NextRequest, NextResponse } from "next/server";
import { requireSignedIn } from "@/lib/api-guard";
import { checkEmailVerificationStatus } from "@/lib/email-otp";

export const dynamic = "force-dynamic";

/** Does not send mail — only reports whether this account already passed one-time email proof. */
export async function POST(request: NextRequest) {
  const signedIn = await requireSignedIn(request, { allowUnverified: true });
  if (!signedIn.ok) return signedIn.response;

  const status = await checkEmailVerificationStatus({
    uid: signedIn.uid,
    email: signedIn.email,
  });

  return NextResponse.json({ ok: true, verified: status.verified });
}
