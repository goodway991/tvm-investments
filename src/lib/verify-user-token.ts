import "server-only";
import { verifyIdToken } from "@/lib/firebase/admin";

/**
 * Prefer Admin SDK verifyIdToken only.
 * Identity Toolkit fallback is local/dev when Admin is unavailable — never in production.
 */
export async function verifyUserToken(idToken: string): Promise<{
  uid: string;
  email: string;
  emailVerified: boolean;
} | null> {
  const decoded = await verifyIdToken(idToken);
  if (decoded?.uid) {
    return {
      uid: decoded.uid,
      email: decoded.email || "unknown",
      emailVerified: Boolean(decoded.email_verified),
    };
  }

  const allowFallback =
    process.env.NODE_ENV !== "production" && process.env.VERCEL_ENV !== "production";
  if (!allowFallback) return null;

  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.trim();
  if (!apiKey) return null;

  try {
    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      },
    );
    if (!response.ok) return null;
    const payload = (await response.json()) as {
      users?: Array<{
        localId?: string;
        email?: string;
        emailVerified?: boolean;
      }>;
    };
    const user = payload.users?.[0];
    if (!user?.localId) return null;
    return {
      uid: user.localId,
      email: user.email || "unknown",
      emailVerified: Boolean(user.emailVerified),
    };
  } catch {
    return null;
  }
}
