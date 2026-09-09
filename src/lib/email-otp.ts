import "server-only";
import { createHash, randomInt, timingSafeEqual } from "crypto";
import { getAdminDb, isAdminEmail } from "@/lib/firebase/admin";
import { sendTransactionalEmail } from "@/lib/send-transactional-email";
import { escapeHtml } from "@/lib/sanitize-text";

const OTP_TTL_MS = 10 * 60 * 1000;
const RESEND_COOLDOWN_MS = 45_000;
const MAX_SENDS_PER_HOUR = 5;
const MAX_ATTEMPTS = 5;
const COLLECTION = "email_otps";

function otpPepper() {
  return (
    process.env.TVM_FEEDBACK_UNLOCK?.trim() ||
    process.env.FIREBASE_ADMIN_PRIVATE_KEY?.slice(0, 48) ||
    "tvm-email-otp"
  );
}

function hashCode(code: string, salt: string) {
  return createHash("sha256")
    .update(`${salt}:${code}:${otpPepper()}`)
    .digest("hex");
}

function safeEqualHex(a: string, b: string) {
  try {
    const left = Buffer.from(a, "hex");
    const right = Buffer.from(b, "hex");
    if (left.length !== right.length) return false;
    return timingSafeEqual(left, right);
  } catch {
    return false;
  }
}

