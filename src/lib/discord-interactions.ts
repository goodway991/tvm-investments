import "server-only";
import { createPublicKey, verify } from "crypto";
import { DISCORD_INVITE_URL } from "@/lib/community";

const ED25519_SPKI_PREFIX = Buffer.from("302a300506032b6570032100", "hex");

export function verifyDiscordInteractionSignature(
  publicKeyHex: string,
  signatureHex: string,
  timestamp: string,
  rawBody: string,
) {
  try {
    const key = createPublicKey({
      key: Buffer.concat([ED25519_SPKI_PREFIX, Buffer.from(publicKeyHex, "hex")]),
      format: "der",
      type: "spki",
    });
    return verify(
      null,
      Buffer.from(timestamp + rawBody),
      key,
      Buffer.from(signatureHex, "hex"),
    );
  } catch {
    return false;
  }
}

export function discordInteractionResponse(commandName: string | undefined) {
  const name = (commandName || "").toLowerCase();
  if (name === "desk") {
    return {
      type: 4,
      data: {
        content:
          "Open the TVM desk: https://tvminvest.com/dashboard\nLink Discord in Settings after you sign in.",
      },
    };
  }
  if (name === "brief") {
    return {
      type: 4,
      data: {
        content: "Daily Brief: https://tvminvest.com/dashboard/brief",
      },
    };
  }
  return {
    type: 4,
    data: {
      content: [
        "**TVM Investments**",
        "1. Sign in at https://tvminvest.com/login",
        "2. Click **Connect Discord account** (or Settings → Discord)",
        `3. Join the server: ${DISCORD_INVITE_URL}`,
      ].join("\n"),
    },
  };
}
