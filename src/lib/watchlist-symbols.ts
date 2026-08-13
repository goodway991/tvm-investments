import { DOW_30, SP500 } from "@/lib/indices/constituents";

/** Popular liquid names that are not always in the S&P 500 snapshot list. */
export const WATCHLIST_EXTRA_SYMBOLS = [
  "ARM",
  "COIN",
  "HOOD",
  "MSTR",
  "RIVN",
  "SHOP",
  "SOFI",
] as const;

/** Full research scan: S&P 500 + Dow 30 + extras. */
export const YAHOO_SCAN_UNIVERSE: string[] = Array.from(
  new Set([...SP500, ...DOW_30, ...WATCHLIST_EXTRA_SYMBOLS]),
).sort();

export const WATCHLIST_ALLOWED_SYMBOLS = YAHOO_SCAN_UNIVERSE;
