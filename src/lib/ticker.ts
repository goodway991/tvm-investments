export const TICKER_PATTERN = /^[A-Z.\-]{1,8}$/i;

export function parseTicker(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const symbol = raw.trim().toUpperCase();
  return TICKER_PATTERN.test(symbol) ? symbol : null;
}
