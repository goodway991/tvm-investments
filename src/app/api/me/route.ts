import { NextRequest, NextResponse } from "next/server";
import { requireSignedIn } from "@/lib/api-guard";
import { getEntitlementForUid, getPlanForUser, isAdminEmail } from "@/lib/firebase/admin";

export const dynamic = "force-dynamic";

/** Signed-in identity flags for the UI — never expose admin email to the client. */
export async function GET(request: NextRequest) {
  const gate = await requireSignedIn(request);
  if (!gate.ok) return gate.response;

  const [plan, entitlement] = await Promise.all([
    getPlanForUser(gate.uid, gate.email),
    getEntitlementForUid(gate.uid),
  ]);
  const isAdmin = isAdminEmail(gate.email) || entitlement?.role === "admin";

  return NextResponse.json({
    uid: gate.uid,
    isAdmin,
    plan,
    role: isAdmin ? "admin" : "client",
  });
}
