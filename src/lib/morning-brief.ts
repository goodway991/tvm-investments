import type { DailySnapshot, MarketEvent, SectorDive } from "@/types";
import {
  etDateString,
  formatSessionLabel,
  lastCompletedSessionDate,
} from "@/lib/archive-window";

/** Ready at 6:00am in the account time zone; gone at local midnight. */
export const GOOD_MORNING_HOUR = 6;

/** True from 6:00am through 11:59pm (hour 23). Hour 0–5 is closed. */
export function isGoodMorningHour(hour: number) {
  return Number.isFinite(hour) && hour >= GOOD_MORNING_HOUR && hour <= 23;
}

export type MorningBriefName = {
  symbol: string;
  name: string;
  changePercent: number;
};

export type MorningBriefEvent = {
  title: string;
  impact: MarketEvent["impact"];
  summary: string;
};

export type MorningBriefTrend = {
  sector: string;
  title: string;
  blurb: string;
};

export type MorningBrief = {
  sessionDate: string;
  sessionLabel: string;
  eyebrow: string;
  dataMode: DailySnapshot["dataMode"];
  tape: {
    scanned: number;
    gainers: number;
    losers: number;
    leader: MorningBriefName | null;
    laggard: MorningBriefName | null;
  };
  events: MorningBriefEvent[];
  trends: MorningBriefTrend[];
  analysis: string;
  picks: MorningBriefName[];
  today: MorningBriefName[];
};

function signedPct(value: number) {
  const n = Number.isFinite(value) ? value : 0;
  return `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;
}

function firstSentences(text: string, maxSentences = 2, maxChars = 280) {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) return "";
  const parts = cleaned.match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? [cleaned];
  let out = parts.slice(0, maxSentences).join(" ").trim();
  if (out.length > maxChars) out = `${out.slice(0, maxChars - 1).trimEnd()}…`;
  return out;
}

function nameRow(
  stock:
    | { symbol: string; name: string; changePercent: number }
    | null
    | undefined,
): MorningBriefName | null {
  if (!stock) return null;
  return {
    symbol: stock.symbol,
    name: stock.name,
    changePercent: stock.changePercent,
  };
}

export function formatMorningPct(value: number) {
  return signedPct(value);
}

export function recapEyebrow(sessionDate: string) {
  const last = lastCompletedSessionDate();
  const today = etDateString();
  if (sessionDate === last && sessionDate !== today) return "Yesterday’s recap";
  if (sessionDate === today) return "This session";
  return "Last session";
}

export function buildMorningBrief(snapshot: DailySnapshot): MorningBrief {
  const movers = snapshot.topMovers ?? [];
  const gainers = movers.filter((row) => row.changePercent >= 0);
  const losers = movers.filter((row) => row.changePercent < 0);
  const ranked = [...movers].sort((a, b) => b.changePercent - a.changePercent);
  const laggard = ranked.length > 1 ? ranked[ranked.length - 1] : null;
  const events = (snapshot.marketEvents ?? [])
    .filter((event) => event.title?.trim())
    .slice(0, 3)
    .map((event) => ({
      title: event.title.trim(),
      impact: event.impact,
      summary: firstSentences(event.summary || event.detail || "", 1, 160),
    }));
  const trends = (snapshot.sectorDives ?? [])
    .filter((dive: SectorDive) => dive.title?.trim())
    .slice(0, 3)
    .map((dive) => ({
      sector: dive.sector,
      title: dive.title.trim(),
      blurb: firstSentences(dive.subtitle || dive.body || "", 1, 140),
    }));

  return {
    sessionDate: snapshot.date,
    sessionLabel: formatSessionLabel(snapshot.date),
    eyebrow: recapEyebrow(snapshot.date),
    dataMode: snapshot.dataMode,
    tape: {
      scanned: snapshot.scanUniverse?.combined || movers.length,
      gainers: gainers.length,
      losers: losers.length,
      leader: nameRow(ranked[0]),
      laggard: nameRow(laggard),
    },
    events,
    trends,
    analysis: firstSentences(snapshot.techSectorAnalysis || "", 2, 320),
    picks: (snapshot.topPicks ?? [])
      .slice(0, 3)
      .map((pick) => nameRow(pick))
      .filter((row): row is MorningBriefName => Boolean(row)),
    today: (snapshot.shortTermPicks ?? [])
      .slice(0, 3)
      .map((pick) => nameRow(pick))
      .filter((row): row is MorningBriefName => Boolean(row)),
  };
}
