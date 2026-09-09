import { NextRequest, NextResponse } from "next/server";
import { requireApiUser } from "@/lib/api-guard";
import {
  isAdminEmail,
  listFeedback,
  saveFeedback,
  verifyIdToken,
} from "@/lib/firebase/admin";
import { getFeedbackInbox } from "@/lib/feedback-inbox";
import { escapeHtml, sanitizePlainText } from "@/lib/sanitize-text";
import { sendTransactionalEmail } from "@/lib/send-transactional-email";

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

  const kind =
    body.kind === "feature"
      ? "feature"
      : body.kind === "support"
        ? "support"
        : body.kind === "bug"
          ? "bug"
          : null;
  const rating = Number(body.rating);
  const message = sanitizePlainText(String(body.message ?? ""), {
    minLength: 8,
    maxLength: 4000,
    allowNewlines: true,
  });

  if (!kind) {
    return NextResponse.json(
      { error: "Choose a bug report, feature request, or support." },
      { status: 400 },
    );
  }
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "Pick a rating from 1 to 5 stars." }, { status: 400 });
  }
  if (!message) {
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
  if (kind === "support") return "Support";
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
  const subject = `[TVM ${kind === "bug" ? "bug" : kind === "support" ? "support" : "feature"}] ${rating}/5 stars from ${email}`;
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

  return sendTransactionalEmail({
    to,
    subject,
    text,
    html,
    replyTo: email !== "unknown" ? email : undefined,
  });
}