function generateCode() {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

async function getAdminAuth() {
  await getAdminDb();
  const { getApps } = await import("firebase-admin/app");
  const { getAuth } = await import("firebase-admin/auth");
  const app = getApps()[0];
  return app ? getAuth(app) : null;
}

export async function markEmailVerified(uid: string): Promise<boolean> {
  const auth = await getAdminAuth();
  const db = await getAdminDb();
  if (!auth) return false;
  try {
    await auth.updateUser(uid, { emailVerified: true });
    if (db) {
      await db
        .collection("users")
        .doc(uid)
        .set(
          {
            emailVerifiedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          { merge: true },
        )
        .catch(() => undefined);
    }
    return true;
  } catch {
    console.error("Failed to mark email verified.");
    return false;
  }
}

/**
 * One-time email proof for every non-admin account.
 * Only Firestore emailVerifiedAt (set after OTP) or admin skips the code UI.
 * Previously grandfathered Auth flags do not count — those users get one OTP on next login.
 */
export async function ensureEmailVerifiedOrGrandfather(input: {
  uid: string;
  email: string;
  emailVerified: boolean;
}): Promise<{ verified: boolean }> {
  if (isAdminEmail(input.email)) {
    await markEmailVerified(input.uid);
    return { verified: true };
  }

  const db = await getAdminDb();
  if (!db) return { verified: false };

  try {
    const snap = await db.collection("users").doc(input.uid).get();
    const data = snap.exists ? snap.data() || {} : {};

    if (typeof data.emailVerifiedAt === "string" && data.emailVerifiedAt) {
      if (!input.emailVerified) await markEmailVerified(input.uid);
      return { verified: true };
    }

    // Clear a stale Auth "verified" flag from the old grandfather path so the
    // client shows the one-time code UI for existing accounts.
    if (input.emailVerified) {
      const auth = await getAdminAuth();
      if (auth) {
        await auth.updateUser(input.uid, { emailVerified: false }).catch(() => undefined);
      }
    }
  } catch {
    console.error("Email verification status check failed.");
  }

  return { verified: false };
}

/** Status-only: never sends mail. Used so later logins skip the OTP UI. */
export async function checkEmailVerificationStatus(input: {
  uid: string;
  email: string;
}): Promise<{ verified: boolean }> {
  const auth = await getAdminAuth();
  if (!auth) return { verified: false };
  try {
    const record = await auth.getUser(input.uid);
    return ensureEmailVerifiedOrGrandfather({
      uid: input.uid,
      email: input.email,
      emailVerified: Boolean(record.emailVerified),
    });
  } catch {
    return { verified: false };
  }
}

export async function issueEmailOtp(input: {
  uid: string;
  email: string;
}): Promise<
  | { ok: true; alreadyVerified?: boolean; cooldownSec?: number }
  | { ok: false; error: string; status: number; cooldownSec?: number }
> {
  const auth = await getAdminAuth();
  const db = await getAdminDb();
  if (!auth || !db) {
    return { ok: false, error: "Email verification is unavailable.", status: 503 };
  }

  let record: { emailVerified?: boolean } | null = null;
  try {
    record = await auth.getUser(input.uid);
  } catch {
    return { ok: false, error: "Sign in required.", status: 401 };
  }

  const grandfather = await ensureEmailVerifiedOrGrandfather({
    uid: input.uid,
    email: input.email,
    emailVerified: Boolean(record.emailVerified),
  });
  if (grandfather.verified) {
    return { ok: true, alreadyVerified: true };
  }

  const ref = db.collection(COLLECTION).doc(input.uid);
  const existing = await ref.get();
  const now = Date.now();
  const prev = existing.data() || {};
  const lastSentAt = Number(prev.sentAt) || 0;
  if (lastSentAt && now - lastSentAt < RESEND_COOLDOWN_MS) {
    const cooldownSec = Math.ceil((RESEND_COOLDOWN_MS - (now - lastSentAt)) / 1000);
    return {
      ok: false,
      error: `Wait ${cooldownSec}s before requesting another code.`,
      status: 429,
      cooldownSec,
    };
  }

  const hourStart = now - 60 * 60 * 1000;
  const sends = Array.isArray(prev.sendTimes)
    ? (prev.sendTimes as number[]).filter((t) => Number(t) > hourStart)
    : [];
  if (sends.length >= MAX_SENDS_PER_HOUR) {
    return {
      ok: false,
      error: "Too many codes sent. Try again in an hour.",
      status: 429,
    };
  }

  const code = generateCode();
  const salt = createHash("sha256")
    .update(`${input.uid}:${now}:${randomInt(1e9)}`)
    .digest("hex")
    .slice(0, 24);
  const hash = hashCode(code, salt);
  const sendTimes = [...sends, now].slice(-MAX_SENDS_PER_HOUR);

  await ref.set({
    uid: input.uid,
    email: input.email.toLowerCase(),
    hash,
    salt,
    attempts: 0,
    expiresAt: now + OTP_TTL_MS,
    sentAt: now,
    sendTimes,
    updatedAt: new Date().toISOString(),
  });

  const emailed = await sendTransactionalEmail({
    to: input.email,
    subject: "Your TVM verification code",
    text: [
      "Your TVM Investments verification code is:",
      "",
      code,
      "",
      "It expires in 10 minutes. If you did not create or sign in to a TVM account, ignore this email.",
    ].join("\n"),
    html: `
      <div style="font-family:Georgia,serif;color:#12203c;line-height:1.5">
        <p>Your TVM Investments verification code is:</p>
        <p style="font-size:28px;letter-spacing:6px;font-weight:700;margin:20px 0">${escapeHtml(code)}</p>
        <p style="color:#5a6b82;font-size:14px">Expires in 10 minutes. If you did not request this, ignore this email.</p>
      </div>
    `,
  });

  if (!emailed) {
    await ref.delete().catch(() => undefined);
    return {
      ok: false,
      error: "Could not send a verification email. Try again in a minute.",
      status: 502,
    };
  }

  return { ok: true };
}

export async function consumeEmailOtp(input: {
  uid: string;
  email: string;
  code: string;
}): Promise<
  | { ok: true }
  | { ok: false; error: string; status: number }
> {
  const code = input.code.replace(/\s+/g, "");
  if (!/^\d{6}$/.test(code)) {
    return { ok: false, error: "Enter the 6-digit code from your email.", status: 400 };
  }

  const db = await getAdminDb();
  if (!db) {
    return { ok: false, error: "Email verification is unavailable.", status: 503 };
  }

  const ref = db.collection(COLLECTION).doc(input.uid);
  const snap = await ref.get();
  if (!snap.exists) {
    return {
      ok: false,
      error: "No active code. Request a new verification email.",
      status: 400,
    };
  }

  const data = snap.data() || {};
  const now = Date.now();
  const expiresAt = Number(data.expiresAt) || 0;
  const attempts = Number(data.attempts) || 0;
  if (!expiresAt || now > expiresAt) {
    await ref.delete().catch(() => undefined);
    return {
      ok: false,
      error: "That code expired. Request a new one.",
      status: 400,
    };
  }
  if (attempts >= MAX_ATTEMPTS) {
    await ref.delete().catch(() => undefined);
    return {
      ok: false,
      error: "Too many incorrect attempts. Request a new code.",
      status: 429,
    };
  }

  const expected = String(data.hash || "");
  const salt = String(data.salt || "");
  const actual = hashCode(code, salt);
  if (!safeEqualHex(expected, actual)) {
    await ref.set({ attempts: attempts + 1, updatedAt: new Date().toISOString() }, { merge: true });
    return { ok: false, error: "Incorrect code. Try again.", status: 400 };
  }

  const marked = await markEmailVerified(input.uid);
  await ref.delete().catch(() => undefined);
  if (!marked) {
    return { ok: false, error: "Could not verify that email. Try again.", status: 503 };
  }
  return { ok: true };
}

export async function sendPasswordResetMail(input: {
  email: string;
  continueUrl: string;
}): Promise<boolean> {
  const auth = await getAdminAuth();
  if (!auth) return false;

  let link: string;
  try {
    const user = await auth.getUserByEmail(input.email);
    if (!user) return true;
    link = await auth.generatePasswordResetLink(input.email, {
      url: input.continueUrl,
      handleCodeInApp: false,
    });
  } catch {
    // Do not reveal whether the address exists.
    return true;
  }

  const emailed = await sendTransactionalEmail({
    to: input.email,
    subject: "Reset your TVM password",
    text: [
      "Reset your TVM Investments password using this link:",
      "",
      link,
      "",
      "This link expires soon. If you did not request a reset, you can ignore this email.",
    ].join("\n"),
    html: `
      <div style="font-family:Georgia,serif;color:#12203c;line-height:1.5">
        <p>Reset your TVM Investments password:</p>
        <p style="margin:24px 0">
          <a href="${escapeHtml(link)}"
             style="display:inline-block;background:#255ae6;color:#fff;text-decoration:none;padding:12px 22px;border-radius:999px;font-weight:600">
            Choose a new password
          </a>
        </p>
        <p style="color:#5a6b82;font-size:13px;word-break:break-all">${escapeHtml(link)}</p>
        <p style="color:#5a6b82;font-size:14px">If you did not request this, ignore this email.</p>
      </div>
    `,
  });

  if (!emailed) {
    console.error("Password reset email failed to send.");
    return false;
  }
  return true;
}
