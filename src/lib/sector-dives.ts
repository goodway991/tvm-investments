import type { SectorDive, StockCandidate } from "@/types";
import { formatSessionLabel } from "./archive-window";
import { computeRSI } from "./indicators";
import { MARKET_SECTORS } from "./sector-catalog";

export type { SectorStance } from "./sector-catalog";
export { MARKET_SECTORS, sectorStance } from "./sector-catalog";

const FALLBACK_DIVES: SectorDive[] = MARKET_SECTORS.map((row) => ({
  id: row.id,
  sector: row.sector,
  stance: row.stance,
  title: row.title,
  subtitle: row.subtitle,
  body: "",
}));

const SECTOR_ALIASES: Record<string, string[]> = {
  "Communication Services": [
    "Communication Services",
    "Communications",
    "Telecommunications",
  ],
  "Consumer Discretionary": [
    "Consumer Discretionary",
    "Consumer Cyclical",
  ],
  "Consumer Staples": [
    "Consumer Staples",
    "Consumer Defensive",
  ],
  Energy: ["Energy"],
  Financials: ["Financials", "Financial Services", "Financial", "Finance"],
  "Health Care": ["Health Care", "Healthcare"],
  Industrials: ["Industrials", "Industrial"],
  "Information Technology": [
    "Information Technology",
    "Technology",
  ],
  Materials: ["Materials", "Basic Materials"],
  "Real Estate": ["Real Estate"],
  Utilities: ["Utilities", "Utility"],
};

/** Map Yahoo / NASDAQ labels onto the 11 market sectors. */
export function canonicalSector(sector: string, industry = ""): string {
  const text = `${sector} ${industry}`.toLowerCase();
  if (
    text.includes("real estate") ||
    text.includes("reit") ||
    text.includes("realty")
  ) {
    return "Real Estate";
  }
  if (
    text.includes("utilit") ||
    text.includes("electric power") ||
    text.includes("water works")
  ) {
    return "Utilities";
  }
  if (
    text.includes("mining") ||
    text.includes("chemical") ||
    text.includes("steel") ||
    text.includes("copper") ||
    text.includes("gold") ||
    text.includes("paper") ||
    text.includes("basic material") ||
    text.includes("materials")
  ) {
    return "Materials";
  }
  if (
    text.includes("staple") ||
    text.includes("consumer defensive") ||
    text.includes("food") ||
    text.includes("beverage") ||
    text.includes("household product") ||
    text.includes("tobacco") ||
    text.includes("supermarket") ||
    text.includes("grocery")
  ) {
    return "Consumer Staples";
  }
  if (
    text.includes("discretionary") ||
    text.includes("consumer cyclical") ||
    text.includes("auto") ||
    text.includes("apparel") ||
    text.includes("luxury") ||
    text.includes("restaurant") ||
    text.includes("hotel") ||
    text.includes("retail")
  ) {
    return "Consumer Discretionary";
  }
  if (
    text.includes("health") ||
    text.includes("pharma") ||
    text.includes("biotech") ||
    text.includes("drug") ||
    text.includes("managed care") ||
    text.includes("medical device")
  ) {
    return "Health Care";
  }
  if (
    text.includes("bank") ||
    text.includes("financial") ||
    text.includes("finance") ||
    text.includes("credit") ||
    text.includes("insurance") ||
    text.includes("capital market") ||
    text.includes("asset manag")
  ) {
    return "Financials";
  }
  if (
    text.includes("energy") ||
    text.includes("oil") ||
    text.includes("petroleum") ||
    text.includes("natural gas") ||
    text.includes("midstream") ||
    text.includes("renewable")
  ) {
    return "Energy";
  }
  if (
    text.includes("industrial") ||
    text.includes("aerospace") ||
    text.includes("machinery") ||
    text.includes("defense") ||
    text.includes("manufactur") ||
    text.includes("transport") ||
    text.includes("railroad") ||
    text.includes("airline")
  ) {
    return "Industrials";
  }
  if (
    text.includes("communication") ||
    text.includes("telecom") ||
    text.includes("media") ||
    text.includes("entertainment") ||
    text.includes("broadcast") ||
    text.includes("social media")
  ) {
    return "Communication Services";
  }
  if (
    text.includes("semiconductor") ||
    text.includes("software") ||
    text.includes("hardware") ||
    text.includes("information tech") ||
    text.includes("technology") ||
    text.includes("computer") ||
    text.includes("electronic") ||
    text.includes("internet")
  ) {
    return "Information Technology";
  }
  return sector.trim() || "Other";
}

