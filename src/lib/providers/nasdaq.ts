import { parseTicker } from "@/lib/ticker";
import {
  LIBRARY_BROWSE,
  SCAN_ETF_LIMIT,
  SCAN_LARGE_CAP,
  SCAN_SMALL_CAP,
  SCAN_UNIVERSE_LIMIT,
} from "@/lib/watchlist-symbols";

export type NasdaqQuote = {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  marketCap: number | null;
  sector: string;
  industry: string;
  kind?: "stock" | "etf";
};

const NASDAQ_HEADERS = {
  Accept: "application/json,text/plain,*/*",
  "Accept-Language": "en-US,en;q=0.9",
  Origin: "https://www.nasdaq.com",
  Referer: "https://www.nasdaq.com/",
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
};

function parseMoney(raw: string | undefined) {
  if (!raw) return null;
  const value = Number(raw.replace(/[$,%]/g, "").replace(/,/g, ""));
  return Number.isFinite(value) ? value : null;
}

function rowFromNasdaq(row: Record<string, string>): NasdaqQuote | null {
  const symbol = parseTicker(row.symbol);
  if (!symbol) return null;
  const price = parseMoney(row.lastsale ?? row.lastSalePrice);
  if (!(price && price > 0)) return null;
  return {
    symbol,
    name: (row.name || row.companyName || symbol)
      .replace(/\s+Common Stock$/i, "")
      .replace(/\s+ETF Trust.*$/i, " ETF")
      .trim(),
    price,
    change: parseMoney(row.netchange ?? row.netChange) ?? 0,
    changePercent: parseMoney(row.pctchange ?? row.percentageChange) ?? 0,
    marketCap: parseMoney(row.marketCap),
    sector: (row.sector || "").trim(),
    industry: (row.industry || "").trim(),
    kind: "stock",
  };
}

function rowFromEtf(row: Record<string, string>): NasdaqQuote | null {
  const mapped = rowFromNasdaq({
    ...row,
    name: row.companyName || row.name,
    lastsale: row.lastSalePrice || row.lastsale,
    netchange: row.netChange || row.netchange,
    pctchange: row.percentageChange || row.pctchange,
  });
  if (!mapped) return null;
  return {
    ...mapped,
    sector: mapped.sector || "ETF",
    industry: mapped.industry || "Exchange Traded Fund",
    kind: "etf",
  };
}

function extractRows(payload: unknown): Array<Record<string, string>> {
  if (!payload || typeof payload !== "object") return [];
  const root = payload as {
    data?: {
      table?: { rows?: Array<Record<string, string>> };
      rows?: Array<Record<string, string>>;
      data?: { rows?: Array<Record<string, string>> };
      records?: { data?: { rows?: Array<Record<string, string>> } };
    };
  };
  return (
    root.data?.table?.rows ??
    root.data?.rows ??
    root.data?.data?.rows ??
    root.data?.records?.data?.rows ??
    []
  );
}

async function fetchNasdaqJson(url: string) {
  const response = await fetch(url, {
    headers: NASDAQ_HEADERS,
    cache: "no-store",
  });
  if (!response.ok) return [];
  return extractRows(await response.json());
}

async function fetchNasdaqDownload(kind: "stocks" | "etf") {
  const path = kind === "etf" ? "etf" : "stocks";
  const rows = await fetchNasdaqJson(
    `https://api.nasdaq.com/api/screener/${path}?tableonly=true&download=true`,
  );
  return rows;
}

async function fetchNasdaqPage(
  kind: "stocks" | "etf",
  limit: number,
  offset: number,
) {
  const path = kind === "etf" ? "etf" : "stocks";
  const urls = [
    `https://api.nasdaq.com/api/screener/${path}?limit=${limit}&offset=${offset}`,
    `https://api.nasdaq.com/api/screener/${path}?tableonly=true&limit=${limit}&offset=${offset}`,
  ];
  let rows: Array<Record<string, string>> = [];
  for (const url of urls) {
    rows = await fetchNasdaqJson(url);
    if (rows.some((row) => row.sector || row.industry || row.companyName)) {
      break;
    }
    if (rows.length > 0 && url === urls[urls.length - 1]) break;
  }
  return rows;
}

function collectQuotes(
  rows: Array<Record<string, string>>,
  mapRow: (row: Record<string, string>) => NasdaqQuote | null,
  seen: Set<string>,
  quotes: NasdaqQuote[],
  limit?: number,
) {
  for (const row of rows) {
    const quote = mapRow(row);
    if (!quote || seen.has(quote.symbol)) continue;
    seen.add(quote.symbol);
    quotes.push(quote);
    if (limit != null && quotes.length >= limit) break;
  }
}

export async function fetchNasdaqScreener(limit = 1500): Promise<NasdaqQuote[]> {
  const quotes: NasdaqQuote[] = [];
  const seen = new Set<string>();
  try {
    collectQuotes(await fetchNasdaqDownload("stocks"), rowFromNasdaq, seen, quotes, limit);
  } catch (error) {
    console.warn("NASDAQ stock download unavailable:", error);
  }
  if (quotes.length >= Math.min(limit, 200)) return quotes.slice(0, limit);

  const pageSize = Math.min(250, limit);
  for (let offset = 0; offset < limit && quotes.length < limit; offset += pageSize) {
    const rows = await fetchNasdaqPage("stocks", pageSize, offset);
    if (rows.length === 0) break;
    const before = quotes.length;
    collectQuotes(rows, rowFromNasdaq, seen, quotes, limit);
    if (quotes.length === before) break;
  }
  return quotes;
}

