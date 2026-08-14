import { parseTicker } from "@/lib/ticker";

export type NasdaqQuote = {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  marketCap: number | null;
};

function parseMoney(raw: string | undefined) {
  if (!raw) return null;
  const value = Number(raw.replace(/[$,%]/g, "").replace(/,/g, ""));
  return Number.isFinite(value) ? value : null;
}

export async function fetchNasdaqScreener(limit = 1500): Promise<NasdaqQuote[]> {
  const url = `https://api.nasdaq.com/api/screener/stocks?tableonly=true&limit=${limit}&offset=0`;
  const response = await fetch(url, {
    headers: {
      Accept: "application/json,text/plain,*/*",
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`NASDAQ screener error: ${response.status}`);
  }
  const payload = (await response.json()) as {
    data?: { table?: { rows?: Array<Record<string, string>> } };
  };
  const rows = payload.data?.table?.rows ?? [];
  const quotes: NasdaqQuote[] = [];
  for (const row of rows) {
    const symbol = parseTicker(row.symbol);
    if (!symbol) continue;
    const price = parseMoney(row.lastsale);
    if (!(price && price > 0)) continue;
    quotes.push({
      symbol,
      name: (row.name || symbol).replace(/\s+Common Stock$/i, "").trim(),
      price,
      change: parseMoney(row.netchange) ?? 0,
      changePercent: parseMoney(row.pctchange) ?? 0,
      marketCap: parseMoney(row.marketCap),
    });
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