function diveLooksEmpty(dive: SectorDive) {
  const body = dive.body.trim();
  return (
    !body ||
    /no .+ names printed/i.test(body) ||
    /\*\*Relative strength leaders:\*\*\s*—/.test(body)
  );
}

export function resolveSector(symbol: string, sector: string, industry = "") {
  const mapped = canonicalSector(sector, industry);
  if (mapped && mapped !== "Other") return mapped;
  return SYMBOL_SECTOR[symbol] ?? mapped ?? "Other";
}

function asDiveCandidate(stock: StockCandidate): StockCandidate {
  return {
    ...stock,
    sector: resolveSector(stock.symbol, stock.sector, stock.industry),
    ohlcv: stock.ohlcv ?? [],
    headlines: stock.headlines ?? [],
    signals: stock.signals ?? [],
  };
}

const SYMBOL_SECTOR: Record<string, string> = {
  AAPL: "Information Technology",
  MSFT: "Information Technology",
  NVDA: "Information Technology",
  AVGO: "Information Technology",
  AMD: "Information Technology",
  INTC: "Information Technology",
  CRM: "Information Technology",
  ORCL: "Information Technology",
  ADBE: "Information Technology",
  CSCO: "Information Technology",
  ACN: "Information Technology",
  IBM: "Information Technology",
  QCOM: "Information Technology",
  TXN: "Information Technology",
  AMAT: "Information Technology",
  NOW: "Information Technology",
  APH: "Information Technology",
  KLAC: "Information Technology",
  LRCX: "Information Technology",
  SNPS: "Information Technology",
  CDNS: "Information Technology",
  ADI: "Information Technology",
  MU: "Information Technology",
  PANW: "Information Technology",
  CRWD: "Information Technology",
  PLTR: "Information Technology",
  GOOGL: "Communication Services",
  GOOG: "Communication Services",
  META: "Communication Services",
  NFLX: "Communication Services",
  T: "Communication Services",
  VZ: "Communication Services",
  TMUS: "Communication Services",
  TSM: "Information Technology",
  JPM: "Financials",
  BAC: "Financials",
  WFC: "Financials",
  GS: "Financials",
  MS: "Financials",
  V: "Financials",
  MA: "Financials",
  AXP: "Financials",
  BLK: "Financials",
  C: "Financials",
  SCHW: "Financials",
  SPGI: "Financials",
  "BRK-B": "Financials",
  JNJ: "Health Care",
  UNH: "Health Care",
  LLY: "Health Care",
  PFE: "Health Care",
  MRK: "Health Care",
  ABBV: "Health Care",
  TMO: "Health Care",
  ABT: "Health Care",
  DHR: "Health Care",
  AMGN: "Health Care",
  ISRG: "Health Care",
  SYK: "Health Care",
  BSX: "Health Care",
  GILD: "Health Care",
  AMZN: "Consumer Discretionary",
  TSLA: "Consumer Discretionary",
  HD: "Consumer Discretionary",
  MCD: "Consumer Discretionary",
  NKE: "Consumer Discretionary",
  SBUX: "Consumer Discretionary",
  LOW: "Consumer Discretionary",
  TJX: "Consumer Discretionary",
  BKNG: "Consumer Discretionary",
  WMT: "Consumer Staples",
  COST: "Consumer Staples",
  PG: "Consumer Staples",
  KO: "Consumer Staples",
  PEP: "Consumer Staples",
  DIS: "Communication Services",
  CAT: "Industrials",
  HON: "Industrials",
  UNP: "Industrials",
  UPS: "Industrials",
  BA: "Industrials",
  GE: "Industrials",
  DE: "Industrials",
  LMT: "Industrials",
  RTX: "Industrials",
  MMM: "Industrials",
  ETN: "Industrials",
  ADP: "Industrials",
  XOM: "Energy",
  CVX: "Energy",
  COP: "Energy",
  SLB: "Energy",
  EOG: "Energy",
  MPC: "Energy",
  PSX: "Energy",
  OXY: "Energy",
  WMB: "Energy",
  KMI: "Energy",
  XLE: "Energy",
  LIN: "Materials",
  SHW: "Materials",
  APD: "Materials",
  FCX: "Materials",
  NEM: "Materials",
  ECL: "Materials",
  PLD: "Real Estate",
  AMT: "Real Estate",
  EQIX: "Real Estate",
  SPG: "Real Estate",
  O: "Real Estate",
  CCI: "Real Estate",
  NEE: "Utilities",
  DUK: "Utilities",
  SO: "Utilities",
  SRE: "Utilities",
  AEP: "Utilities",
  D: "Utilities",
};

