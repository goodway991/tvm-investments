import { NextRequest, NextResponse } from "next/server";
import { saveFeedback } from "@/lib/firebase/admin";
import { getFeedbackInbox } from "@/lib/feedback-inbox";
import { verifyUserToken } from "@/lib/verify-user-token";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : "";
  if (!token) {
    return NextResponse.json({ error: "Sign in to send feedback." }, { status: 401 });
  }

  const user = await verifyUserToken(token);
  if (!user) {
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

  const to = getFeedbackInbox();
  if (!to) {
    console.error("Feedback inbox is not configured.");
    return NextResponse.json(
      { error: "Couldn't send that note. Try again in a minute." },
      { status: 503 },
    );
  }

  const emailed = await sendFeedbackEmail({
    to,
    email: user.email,
    kind,
    rating,
    message,
  });

  try {
    await saveFeedback({
      uid: user.uid,
      email: user.email,
      kind,
      rating,
      message,
    });
  } catch (error) {
    console.error("Feedback save failed.");
    console.error(error instanceof Error ? error.name : "unknown");
  }

  if (!emailed) {
    return NextResponse.json(
      { error: "Couldn't send that note. Try again in a minute." },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
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
  to,
  email,
  kind,
  rating,
  message,
}: {
  to: string;
  email: string;
  kind: string;
  rating: number;
  message: string;
}): Promise<boolean> {
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
    <div style="font-family:Georgia,serif;color:#12203c;line-height:1.5">
      <p><strong>From:</strong> ${escapeHtml(email)}</p>
      <p><strong>Type:</strong> ${escapeHtml(label)}</p>
      <p style="font-size:20px;letter-spacing:2px;margin:16px 0 4px">
        <strong>Rating:</strong> ${formatStarMarks(rating)}
      </p>
      <p style="margin:0 0 16px;font-weight:700">${rating}/5 stars</p>
      <p style="white-space:pre-wrap">${escapeHtml(message)}</p>
    </div>
  `;

  if (await sendWithResend({ to, email, subject, text, html })) return true;
  if (await sendWithSmtp({ to, email, subject, text, html })) return true;
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
      console.error("Feedback email failed (Resend).");
      return false;
    }
    return true;
  } catch {
    console.error("Feedback email failed (Resend).");
    return false;
  }
}

async function sendWithSmtp({
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
  const user = process.env.TVM_SMTP_USER?.trim();
  const pass = process.env.TVM_SMTP_PASS?.trim();
  if (!user || !pass) return false;

  const host = process.env.TVM_SMTP_HOST?.trim() || "smtp.gmail.com";
  const port = Number(process.env.TVM_SMTP_PORT) || 465;

  try {
    const nodemailer = await import("nodemailer");
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
    await transporter.sendMail({
      from: `TVM Investments <${user}>`,
      to,
      replyTo: email !== "unknown" ? email : undefined,
      subject,
      text,
      html,
    });
    return true;
  } catch {
    console.error("Feedback email failed (SMTP).");
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
        email: email !== "unknown" ? email : "noreply@tvm-investments.vercel.app",
        type: label,
        rating: stars,
        message: text,
        details: message,
      }),
    });
    const payload = (await response.json().catch(() => null)) as
      | { success?: boolean | string }
      | null;
    const success = payload?.success === true || payload?.success === "true";
    if (!response.ok || !success) {
      console.error("Feedback email failed (backup).");
      return false;
    }
    return true;
  } catch {
    console.error("Feedback email failed (backup).");
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
