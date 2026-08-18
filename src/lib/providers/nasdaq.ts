import { parseTicker } from "@/lib/ticker";

export type NasdaqQuote = {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  marketCap: number | null;
  sector: string;
  industry: string;
};

function parseMoney(raw: string | undefined) {
  if (!raw) return null;
  const value = Number(raw.replace(/[$,%]/g, "").replace(/,/g, ""));
  return Number.isFinite(value) ? value : null;
}

function rowFromNasdaq(row: Record<string, string>): NasdaqQuote | null {
  const symbol = parseTicker(row.symbol);
  if (!symbol) return null;
  const price = parseMoney(row.lastsale);
  if (!(price && price > 0)) return null;
  return {
    symbol,
    name: (row.name || symbol).replace(/\s+Common Stock$/i, "").trim(),
    price,
    change: parseMoney(row.netchange) ?? 0,
    changePercent: parseMoney(row.pctchange) ?? 0,
    marketCap: parseMoney(row.marketCap),
    sector: (row.sector || "").trim(),
    industry: (row.industry || "").trim(),
  };
}

async function fetchNasdaqPage(limit: number, offset: number) {
  const headers = {
    Accept: "application/json,text/plain,*/*",
    "User-Agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  };
  const urls = [
    `https://api.nasdaq.com/api/screener/stocks?limit=${limit}&offset=${offset}`,
    `https://api.nasdaq.com/api/screener/stocks?tableonly=true&limit=${limit}&offset=${offset}`,
  ];
  let rows: Array<Record<string, string>> = [];
  for (const url of urls) {
    const response = await fetch(url, { headers, cache: "no-store" });
    if (!response.ok) continue;
    const payload = (await response.json()) as {
      data?: {
        table?: { rows?: Array<Record<string, string>> };
        rows?: Array<Record<string, string>>;
      };
    };
    rows = payload.data?.table?.rows ?? payload.data?.rows ?? [];
    if (rows.some((row) => row.sector || row.industry)) break;
    if (rows.length > 0 && url === urls[urls.length - 1]) break;
  }
  return rows;
}

export async function fetchNasdaqScreener(limit = 1500): Promise<NasdaqQuote[]> {
  const pageSize = Math.min(250, limit);
  const quotes: NasdaqQuote[] = [];
  const seen = new Set<string>();
  for (let offset = 0; offset < limit && quotes.length < limit; offset += pageSize) {
    const rows = await fetchNasdaqPage(pageSize, offset);
    if (rows.length === 0) break;
    let added = 0;
    for (const row of rows) {
      const quote = rowFromNasdaq(row);
      if (!quote || seen.has(quote.symbol)) continue;
      seen.add(quote.symbol);
      quotes.push(quote);
      added += 1;
      if (quotes.length >= limit) break;
    }
    if (added === 0) break;
  }
  return quotes;
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
  const rows = await fetchNasdaqScreener(10_000);
  listedCache = { at: Date.now(), rows };
  return rows;
}

export async function searchListedUsStocks(query: string, limit = 24) {
  const needle = query.trim().toLowerCase();
  if (needle.length < 1) return [];
  try {
    const rows = await getListedUsStocks();
    const starts: NasdaqQuote[] = [];
    const named: NasdaqQuote[] = [];
    for (const row of rows) {
      if (row.symbol.toLowerCase().startsWith(needle)) starts.push(row);
      else if (row.name.toLowerCase().includes(needle)) named.push(row);
    }
    return [...starts, ...named].slice(0, limit).map((row) => ({
      symbol: row.symbol,
      name: row.name,
    }));
  } catch (error) {
    console.warn("Listed US stock search unavailable:", error);
    return [];
  }
}
