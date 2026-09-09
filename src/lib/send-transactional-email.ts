import "server-only";

export type TransactionalEmail = {
  to: string;
  subject: string;
  text: string;
  html: string;
  replyTo?: string;
};

/**
 * App-owned mail (OTP, password reset, feedback).
 * Tries SMTP first, then Resend. Never logs addresses or bodies.
 */
export async function sendTransactionalEmail(
  input: TransactionalEmail,
): Promise<boolean> {
  if (await sendWithSmtp(input)) return true;
  if (await sendWithResend(input)) return true;
  return false;
}

async function sendWithResend(input: TransactionalEmail): Promise<boolean> {
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
        to: [input.to],
        reply_to: input.replyTo,
        subject: input.subject,
        text: input.text,
        html: input.html,
      }),
    });
    if (!response.ok) {
      console.error("Transactional email failed (Resend).");
      return false;
    }
    return true;
  } catch {
    console.error("Transactional email failed (Resend).");
    return false;
  }
}

async function sendWithSmtp(input: TransactionalEmail): Promise<boolean> {
  const inboxFallback = process.env.TVM_ADMIN_EMAIL?.trim() || "";
  const user = process.env.TVM_SMTP_USER?.trim() || inboxFallback;
  const pass = process.env.TVM_SMTP_PASS?.trim();
  if (!pass || !user) return false;

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
      to: input.to,
      replyTo: input.replyTo,
      subject: input.subject,
      text: input.text,
      html: input.html,
    });
    return true;
  } catch {
    console.error("Transactional email failed (SMTP).");
    return false;
  }
}
