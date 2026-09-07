import { NextResponse } from "next/server";
import {
  buildDiscordAuthorizeUrl,
  getDiscordOAuthConfig,
  signOAuthState,
} from "@/lib/discord-oauth";
import {
  linkedRolesVerificationUrl,
  registerDiscordRoleConnectionMetadata,
} from "@/lib/discord-linked-roles";

export const dynamic = "force-dynamic";

/**
 * Discord Developer Portal → General Information → Linked Roles Verification URL
 * Paste: https://tvminvest.com/api/discord/linked-role
 *
 * Discord opens this when a member verifies a linked role that requires TVM.
 */
export async function GET() {
  const config = getDiscordOAuthConfig();
  if (!config) {
    return NextResponse.json(
      { error: "Discord OAuth is not configured.", verificationUrl: linkedRolesVerificationUrl() },
      { status: 503 },
    );
  }

  try {
    await registerDiscordRoleConnectionMetadata();
  } catch (error) {
    console.warn("[discord] role metadata register:", error);
  }

  const state = signOAuthState({
    returnTo: "/api/discord/linked-role",
    guest: true,
    flow: "linked_role",
  });

  return NextResponse.redirect(
    buildDiscordAuthorizeUrl(state, config, { flow: "linked_role" }),
  );
}
