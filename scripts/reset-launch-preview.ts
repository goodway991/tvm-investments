#!/usr/bin/env tsx
/**
 * Clear What’s New + New-badge first-seen stamps for tester logins
 * so localhost 1.0 looks like launch day.
 */
import { loadEnvConfig } from "@next/env";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

loadEnvConfig(process.cwd());

function testerLogin(email: string) {
  const value = email.toLowerCase();
  return (
    value === "admin@tvm-investments.test" ||
    value.includes("vplayz") ||
    value.includes("varish.desai")
  );
}

function normalizePrivateKey(value?: string) {
  if (!value) return "";
  let key = value.trim();
  if (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  ) {
    key = key.slice(1, -1);
  }
  return key.replace(/\\n/g, "\n");
}

async function main() {
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = normalizePrivateKey(process.env.FIREBASE_ADMIN_PRIVATE_KEY);
  const databaseId =
    process.env.NEXT_PUBLIC_FIREBASE_DATABASE_ID || "tvm-investments";
  if (!projectId || !clientEmail || !privateKey) {
    throw new Error("Firebase Admin keys are missing from .env.local.");
  }

  const app =
    getApps()[0] ||
    initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
    });
  const auth = getAuth(app);
  const db = getFirestore(app, databaseId);

  const matched: string[] = [];
  let pageToken: string | undefined;
  do {
    const page = await auth.listUsers(1000, pageToken);
    for (const record of page.users) {
      if (record.email && testerLogin(record.email)) matched.push(record.uid);
    }
    pageToken = page.pageToken;
  } while (pageToken);

  if (!matched.length) {
    console.log("No tester accounts found.");
    return;
  }

  for (const uid of matched) {
    await db.collection("users").doc(uid).set(
      {
        seenRelease: FieldValue.delete(),
        newSeen: FieldValue.delete(),
        newSeenWave: FieldValue.delete(),
        updatedAt: new Date(),
      },
      { merge: true },
    );
  }

  console.log(`Reset launch preview for ${matched.length} tester account(s).`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
