import "server-only";
import { createDecipheriv } from "crypto";

/** AES-256-GCM blob. Decrypts only on the server with TVM_FEEDBACK_UNLOCK. */
const INBOX_BLOB = "+/1NZWkuqj7MtCid00Dgo/jp6dVHH5ef6vlI9aOvLomNXCgaaVqgK1Sclqhj1JOGqpUFug==";

export function getFeedbackInbox(): string | null {
  const override = process.env.TVM_CONTACT_EMAIL?.trim();
  if (override) return override;

  const keyHex = process.env.TVM_FEEDBACK_UNLOCK?.trim();
  if (!keyHex || keyHex.length !== 64) return null;

  try {
    const key = Buffer.from(keyHex, "hex");
    const packed = Buffer.from(INBOX_BLOB, "base64");
    const iv = packed.subarray(0, 12);
    const tag = packed.subarray(12, 28);
    const data = packed.subarray(28);
    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    const email = Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8").trim();
    return email.includes("@") ? email : null;
  } catch {
    return null;
  }
}
