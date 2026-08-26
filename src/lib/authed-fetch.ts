"use client";

import { onAuthStateChanged, type User } from "firebase/auth";
import { getClientAuth } from "@/lib/firebase/client";

async function currentUser(timeoutMs = 8000): Promise<User | null> {
  const auth = getClientAuth();
  if (!auth) return null;
  if (auth.currentUser) return auth.currentUser;

  return new Promise((resolve) => {
    const timeout = window.setTimeout(() => {
      unsub();
      resolve(auth.currentUser);
    }, timeoutMs);
    const unsub = onAuthStateChanged(auth, (user) => {
      window.clearTimeout(timeout);
      unsub();
      resolve(user);
    });
  });
}

/** Dashboard fetches to TVM API routes. Attaches the Firebase ID token. */
export async function authedFetch(input: RequestInfo | URL, init?: RequestInit) {
  const user = await currentUser();
  const headers = new Headers(init?.headers);
  if (user) {
    headers.set("Authorization", `Bearer ${await user.getIdToken()}`);
  }
  return fetch(input, { ...init, headers });
}
