import { NextRequest, NextResponse } from "next/server";
import { requireApiUser } from "@/lib/api-guard";
import {
  isAdminEmail,
  listFeedback,
  saveFeedback,
  verifyIdToken,
} from "@/lib/firebase/admin";
import { getFeedbackInbox } from "@/lib/feedback-inbox";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : "";
  if (!token) {
    return NextResponse.json({ error: "Sign in as admin." }, { status: 401 });
  }
  const decoded = await verifyIdToken(token);
  if (!decoded || !isAdminEmail(decoded.email)) {
    return NextResponse.json({ error: "Sign in as admin." }, { status: 403 });
  }

  try {
    const rows = await listFeedback();
    return NextResponse.json({ rows });
  } catch (error) {
    console.error("Feedback list failed.");
    console.error(error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ error: "Unable to load notes." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const gate = await requireApiUser(request, "feedback");
  if (!gate.ok) return gate.response;
  const user = { uid: gate.uid, email: gate.email };

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
  const emailed = to
    ? await sendFeedbackEmail({
        to,
        email: user.email,
        kind,
        rating,
        message,
      })
    : false;
  if (!to) {
    console.error("Feedback inbox is not configured.");
  }

  let saved = false;
  try {
    saved = await saveFeedback({
      uid: user.uid,
      email: user.email,
      kind,
      rating,
      message,
      emailed,
    });
  } catch (error) {
    console.error("Feedback save failed.");
    console.error(error instanceof Error ? error.name : "unknown");
  }

  if (!saved && !emailed) {
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

  if (await sendWithSmtp({ to, email, subject, text, html })) return true;
  if (await sendWithResend({ to, email, subject, text, html })) return true;
  return false;
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
  const user = process.env.TVM_SMTP_USER?.trim() || to;
  const pass = process.env.TVM_SMTP_PASS?.trim();
  if (!pass) return false;

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

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
