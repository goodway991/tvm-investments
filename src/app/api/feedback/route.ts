import { NextRequest, NextResponse } from "next/server";
import { saveFeedback, verifyIdToken } from "@/lib/firebase/admin";

export const dynamic = "force-dynamic";

// Temporary ops inbox until the domain / Workspace address exists.
// Override with TVM_CONTACT_EMAIL. Do not expose this on public pages.
const FALLBACK_FEEDBACK_TO = "varish.desai@gmail.com";

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : "";
  if (!token) {
    return NextResponse.json({ error: "Sign in to send feedback." }, { status: 401 });
  }

  const decoded = await verifyIdToken(token);
  if (!decoded) {
    return NextResponse.json({ error: "Sign in to send feedback." }, { status: 401 });
  }

  let body: { kind?: string; rating?: number; message?: string };
  try {
    body = (await request.json()) as { kind?: string; rating?: number; message?: string };
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const kind = body.kind === "feature" ? "feature" : body.kind === "bug" ? "bug" : null;
  const rating = Number(body.rating);
  const message = String(body.message ?? "").trim();

  if (!kind) {
    return NextResponse.json({ error: "Choose a bug report or feature request." }, { status: 400 });
  }
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "Pick a rating from 1 to 5 stars." }, { status: 400 });
  }
  if (message.length < 8 || message.length > 4000) {
    return NextResponse.json(
      { error: "Write between 8 and 4,000 characters." },
      { status: 400 },
    );
  }

  const email = decoded.email || "unknown";
  const uid = decoded.uid;
  const saved = await saveFeedback({ uid, email, kind, rating, message });
  const emailed = await sendFeedbackEmail({ email, kind, rating, message });

  if (!saved && !emailed) {
    console.info("Feedback (held until inbox/Firebase is ready)", {
      uid,
      email,
      kind,
      rating,
      message,
    });
  }

  return NextResponse.json({ ok: true, saved, emailed });
}

function feedbackToAddress() {
  return process.env.TVM_CONTACT_EMAIL?.trim() || FALLBACK_FEEDBACK_TO;
}

function formatStarMarks(rating: number) {
  return `${"★".repeat(rating)}${"☆".repeat(5 - rating)}`;
}

function ratingLine(rating: number) {
  return `${formatStarMarks(rating)}  ${rating}/5 stars`;
}

function kindLabel(kind: string) {
  return kind === "bug" ? "Bug report" : "Feature request";
}

async function sendFeedbackEmail({
  email,
  kind,
  rating,
  message,
}: {
  email: string;
  kind: string;
  rating: number;
  message: string;
}): Promise<boolean> {
  const to = feedbackToAddress();
  const stars = ratingLine(rating);
  const label = kindLabel(kind);
  const subject = `[TVM ${kind === "bug" ? "bug" : "feature"}] ${rating}/5 stars from ${email}`;
  const text = [
    `From: ${email}`,
    `Type: ${label}`,
    `Rating: ${stars}`,
    "",
    message,
  ].join("\n");
  const html = `
    <div style="font-family:Georgia,serif;color:#1a1442;line-height:1.5">
      <p><strong>From:</strong> ${escapeHtml(email)}</p>
      <p><strong>Type:</strong> ${escapeHtml(label)}</p>
      <p style="font-size:20px;letter-spacing:2px;margin:16px 0 4px">
        <strong>Rating:</strong> ${formatStarMarks(rating)}
      </p>
      <p style="margin:0 0 16px;font-weight:700">${rating}/5 stars</p>
      <p style="white-space:pre-wrap">${escapeHtml(message)}</p>
    </div>
  `;

  const viaResend = await sendWithResend({ to, email, subject, text, html });
  if (viaResend) return true;
  return sendWithFormSubmit({ to, email, subject, text, stars, label, message });
}

async function sendWithResend({
  to,
  email,
  subject,
  text,
  html,
}: {
  to: string;
  email: string;
  subject: string;
  text: string;
  html: string;
}): Promise<boolean> {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) return false;

  const from =
    process.env.TVM_FEEDBACK_FROM?.trim() ||
    "TVM Investments <beth.t@example.com>";

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        reply_to: email !== "unknown" ? email : undefined,
        subject,
        text,
        html,
      }),
    });
    if (!response.ok) {
      console.error("Feedback email failed (Resend):", await response.text());
      return false;
    }
    return true;
  } catch (error) {
    console.error("Feedback email failed (Resend):", error);
    return false;
  }
}

async function sendWithFormSubmit({
  to,
  email,
  subject,
  text,
  stars,
  label,
  message,
}: {
  to: string;
  email: string;
  subject: string;
  text: string;
  stars: string;
  label: string;
  message: string;
}): Promise<boolean> {
  try {
    const response = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(to)}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        _subject: subject,
        _template: "box",
        _captcha: "false",
        email: email !== "unknown" ? email : to,
        type: label,
        rating: stars,
        message: text,
        details: message,
      }),
    });
    if (!response.ok) {
      console.error("Feedback email failed (backup):", await response.text());
      return false;
    }
    return true;
  } catch (error) {
    console.error("Feedback email failed (backup):", error);
    return false;
  }
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
