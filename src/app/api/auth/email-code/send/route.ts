import { NextRequest, NextResponse } from "next/server";
import { requireSignedIn } from "@/lib/api-guard";
import { isValidEmailAddress } from "@/lib/email-format";
import { issueEmailOtp } from "@/lib/email-otp";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const signedIn = await requireSignedIn(request, { allowUnverified: true });
  if (!signedIn.ok) return signedIn.response;

  if (!isValidEmailAddress(signedIn.email) && !signedIn.email.endsWith("@tvm-investments.test")) {
    return NextResponse.json(
      { error: "Your account needs a real email address before we can verify it." },
      { status: 400 },
    );
  }

  const result = await issueEmailOtp({
    uid: signedIn.uid,
    email: signedIn.email,
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, cooldownSec: result.cooldownSec },
      { status: result.status },
    );
  }

  return NextResponse.json({
    ok: true,
    alreadyVerified: Boolean(result.alreadyVerified),
  });
}
