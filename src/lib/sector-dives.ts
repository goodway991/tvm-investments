import type { SectorDive, StockCandidate } from "@/types";
import { formatSessionLabel } from "./archive-window";
import { computeRSI } from "./indicators";

const FALLBACK_DIVES: SectorDive[] = [
  {
    id: "tech",
    sector: "Technology",
    title: "Tech Sector Deep Dive",
    subtitle: "Sector-specific analysis for technology names in this session’s screener.",
    body: "",
  },
  {
    id: "financials",
    sector: "Financial Services",
    title: "Financials Deep Dive",
    subtitle: "Banks, payments, and market-sensitive financials in this session’s scan.",
    body: "",
  },
  {
    id: "healthcare",
    sector: "Healthcare",
    title: "Healthcare Deep Dive",
    subtitle: "Pharma, devices, and managed care versus this session’s tape.",
    body: "",
  },
  {
    id: "consumer",
    sector: "Consumer Cyclical",
    title: "Consumer Deep Dive",
    subtitle: "Retail, autos, and discretionary names in this session’s screener.",
    body: "",
  },
  {
    id: "industrials",
    sector: "Industrials",
    title: "Industrials Deep Dive",
    subtitle: "Aerospace, machinery, and industrial cyclicals on this session’s tape.",
    body: "",
  },
  {
    id: "energy",
    sector: "Energy",
    title: "Energy Deep Dive",
    subtitle: "Oil, gas, and energy infrastructure versus this session.",
    body: "",
  },
];

const SECTOR_ALIASES: Record<string, string[]> = {
  Technology: [
    "Technology",
    "Information Technology",
    "Communication Services",
    "Telecommunications",
  ],
  "Financial Services": ["Financial Services", "Financial", "Finance", "Financials"],
  Healthcare: ["Healthcare", "Health Care"],
  "Consumer Cyclical": [
    "Consumer Cyclical",
    "Consumer Defensive",
    "Consumer Staples",
    "Consumer Discretionary",
  ],
  Industrials: ["Industrials", "Industrial"],
  Energy: ["Energy"],
};

/** Map Yahoo / NASDAQ sector labels onto the six deep-dive sleeves. */
export function canonicalSector(sector: string, industry = ""): string {
  const text = `${sector} ${industry}`.toLowerCase();
  if (
    text.includes("semiconductor") ||
    text.includes("software") ||
    text.includes("technology") ||
    text.includes("information tech") ||
    text.includes("computer") ||
    text.includes("electronic") ||
    text.includes("communication") ||
    text.includes("telecom") ||
    text.includes("internet") ||
    text.includes("media")
  ) {
    return "Technology";
  }
  if (
    text.includes("bank") ||
    text.includes("financial") ||
    text.includes("finance") ||
    text.includes("credit") ||
    text.includes("insurance") ||
    text.includes("capital market")
  ) {
    return "Financial Services";
  }
  if (
    text.includes("health") ||
    text.includes("pharma") ||
    text.includes("biotech") ||
    text.includes("drug") ||
    text.includes("managed care")
  ) {
    return "Healthcare";
  }
  if (
    text.includes("auto") ||
    text.includes("retail") ||
    text.includes("consumer") ||
    text.includes("restaurant") ||
    text.includes("beverage") ||
    text.includes("household") ||
    text.includes("apparel")
  ) {
    return "Consumer Cyclical";
  }
  if (
    text.includes("industrial") ||
    text.includes("aerospace") ||
    text.includes("machinery") ||
    text.includes("defense") ||
    text.includes("manufactur")
  ) {
    return "Industrials";
  }
  if (
    text.includes("energy") ||
    text.includes("oil") ||
    text.includes("petroleum") ||
    text.includes("natural gas") ||
    text.includes("midstream")
  ) {
    return "Energy";
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
  AAPL: "Technology",
  MSFT: "Technology",
  NVDA: "Technology",
  AVGO: "Technology",
  AMD: "Technology",
  INTC: "Technology",
  CRM: "Technology",
  ORCL: "Technology",
  ADBE: "Technology",
  CSCO: "Technology",
  ACN: "Technology",
  IBM: "Technology",
  QCOM: "Technology",
  TXN: "Technology",
  AMAT: "Technology",
  NOW: "Technology",
  APH: "Technology",
  KLAC: "Technology",
  LRCX: "Technology",
  SNPS: "Technology",
  CDNS: "Technology",
  ADI: "Technology",
  MU: "Technology",
  PANW: "Technology",
  CRWD: "Technology",
  PLTR: "Technology",
  GOOGL: "Technology",
  GOOG: "Technology",
  META: "Technology",
  NFLX: "Technology",
  TSM: "Technology",
  JPM: "Financial Services",
  BAC: "Financial Services",
  WFC: "Financial Services",
  GS: "Financial Services",
  MS: "Financial Services",
  V: "Financial Services",
  MA: "Financial Services",
  AXP: "Financial Services",
  BLK: "Financial Services",
  C: "Financial Services",
  SCHW: "Financial Services",
  SPGI: "Financial Services",
  "BRK-B": "Financial Services",
  JNJ: "Healthcare",
  UNH: "Healthcare",
  LLY: "Healthcare",
  PFE: "Healthcare",
  MRK: "Healthcare",
  ABBV: "Healthcare",
  TMO: "Healthcare",
  ABT: "Healthcare",
  DHR: "Healthcare",
  AMGN: "Healthcare",
  ISRG: "Healthcare",
  SYK: "Healthcare",
  BSX: "Healthcare",
  GILD: "Healthcare",
  AMZN: "Consumer Cyclical",
  TSLA: "Consumer Cyclical",
  HD: "Consumer Cyclical",
  MCD: "Consumer Cyclical",
  NKE: "Consumer Cyclical",
  SBUX: "Consumer Cyclical",
  LOW: "Consumer Cyclical",
  TJX: "Consumer Cyclical",
  BKNG: "Consumer Cyclical",
  WMT: "Consumer Cyclical",
  COST: "Consumer Cyclical",
  PG: "Consumer Cyclical",
  KO: "Consumer Cyclical",
  PEP: "Consumer Cyclical",
  DIS: "Consumer Cyclical",
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
};

export function hydrateSectorDives(
  dives: SectorDive[] | undefined,
  stocks: StockCandidate[],
  sessionDate: string,
): SectorDive[] {
  const current =
    dives && dives.length >= 2 ? dives : fallbackSectorDives();
  const filled = current.filter((dive) => !diveLooksEmpty(dive)).length;
  if (filled >= 1) return current;
  if (stocks.length === 0) return current;
  return buildSectorDives(stocks.map(asDiveCandidate), sessionDate);
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
    return `This session’s news: ${headlines[0]}. Educational only — not a recommendation.`;
  }
  return `This session’s news: ${headlines[0]} Also ${headlines[1]}. Educational only — not a recommendation.`;
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
      subtitle: `${label} · no names in this sleeve.`,
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
    subtitle: `${label} · ${stocks.length} ${fallback.sector.toLowerCase()} names · session average ${signed(avg)}.`,
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
  const prompt = `Write one educational session note per US equity sector for ${formatSessionLabel(sessionDate)}.
Not investment advice. Use ONLY the facts in the JSON. Do not invent prices, tickers, or headlines.
JSON only: {"notes":{"tech":"2-3 sentences","financials":"...","healthcare":"...","consumer":"...","industrials":"...","energy":"..."}}

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
            content: "Educational market notes only. JSON as specified. No advice.",
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
