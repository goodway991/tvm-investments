export type AnalysisQuote = {
  name: string;
  price: number;
  sector?: string;
  industry?: string;
  composite?: number;
  peRatio?: number | null;
};

export type AnalysisPosition = {
  symbol: string;
  shares: number;
  averageCost: number;
  currentPrice: number;
};

export type AnalysisAspect = {
  id: string;
  title: string;
  score: number;
  summary: string;
  detail: string;
};

export type PortfolioReview = {
  overall: number | null;
  strength: string;
  counted: number;
  aspects: AnalysisAspect[];
  improve: { title: string; body: string };
  nextSteps: { title: string; body: string }[];
};

function clamp(value: number, min = 0, max = 100) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function strengthLabel(score: number) {
  if (score < 40) return "Needs work";
  if (score < 65) return "Mixed";
  if (score < 82) return "Solid";
  return "Strong";
}

export function analyzePortfolio({
  cash,
  positions,
  quotes,
}: {
  cash: number;
  positions: AnalysisPosition[];
  quotes: Map<string, AnalysisQuote>;
}): PortfolioReview {
  const rows = positions
    .map((position) => {
      const quote = quotes.get(position.symbol);
      const price = quote?.price || position.currentPrice || position.averageCost;
      const value = Math.max(0, position.shares * price);
      return {
        symbol: position.symbol,
        name: quote?.name || position.symbol,
        value,
        sector: quote?.sector || "Other",
        composite: quote?.composite ?? null,
        peRatio: quote?.peRatio ?? null,
      };
    })
    .filter((row) => row.value > 0);

  const holdings = rows.reduce((sum, row) => sum + row.value, 0);
  const book = Math.max(0, cash) + holdings;

  if (!rows.length || book <= 0) {
    return {
      overall: null,
      strength: "Empty",
      counted: 0,
      aspects: [],
      improve: {
        title: "How to improve",
        body: "Add the shares you already hold, then run this again. The read needs at least one name with a value.",
      },
      nextSteps: [
        {
          title: "Log a holding",
          body: "Search your watchlist above, enter shares, and save a buy price or date.",
        },
        {
          title: "Spread the book",
          body: "After the first name is in, add a second sector so the score has something to compare.",
        },
        {
          title: "Run the review",
          body: "Once a holding is saved, tap Analyze book again. The overall score fills from the mix, not from cash alone.",
        },
      ],
    };
  }

  const weights = rows.map((row) => row.value / book);
  const hhi = weights.reduce((sum, weight) => sum + weight * weight, 0);
  const maxWeight = Math.max(...weights);
  const cashShare = Math.max(0, cash) / book;
  const sectors = new Map<string, number>();
  for (const row of rows) {
    sectors.set(row.sector, (sectors.get(row.sector) ?? 0) + row.value);
  }
  const sectorCount = sectors.size;
  const composites = rows.filter((row) => row.composite != null);
  const quality =
    composites.length > 0
      ? composites.reduce((sum, row) => sum + (row.composite as number) * row.value, 0) /
        composites.reduce((sum, row) => sum + row.value, 0)
      : 55;
  const peRows = rows.filter((row) => row.peRatio != null && (row.peRatio as number) > 0);
  const avgPe =
    peRows.length > 0
      ? peRows.reduce((sum, row) => sum + (row.peRatio as number) * row.value, 0) /
        peRows.reduce((sum, row) => sum + row.value, 0)
      : null;

  const diversity = clamp((1 - hhi) * 118);
  const concentration = clamp(100 - Math.max(0, maxWeight - 0.18) * 160);
  const breadth = clamp(28 + Math.min(rows.length, 8) * 8 + Math.min(sectorCount, 6) * 4);
  const cashScore =
    cashShare < 0.02
      ? 52
      : cashShare <= 0.18
        ? clamp(90 - Math.abs(cashShare - 0.08) * 80)
        : clamp(78 - (cashShare - 0.18) * 90);
  const qualityScore = clamp(quality);
  const valueScore =
    avgPe == null
      ? 58
      : avgPe < 12
        ? 72
        : avgPe < 22
          ? 86
          : avgPe < 32
            ? 74
            : avgPe < 45
              ? 58
              : 40;

  const aspects: AnalysisAspect[] = [
    {
      id: "diversity",
      title: "Sector mix",
      score: Math.round(diversity),
      summary: `${sectorCount} sector${sectorCount === 1 ? "" : "s"} across ${rows.length} holding${rows.length === 1 ? "" : "s"}.`,
      detail:
        sectorCount <= 1
          ? "The book is sitting in one sleeve. A second unrelated sector usually cuts single-theme risk without changing your style."
          : hhi > 0.45
            ? "A few sectors dominate the dollars. Spreading weight — not just ticker count — is what moves this score."
            : "Weight is spread across more than one sleeve, so one headline is less likely to move the whole book.",
    },
    {
      id: "concentration",
      title: "Name concentration",
      score: Math.round(concentration),
      summary: `Largest line is ${(maxWeight * 100).toFixed(0)}% of the book.`,
      detail:
        maxWeight > 0.45
          ? "One name is doing most of the work. Size it down, or grow the other lines, so a single print cannot define the week."
          : maxWeight > 0.28
            ? "A core holding is fine. Keep an eye on the top line so it does not quietly become the whole book."
            : "No single name owns the book. That keeps the overall read more about the mix than one ticker.",
    },
    {
      id: "quality",
      title: "Scan quality",
      score: Math.round(qualityScore),
      summary:
        composites.length > 0
          ? `Weighted scan score ${qualityScore.toFixed(0)} / 100 on ${composites.length} named holding${composites.length === 1 ? "" : "s"}.`
          : "No scan scores yet for these tickers — using a mid read until the tape knows them.",
      detail:
        qualityScore >= 75
          ? "The names you hold already screen as relatively clean on the weekday tape: composite, niche, and size."
          : qualityScore >= 55
            ? "Some lines screen well and some lag. Open the weaker names on Reports if you want the write-up behind the score."
            : "Several holdings sit in the lower half of the scan. That does not mean sell — it means the tape is not giving them much support right now.",
    },
    {
      id: "value",
      title: "Valuation mix",
      score: Math.round(valueScore),
      summary:
        avgPe == null
          ? "Not enough P/E prints on file to lean on price paid vs earnings."
          : `Value-weighted P/E is about ${avgPe.toFixed(0)}.`,
      detail:
        avgPe == null
          ? "Add names the scan already covers, or wait for the next weekday snapshot, and this sleeve will fill in."
          : avgPe > 40
            ? "The book is paying up for growth. That can work — just know a multiple reset hits this score first."
            : avgPe < 16
              ? "You are not stretching multiples across the whole book. Cheap is not the same as high quality — check the scan-quality card next to this one."
              : "Multiples sit in a middle band. Neither a deep-value book nor a pure-growth stack.",
    },
    {
      id: "cash",
      title: "Cash buffer",
      score: Math.round(cashScore),
      summary: `Cash is ${(cashShare * 100).toFixed(0)}% of the tracked book.`,
      detail:
        cashShare < 0.02
          ? "Almost no cash on the account. A small sleeve gives you room to add without selling a winner first."
          : cashShare > 0.4
            ? "A large cash pile keeps risk down but also means the book is mostly waiting. Put a plan on the idle dollars or accept a quieter score."
            : "You have some dry powder without sitting out the tape. That is the band this read likes.",
    },
    {
      id: "breadth",
      title: "Breadth",
      score: Math.round(breadth),
      summary: `${rows.length} holding${rows.length === 1 ? "" : "s"} · ${sectorCount} sector${sectorCount === 1 ? "" : "s"}.`,
      detail:
        rows.length < 3
          ? "Two names or fewer cannot show a mix. Three to six lines is enough for this score to mean something."
          : rows.length > 12
            ? "A long list can hide overlap. Breadth is useful until it becomes a pile of tiny lines you will not follow."
            : "Enough names to compare, not so many that the book is a watchlist in disguise.",
    },
  ];

  const overall = clamp(
    diversity * 0.22 +
      concentration * 0.2 +
      qualityScore * 0.22 +
      valueScore * 0.12 +
      cashScore * 0.12 +
      breadth * 0.12,
  );
  const weakest = [...aspects].sort((a, b) => a.score - b.score).slice(0, 2);
  const improveBody = weakest
    .map((aspect) => `${aspect.title} (${aspect.score}/100) — ${aspect.detail}`)
    .join(" ");

  const nextSteps: { title: string; body: string }[] = [];
  if (maxWeight > 0.4) {
    nextSteps.push({
      title: "Trim the top line",
      body: `${[...rows].sort((a, b) => b.value - a.value)[0]?.symbol ?? "Your largest name"} is a big slice of the book. Size it so a bad session cannot define the whole read.`,
    });
  }
  if (sectorCount < 3) {
    nextSteps.push({
      title: "Add a different sleeve",
      body: "Pick one name from a sector you do not already hold. The Considering list is a safe place to try it before you save.",
    });
  }
  if (cashShare < 0.03) {
    nextSteps.push({
      title: "Leave a little cash",
      body: "Park a small cash line so you can add without selling first. Even a few percent changes this buffer score.",
    });
  }
  if (qualityScore < 60) {
    nextSteps.push({
      title: "Read the lagging names",
      body: "Open Reports on the weaker holdings and decide if they still earn a slot, or if they are just familiar.",
    });
  }
  if (nextSteps.length === 0) {
    nextSteps.push({
      title: "Keep the mix honest",
      body: "Re-run this after you add or drop a line. The score is a snapshot of today’s book, not a forecast.",
    });
    nextSteps.push({
      title: "Write the reason",
      body: "For each holding, know why it is still here. If you cannot say it in one sentence, it may be inertia.",
    });
  }

  return {
    overall: Math.round(overall),
    strength: strengthLabel(overall),
    counted: rows.length,
    aspects,
    improve: {
      title: "How to improve",
      body: improveBody,
    },
    nextSteps: nextSteps.slice(0, 3),
  };
}
