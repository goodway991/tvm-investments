#!/usr/bin/env npx tsx
/**
 * Copy a Firebase service-account JSON into .env.local as Admin keys.
 * Usage: npx tsx scripts/apply-firebase-admin.ts /path/to/service-account.json
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const jsonPath = process.argv[2];
if (!jsonPath) {
  console.error("Usage: npx tsx scripts/apply-firebase-admin.ts <service-account.json>");
  process.exit(1);
}

const raw = JSON.parse(readFileSync(resolve(jsonPath), "utf8")) as {
  project_id?: string;
  client_email?: string;
  private_key?: string;
};

if (!raw.project_id || !raw.client_email || !raw.private_key) {
  console.error("That file is not a Firebase service-account JSON.");
  process.exit(1);
}

const envPath = resolve(process.cwd(), ".env.local");
const existing = existsSync(envPath) ? readFileSync(envPath, "utf8") : "";
const lines = existing.split(/\r?\n/);
const next = new Map<string, string>([
  ["FIREBASE_ADMIN_PROJECT_ID", raw.project_id],
  ["FIREBASE_ADMIN_CLIENT_EMAIL", raw.client_email],
  ["FIREBASE_ADMIN_PRIVATE_KEY", raw.private_key],
]);

const used = new Set<string>();
const out: string[] = [];
for (const line of lines) {
  const match = line.match(/^([A-Z0-9_]+)=/);
  if (match && next.has(match[1])) {
    out.push(`${match[1]}=${JSON.stringify(next.get(match[1]))}`);
    used.add(match[1]);
  } else if (line.length > 0 || out.length > 0) {
    out.push(line);
  }
}
for (const [key, value] of next) {
  if (!used.has(key)) out.push(`${key}=${JSON.stringify(value)}`);
}

writeFileSync(envPath, `${out.filter((line, i, arr) => !(line === "" && arr[i - 1] === "")).join("\n").trimEnd()}\n`);
console.log(`Wrote Firebase Admin keys for ${raw.client_email} into .env.local`);
console.log("Do not commit that JSON file or .env.local.");
