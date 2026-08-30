#!/usr/bin/env node
/**
 * Local Discord OAuth setup for TVM Investments.
 * Usage:
 *   DISCORD_CLIENT_ID=... DISCORD_CLIENT_SECRET=... node scripts/setup-discord-oauth.mjs
 * Optional:
 *   DISCORD_GUILD_ID=... DISCORD_BOT_TOKEN=...
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = resolve(root, ".env.local");

const required = ["DISCORD_CLIENT_ID", "DISCORD_CLIENT_SECRET"];
const optional = [
  "DISCORD_REDIRECT_URI",
  "DISCORD_GUILD_ID",
  "DISCORD_BOT_TOKEN",
  "DISCORD_OAUTH_SECRET",
];

function upsertEnv(lines, key, value) {
  const next = `${key}=${value}`;
  const index = lines.findIndex((line) => line.startsWith(`${key}=`));
  if (index >= 0) lines[index] = next;
  else lines.push(next);
}

const missing = required.filter((key) => !process.env[key]?.trim());
if (missing.length) {
  console.error("Missing env vars:", missing.join(", "));
  console.error(
    "Create a Discord app at https://discord.com/developers/applications, then run:",
  );
  console.error(
    "  DISCORD_CLIENT_ID=... DISCORD_CLIENT_SECRET=... node scripts/setup-discord-oauth.mjs",
  );
  process.exit(1);
}

const defaults = {
  DISCORD_REDIRECT_URI: "http://localhost:3000/api/discord/callback",
};

let lines = existsSync(envPath) ? readFileSync(envPath, "utf8").split(/\r?\n/) : [];
if (lines.length && lines[lines.length - 1] !== "") lines.push("");

lines.push("# Discord OAuth (localhost)");
for (const key of required) upsertEnv(lines, key, process.env[key].trim());
for (const key of optional) {
  const value = process.env[key]?.trim() || defaults[key];
  if (value) upsertEnv(lines, key, value);
}

writeFileSync(envPath, `${lines.join("\n")}\n`, "utf8");
console.log(`Updated ${envPath}`);
console.log("Restart npm run dev, then test /login → Connect Discord account.");