const DIVE_ID_ALIASES: Record<string, string> = {
  tech: "technology",
  consumer: "discretionary",
};

export function hydrateSectorDives(
  dives: SectorDive[] | undefined,
  stocks: StockCandidate[],
  sessionDate: string,
): SectorDive[] {
  const built = stocks.length
    ? buildSectorDives(stocks.map(asDiveCandidate), sessionDate)
    : fallbackSectorDives();
  if (!dives?.length) return built;
  const byId = new Map(dives.map((dive) => [dive.id, dive]));
  return built.map((dive) => {
    const prev =
      byId.get(dive.id) ??
      [...byId.entries()].find(
        ([id]) => DIVE_ID_ALIASES[id] === dive.id,
      )?.[1];
    if (prev && !diveLooksEmpty(prev)) {
      return {
        ...dive,
        title: prev.title || dive.title,
        subtitle: prev.subtitle || dive.subtitle,
        body: prev.body,
      };
    }
    return dive;
  });
}

function signed(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function usd(value: number) {
  return `$${value.toLocaleString(undefined, {
    minimumFractionDigits: value >= 100 ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

function volumeMultiple(stock: StockCandidate) {
  const avg = stock.fundamentals.avgVolume;
  if (!avg || avg <= 0 || !stock.volume) return null;
  return stock.volume / avg;
}

function stockLine(stock: StockCandidate) {
  const rsi = computeRSI(stock.ohlcv.map((bar) => bar.close));
  const volumeX = volumeMultiple(stock);
  const parts = [
    `${stock.symbol} ${usd(stock.price)} (${signed(stock.changePercent)})`,
  ];
  if (rsi != null) parts.push(`RSI ${rsi.toFixed(0)}`);
  if (volumeX != null) parts.push(`${volumeX.toFixed(1)}x avg volume`);
  return parts.join(", ");
}

function stocksForDive(
  buckets: Map<string, StockCandidate[]>,
  fallback: SectorDive,
) {
  const aliases = SECTOR_ALIASES[fallback.sector] ?? [fallback.sector];
  const group = aliases.flatMap((name) => buckets.get(name) ?? []);
  return Array.from(new Map(group.map((stock) => [stock.symbol, stock])).values());
}

function bucketStocks(stocks: StockCandidate[]) {
  const buckets = new Map<string, StockCandidate[]>();
  for (const stock of stocks) {
    const list = buckets.get(stock.sector) ?? [];
    list.push(stock);
    buckets.set(stock.sector, list);
  }
  return buckets;
}

function headlineLines(stocks: StockCandidate[], limit = 3) {
  return stocks
    .flatMap((stock) =>
      stock.headlines.slice(0, 2).map((item) => `${stock.symbol}: ${item.headline}`),
    )
    .slice(0, limit);
}

function sessionNoteFromHeadlines(sector: string, headlines: string[]) {
  if (headlines.length === 0) {
    return `No fresh headlines printed in this ${sector.toLowerCase()} sleeve. Scores still use this session’s closes — treat a drop as noise only if volume is not a breakdown.`;
  }
  if (headlines.length === 1) {
    return `This session’s news: ${headlines[0]}.`;
  }
  return `This session’s news: ${headlines[0]} Also ${headlines[1]}.`;
}

function diveFromStocks(
  fallback: SectorDive,
  stocks: StockCandidate[],
  sessionDate: string,
): SectorDive {
  const label = formatSessionLabel(sessionDate);
  if (stocks.length === 0) {
    return {
      ...fallback,
      subtitle: `${label} · ${fallback.stance === "defensive" ? "Defensive" : "Cyclical"} · no names in this sleeve.`,
      body: `No ${fallback.sector.toLowerCase()} names printed in the ${label} scan.

**Relative strength leaders:** —

**Oversold watchlist:** —

**Catalyst calendar:** Highest composite scores: —. Latest headlines — —.

**Session note:** The next weekday snapshot will fill this sleeve if those tickers are in the universe.`,
    };
  }

  const avg =
    stocks.reduce((sum, stock) => sum + stock.changePercent, 0) / stocks.length;
  const leaders = [...stocks]
    .sort((a, b) => b.changePercent - a.changePercent)
    .slice(0, 3);
  const laggards = [...stocks]
    .sort((a, b) => a.changePercent - b.changePercent)
    .slice(0, 3);
  const scored = [...stocks]
    .sort((a, b) => b.compositeScore - a.compositeScore)
    .slice(0, 3);
  const headlines = headlineLines(stocks, 3);

  return {
    ...fallback,
    subtitle: `${label} · ${fallback.stance === "defensive" ? "Defensive" : "Cyclical"} · ${stocks.length} ${fallback.sector.toLowerCase()} names · session average ${signed(avg)}.`,
    body: `${fallback.sector} closed ${signed(avg)} across ${stocks.length} names in the ${label} scan.

**Relative strength leaders:** ${leaders.map(stockLine).join("; ")}.

**Oversold watchlist:** ${laggards.map(stockLine).join("; ")}.

**Catalyst calendar:** Highest composite scores: ${scored
      .map((stock) => `${stock.symbol} (${stock.compositeScore.toFixed(0)}/100)`)
      .join(", ")}.${
      headlines.length ? ` Latest headlines — ${headlines.join(" | ")}.` : ""
    }

**Session note:** ${sessionNoteFromHeadlines(fallback.sector, headlines)}`,
  };
}

export function sectorNewsSymbols(stocks: StockCandidate[], perSector = 4) {
  const buckets = bucketStocks(stocks);
  const symbols: string[] = [];
  for (const fallback of FALLBACK_DIVES) {
    const group = stocksForDive(buckets, fallback);
    const movers = [...group]
      .sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent))
      .slice(0, perSector);
    const scored = [...group]
      .sort((a, b) => b.compositeScore - a.compositeScore)
      .slice(0, 2);
    for (const stock of [...movers, ...scored]) symbols.push(stock.symbol);
  }
  return Array.from(new Set(symbols));
}

export function buildSectorDives(
  stocks: StockCandidate[],
  sessionDate: string,
): SectorDive[] {
  const normalized = stocks.map(asDiveCandidate);
  const buckets = bucketStocks(normalized);
  return FALLBACK_DIVES.map((fallback) =>
    diveFromStocks(fallback, stocksForDive(buckets, fallback), sessionDate),
  );
}

export function fallbackSectorDives(): SectorDive[] {
  return FALLBACK_DIVES;
}

function divePromptPayload(dives: SectorDive[], stocks: StockCandidate[], sessionDate: string) {
  const buckets = bucketStocks(stocks);
  return FALLBACK_DIVES.map((fallback) => {
    const group = stocksForDive(buckets, fallback);
    return {
      id: fallback.id,
      sector: fallback.sector,
      sessionDate,
      averageChange:
        group.length === 0
          ? null
          : group.reduce((sum, stock) => sum + stock.changePercent, 0) / group.length,
      leaders: [...group]
        .sort((a, b) => b.changePercent - a.changePercent)
        .slice(0, 3)
        .map((stock) => `${stock.symbol} ${signed(stock.changePercent)}`),
      laggards: [...group]
        .sort((a, b) => a.changePercent - b.changePercent)
        .slice(0, 3)
        .map((stock) => `${stock.symbol} ${signed(stock.changePercent)}`),
      headlines: headlineLines(group, 4),
    };
  });
}

async function llmSessionNotes(
  dives: SectorDive[],
  stocks: StockCandidate[],
  sessionDate: string,
): Promise<Record<string, string> | null> {
  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!geminiKey && !openaiKey) return null;

  const payload = divePromptPayload(dives, stocks, sessionDate);
  const prompt = `Write one session note per US equity sector for ${formatSessionLabel(sessionDate)}.
Use ONLY the facts in the JSON. Do not invent prices, tickers, or headlines.
JSON only: {"notes":{"communication":"2-3 sentences","discretionary":"...","staples":"...","energy":"...","financials":"...","healthcare":"...","industrials":"...","technology":"...","materials":"...","real-estate":"...","utilities":"..."}}

${JSON.stringify(payload)}`;

  if (geminiKey) {
    const models = [
      process.env.GEMINI_MODEL,
      "gemini-2.5-flash",
      "gemini-2.0-flash",
    ].filter((model, index, list): model is string => Boolean(model) && list.indexOf(model) === index);

    for (const model of models) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-goog-api-key": geminiKey,
            },
            body: JSON.stringify({
              contents: [{ role: "user", parts: [{ text: prompt }] }],
              generationConfig: {
                temperature: 0.3,
                responseMimeType: "application/json",
              },
            }),
          },
        );
        if (!response.ok) continue;
        const json = (await response.json()) as {
          candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
        };
        const raw = json.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!raw) continue;
        const parsed = JSON.parse(raw) as { notes?: Record<string, unknown> };
        if (parsed.notes && typeof parsed.notes === "object") {
          return Object.fromEntries(
            Object.entries(parsed.notes).filter(
              (entry): entry is [string, string] =>
                typeof entry[1] === "string" && entry[1].trim().length > 20,
            ),
          );
        }
      } catch (error) {
        console.warn(`Sector dive LLM (${model}) failed:`, error);
      }
    }
  }

  if (openaiKey) {
    try {
      const { default: OpenAI } = await import("openai");
      const openai = new OpenAI({ apiKey: openaiKey });
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0.3,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: "Session market notes only. JSON as specified.",
          },
          { role: "user", content: prompt },
        ],
      });
      const raw = response.choices[0]?.message?.content;
      if (!raw) return null;
      const parsed = JSON.parse(raw) as { notes?: Record<string, unknown> };
      if (!parsed.notes) return null;
      return Object.fromEntries(
        Object.entries(parsed.notes).filter(
          (entry): entry is [string, string] =>
            typeof entry[1] === "string" && entry[1].trim().length > 20,
        ),
      );
    } catch (error) {
      console.warn("Sector dive OpenAI failed:", error);
    }
  }

  return null;
}

function applySessionNotes(dives: SectorDive[], notes: Record<string, string>) {
  return dives.map((dive) => {
    const note = notes[dive.id]?.trim();
    if (!note) return dive;
    const cleaned = note.replace(/\s+/g, " ").slice(0, 600);
    const marker = "**Session note:**";
    const index = dive.body.indexOf(marker);
    if (index >= 0) {
      return {
        ...dive,
        body: `${dive.body.slice(0, index)}${marker} ${cleaned}`,
      };
    }
    return { ...dive, body: `${dive.body}\n\n${marker} ${cleaned}` };
  });
}

export async function writeDailySectorDives(
  stocks: StockCandidate[],
  sessionDate: string,
  useLlm: boolean,
): Promise<SectorDive[]> {
  const dives = buildSectorDives(stocks, sessionDate);
  if (!useLlm) return dives;
  const notes = await llmSessionNotes(dives, stocks, sessionDate);
  return notes ? applySessionNotes(dives, notes) : dives;
}

export async function fillDiveHeadlines(stocks: StockCandidate[]) {
  const needed = sectorNewsSymbols(stocks).filter((symbol) => {
    const stock = stocks.find((item) => item.symbol === symbol);
    return stock != null && stock.headlines.length === 0;
  });
  if (needed.length === 0) return stocks;

  const { fetchYahooNews } = await import("./providers/yahoo");
  const headlines = await Promise.all(
    needed.map(async (symbol) => [symbol, await fetchYahooNews(symbol, 5)] as const),
  );
  const bySymbol = new Map(headlines);
  return stocks.map((stock) => {
    const extra = bySymbol.get(stock.symbol);
    return extra ? { ...stock, headlines: extra } : stock;
  });
}
