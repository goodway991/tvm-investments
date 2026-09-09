/** Practical email check — rejects obvious fakes; OTP proves inbox ownership. */
export function isValidEmailAddress(value: string): boolean {
  const email = value.trim();
  if (email.length < 5 || email.length > 254) return false;
  if (email.includes(" ") || email.includes("..")) return false;
  const at = email.indexOf("@");
  if (at < 1 || at !== email.lastIndexOf("@")) return false;
  const local = email.slice(0, at);
  const domain = email.slice(at + 1).toLowerCase();
  if (!local || local.length > 64) return false;
  if (!domain.includes(".") || domain.startsWith(".") || domain.endsWith(".")) {
    return false;
  }
  if (!/^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+$/.test(local)) return false;
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(domain)) return false;
  const blocked = new Set([
    "example.com",
    "example.org",
    "example.net",
    "test.com",
    "localhost",
    "invalid",
    "mailinator.com",
    "guerrillamail.com",
    "tempmail.com",
    "10minutemail.com",
    "trashmail.com",
  ]);
  if (blocked.has(domain)) return false;
  return true;
}
