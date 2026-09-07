/**
 * Plain-text defenses for user-generated content.
 * React JSX already escapes on render — these are a second layer for storage,
 * email HTML, and any future non-React sinks.
 */

const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const HTML_META = /[<>&"'`\\/]/;

export function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/** Strip C0 controls (keep tab/newline for multi-line notes). */
export function stripControlChars(value: string, allowNewlines = false) {
  if (allowNewlines) {
    return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
  }
  return value.replace(CONTROL_CHARS, "").replace(/\s+/g, " ").trim();
}

/**
 * Normalize user plain text for storage/display.
 * Does not HTML-escape (React does that). Rejects oversized input.
 */
export function sanitizePlainText(
  value: string,
  opts: { maxLength: number; allowNewlines?: boolean; minLength?: number } = {
    maxLength: 4000,
  },
): string | null {
  const allowNewlines = opts.allowNewlines === true;
  let next = String(value ?? "");
  next = stripControlChars(next, allowNewlines);
  if (allowNewlines) {
    next = next.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
  } else {
    next = next.trim();
  }
  if (opts.minLength != null && next.length < opts.minLength) return null;
  if (next.length > opts.maxLength) return null;
  return next;
}

/** True when a person name has no digits, @, or HTML/script metacharacters. */
export function isSafePersonName(value: string) {
  const next = stripControlChars(value, false);
  if (next.length < 1 || next.length > 40) return false;
  if (/[0-9@]/.test(next)) return false;
  if (HTML_META.test(next)) return false;
  return true;
}

/** Allow only http(s) absolute URLs for outbound links from third-party data. */
export function safeHttpUrl(value: string | null | undefined): string | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}
