import { NextRequest, NextResponse } from "next/server";
import { requireSignedIn } from "@/lib/api-guard";
import {
  buildDiscordAuthorizeUrl,
  getDiscordOAuthConfig,
  signOAuthState,
} from "@/lib/discord-oauth";
import { verifyUserToken } from "@/lib/verify-user-token";

export const dynamic = "force-dynamic";

function bearerToken(request: NextRequest) {
  const header = request.headers.get("authorization");
  return header?.startsWith("Bearer ") ? header.slice("Bearer ".length).trim() : "";
}

function sanitizeReturnTo(value: string | undefined) {
  const path = (value || "/dashboard/settings").trim();
  if (!path.startsWith("/") || path.startsWith("//")) return "/dashboard/settings";
  return path;
}

export async function GET(request: NextRequest) {
  const config = getDiscordOAuthConfig();
  if (!config) {
    return NextResponse.json({ error: "Discord OAuth is not configured." }, { status: 503 });
  }

  const returnTo = sanitizeReturnTo(request.nextUrl.searchParams.get("returnTo") || undefined);
  const guest = request.nextUrl.searchParams.get("guest") === "1";
  const token = bearerToken(request);
  const verified = token ? await verifyUserToken(token) : null;

  const state = signOAuthState({
    returnTo,
    guest: guest || !verified,
    uid: verified?.uid,
  });

  return NextResponse.redirect(buildDiscordAuthorizeUrl(state, config));
}

export async function POST(request: NextRequest) {
  const gate = await requireSignedIn(request);
  if (!gate.ok) return gate.response;

  const config = getDiscordOAuthConfig();
  if (!config) {
    return NextResponse.json({ error: "Discord OAuth is not configured." }, { status: 503 });
  }

  let returnTo = "/dashboard/settings";
  try {
    const body = (await request.json()) as { returnTo?: string };
    returnTo = sanitizeReturnTo(body.returnTo);
  } catch {
    /* default */
  }

  const state = signOAuthState({
    returnTo,
    guest: false,
    uid: gate.uid,
  });

  return NextResponse.json({ url: buildDiscordAuthorizeUrl(state, config) });
}
