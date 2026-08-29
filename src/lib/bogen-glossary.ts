export type GlossaryTerm = {
  term: string;
  blurb: string;
};

/** Longer phrases first so they match before shorter tokens. */
export const BOGEN_GLOSSARY: GlossaryTerm[] = [
  {
    term: "Algorithm-based 99%* accuracy predictions",
    blurb:
      "Ultra’s stronger path engine. It uses the full algorithm stack. 99%* is a research-read target, not a guarantee.",
  },
  {
    term: "Non-algorithm based predictions",
    blurb:
      "Pro’s short-term path: the previous statistical read from recent closes, with weekly caps. Not the Ultra algorithm.",
  },
  {
    term: "Decent short-term predictions",
    blurb:
      "Free’s simpler path from recent closes. Two Pulse Predicts a week. Not as tight as Pro, and not Ultra’s algorithm.",
  },
  {
    term: "Communication Services",
    blurb:
      "Telecommunication, media, and entertainment companies. Tagged cyclical on the sector deck.",
  },
  {
    term: "Consumer Discretionary",
    blurb:
      "Non-essential goods and services like apparel, cars, and luxury items. Tagged cyclical.",
  },
  {
    term: "Consumer Staples",
    blurb:
      "Everyday essentials like food, beverages, and household products. Tagged defensive.",
  },
  {
    term: "Information Technology",
    blurb:
      "Software, hardware, and semiconductor companies. Tagged cyclical.",
  },
  {
    term: "Health Care",
    blurb:
      "Biotechnology, pharmaceuticals, and medical devices. Tagged defensive.",
  },
  {
    term: "Real Estate",
    blurb:
      "Property developers and real estate investment trusts (REITs). Tagged cyclical.",
  },
  {
    term: "sector deep dives",
    blurb:
      "Eleven session notes on Daily Brief — one per market sector — each tagged cyclical or defensive.",
  },
  {
    term: "Cyclical",
    blurb:
      "Sectors that tend to move with the economy: discretionary spend, industrials, financials, energy, tech, materials, real estate, and communication.",
  },
  {
    term: "Defensive",
    blurb:
      "Sectors that tend to hold up when growth slows: consumer staples, health care, and utilities.",
  },
  {
    term: "Advanced Predictions",
    blurb:
      "Ultra-only 99%* reads on the workstation. Tune the knobs, then Predict. Not a target price.",
  },
  {
    term: "High score quiet names",
    blurb:
      "A workstation recipe: names with a high composite that barely moved this session — strong tape, little noise.",
  },
  {
    term: "Watchlist only",
    blurb:
      "A workstation recipe that hides everything except tickers you already saved to Watchlist.",
  },
  {
    term: "relative strength",
    blurb:
      "Whether a name held up versus its group. A relative-strength signal prefers names that did not sink with the sector.",
  },
  {
    term: "52-week range",
    blurb:
      "Where today’s price sits between the 52-week high and low. Near the lows, or well off the high, is a pullback reading — not a squeeze.",
  },
  {
    term: "short squeeze",
    blurb:
      "A squeeze setup: heavy short interest plus a bounce can force shorts to buy back, lifting the price fast.",
  },
  {
    term: "gap fill",
    blurb:
      "Price jumped overnight, leaving a gap on the chart. This signal watches for a move back through that empty zone.",
  },
  {
    term: "support bounce",
    blurb:
      "The name is sitting on a price area that held before. The bounce signal flags a possible turn off that floor.",
  },
  {
    term: "composite score",
    blurb:
      "TVM’s 0–100 blend of the eight research signals for this session. Higher means more signals lined up.",
  },
  {
    term: "short-term",
    blurb:
      "The near-term score: dips, oversold RSI, volume, and support. Used for setups you might watch over days, not years.",
  },
  {
    term: "long-term",
    blurb:
      "The slower score: relative strength, catalysts, and fundamentals. Built for a longer holding window.",
  },
  {
    term: "Daily Brief",
    blurb:
      "The session write-up: headlines plus sector notes from the weekday scan.",
  },
  {
    term: "Horizon Suite",
    blurb:
      "Paper trading. You buy and sell a fake book so you can try a path without live money.",
  },
  {
    term: "paper book",
    blurb:
      "The fake cash and lots on Horizon. Resetting it puts you back at $10,000 with no positions.",
  },
  {
    term: "trading day",
    blurb:
      "A weekday the US cash market is open. Weekends and market holidays do not count.",
  },
  {
    term: "trading days",
    blurb:
      "Weekdays the US cash market is open. A 5-trading-day horizon is about one week, skipping weekends.",
  },
  {
    term: "1 week",
    blurb:
      "A Horizon Suite preset: about five trading days ahead from the last close.",
  },
  {
    term: "2 weeks",
    blurb:
      "A Horizon Suite preset: about ten trading days ahead — the far end of the slider.",
  },
  {
    term: "good morning",
    blurb:
      "Ultra’s 6:00am sheet in your account time zone. First visit after 6:00 that local day recaps the last session.",
  },
  {
    term: "workstation",
    blurb:
      "Ultra’s tape desk: heatmap, filters, compare, notes, and recipes that actually screen the scan.",
  },
  {
    term: "heatmap",
    blurb:
      "A grid of names colored by session move. Green advanced; coral declined. Filters change which tiles you see.",
  },
  {
    term: "oversold",
    blurb:
      "RSI (a 0–100 bounce meter) is washed out. The name fell hard enough that a snap-back is on the checklist — not a buy order.",
  },
  {
    term: "catalyst",
    blurb:
      "A scheduled or fresh event that can move the name: earnings, a product note, or a sector headline.",
  },
  {
    term: "Predict",
    blurb:
      "Draws a short path from recent closes (and a light headline check). It is a sketch, not a promise.",
  },
  {
    term: "composite",
    blurb:
      "The 0–100 session score from TVM’s eight signals rolled together.",
  },
  {
    term: "recipe",
    blurb:
      "A saved screen on the Ultra workstation. Built-ins filter the heatmap; your own recipe stores the filters you set.",
  },
  {
    term: "RSI",
    blurb:
      "Relative Strength Index, 0–100. Low often means the name is washed out; high often means it has run.",
  },
  {
    term: "P/E",
    blurb:
      "Price divided by earnings. A high P/E means you pay more for each dollar the company earned.",
  },
  {
    term: "EPS",
    blurb: "Earnings per share — profit divided by shares outstanding.",
  },
  {
    term: "beta",
    blurb:
      "How hard the name usually swings versus the market. Above 1 typically moves more than the index.",
  },
  {
    term: "drift",
    blurb:
      "The average daily log-move used to sketch the path. Positive drift leans up; negative leans down.",
  },
  {
    term: "cone",
    blurb:
      "The shaded high/low band around the predicted path. Wider cone means the model is less sure.",
  },
];
