import { NextRequest, NextResponse } from "next/server";
import { saveFeedback, verifyIdToken } from "@/lib/firebase/admin";

export const dynamic = "force-dynamic";

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
  const to = process.env.TVM_CONTACT_EMAIL;
  const key = process.env.RESEND_API_KEY;
  if (!to || !key) return false;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "TVM Investments <noreply@tvm-investments.test>",
        to: [to],
        subject: `[TVM ${kind === "bug" ? "bug" : "feature"}] ${rating}/5 from ${email}`,
        text: `From: ${email}\nType: ${kind}\nRating: ${rating}/5\n\n${message}`,
      }),
    });
    return response.ok;
  } catch (error) {
    console.error("Feedback email failed:", error);
    return false;
  }
}