export async function fetchNasdaqEtfs(limit = 8_000): Promise<NasdaqQuote[]> {
  const quotes: NasdaqQuote[] = [];
  const seen = new Set<string>();
  try {
    collectQuotes(await fetchNasdaqDownload("etf"), rowFromEtf, seen, quotes, limit);
  } catch (error) {
    console.warn("NASDAQ ETF download unavailable:", error);
  }
  if (quotes.length >= Math.min(limit, 100)) return quotes.slice(0, limit);

  const pageSize = Math.min(100, limit);
  for (let offset = 0; offset < limit && quotes.length < limit; offset += pageSize) {
    const rows = await fetchNasdaqPage("etf", pageSize, offset);
    if (rows.length === 0) break;
    const before = quotes.length;
    collectQuotes(rows, rowFromEtf, seen, quotes, limit);
    if (quotes.length === before) break;
  }
  return quotes;
}

function byMarketCapDesc(left: NasdaqQuote, right: NasdaqQuote) {
  return (right.marketCap ?? 0) - (left.marketCap ?? 0);
}

export function mixScanUniverse(
  stocks: NasdaqQuote[],
  etfs: NasdaqQuote[],
  limit = SCAN_UNIVERSE_LIMIT,
): NasdaqQuote[] {
  const ranked = [...stocks].sort(byMarketCapDesc);
  const large = ranked.filter((row) => (row.marketCap ?? 0) > 0).slice(0, SCAN_LARGE_CAP);
  const pennies = [...stocks]
    .filter((row) => row.price >= 0.25 && row.price < 5)
    .sort(byMarketCapDesc)
    .slice(0, SCAN_SMALL_CAP);
  const small = ranked
    .filter((row) => (row.marketCap ?? Infinity) < 2_000_000_000 && row.price >= 0.25)
    .slice(0, SCAN_SMALL_CAP);
  const seed = new Map(
    LIBRARY_BROWSE.map((row) => [row.symbol, row.name] as const),
  );
  const mixed: NasdaqQuote[] = [];
  const seen = new Set<string>();

  function add(quote: NasdaqQuote | undefined) {
    if (!quote || seen.has(quote.symbol) || mixed.length >= limit) return;
    seen.add(quote.symbol);
    mixed.push(quote);
  }

  const bySymbol = new Map(
    [...stocks, ...etfs].map((row) => [row.symbol, row] as const),
  );
  for (const symbol of seed.keys()) add(bySymbol.get(symbol));
  for (const row of large) add(row);
  for (const row of etfs.slice(0, SCAN_ETF_LIMIT)) add(row);
  for (const row of pennies) add(row);
  for (const row of small) add(row);
  return mixed;
}

export async function fetchNasdaqQuoteMap(limit = 1500) {
  try {
    const rows = await fetchNasdaqScreener(limit);
    return new Map(rows.map((row) => [row.symbol, row]));
  } catch (error) {
    console.warn("NASDAQ screener unavailable:", error);
    return new Map<string, NasdaqQuote>();
  }
}

const LISTED_TTL_MS = 6 * 60 * 60 * 1000;
let listedCache: { at: number; rows: NasdaqQuote[] } | null = null;

export async function getListedUsStocks(): Promise<NasdaqQuote[]> {
  if (listedCache && Date.now() - listedCache.at < LISTED_TTL_MS) {
    return listedCache.rows;
  }
  const [stocks, etfs] = await Promise.all([
    fetchNasdaqScreener(12_000),
    fetchNasdaqEtfs(8_000),
  ]);
  const seen = new Set<string>();
  const rows: NasdaqQuote[] = [];
  for (const row of [...stocks, ...etfs]) {
    if (seen.has(row.symbol)) continue;
    seen.add(row.symbol);
    rows.push(row);
  }
  listedCache = { at: Date.now(), rows };
  return rows;
}

export async function searchListedUsStocks(query: string, limit = 24) {
  const needle = query.trim().toLowerCase();
  if (needle.length < 1) return [];
  const seedHits = LIBRARY_BROWSE.filter(
    (row) =>
      row.symbol.toLowerCase().startsWith(needle) ||
      row.name.toLowerCase().includes(needle),
  ).map((row) => ({ symbol: row.symbol, name: row.name }));
  try {
    const rows = await getListedUsStocks();
    const starts: NasdaqQuote[] = [];
    const named: NasdaqQuote[] = [];
    for (const row of rows) {
      if (row.symbol.toLowerCase().startsWith(needle)) starts.push(row);
      else if (row.name.toLowerCase().includes(needle)) named.push(row);
    }
    const seen = new Set<string>();
    const merged: Array<{ symbol: string; name: string }> = [];
    for (const row of [...seedHits, ...starts, ...named]) {
      if (seen.has(row.symbol)) continue;
      seen.add(row.symbol);
      merged.push({ symbol: row.symbol, name: row.name });
      if (merged.length >= limit) break;
    }
    return merged;
  } catch (error) {
    console.warn("Listed US stock search unavailable:", error);
    return seedHits.slice(0, limit);
  }
}
