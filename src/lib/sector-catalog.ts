export type SectorStance = "cyclical" | "defensive";

export const MARKET_SECTORS: Array<{
  id: string;
  sector: string;
  stance: SectorStance;
  title: string;
  subtitle: string;
}> = [
  {
    id: "communication",
    sector: "Communication Services",
    stance: "cyclical",
    title: "Communication Services Deep Dive",
    subtitle: "Telecommunication, media, and entertainment companies.",
  },
  {
    id: "discretionary",
    sector: "Consumer Discretionary",
    stance: "cyclical",
    title: "Consumer Discretionary Deep Dive",
    subtitle: "Non-essential goods and services like apparel, cars, and luxury items.",
  },
  {
    id: "staples",
    sector: "Consumer Staples",
    stance: "defensive",
    title: "Consumer Staples Deep Dive",
    subtitle: "Everyday essentials like food, beverages, and household products.",
  },
  {
    id: "energy",
    sector: "Energy",
    stance: "cyclical",
    title: "Energy Deep Dive",
    subtitle: "Oil, gas, and renewable energy production.",
  },
  {
    id: "financials",
    sector: "Financials",
    stance: "cyclical",
    title: "Financials Deep Dive",
    subtitle: "Banks, investment funds, and insurance companies.",
  },
  {
    id: "healthcare",
    sector: "Health Care",
    stance: "defensive",
    title: "Health Care Deep Dive",
    subtitle: "Biotechnology, pharmaceuticals, and medical devices.",
  },
  {
    id: "industrials",
    sector: "Industrials",
    stance: "cyclical",
    title: "Industrials Deep Dive",
    subtitle: "Aerospace, defense, machinery, and transportation.",
  },
  {
    id: "technology",
    sector: "Information Technology",
    stance: "cyclical",
    title: "Information Technology Deep Dive",
    subtitle: "Software, hardware, and semiconductor companies.",
  },
  {
    id: "materials",
    sector: "Materials",
    stance: "cyclical",
    title: "Materials Deep Dive",
    subtitle: "Mining, chemicals, and metal production.",
  },
  {
    id: "real-estate",
    sector: "Real Estate",
    stance: "cyclical",
    title: "Real Estate Deep Dive",
    subtitle: "Property developers and real estate investment trusts (REITs).",
  },
  {
    id: "utilities",
    sector: "Utilities",
    stance: "defensive",
    title: "Utilities Deep Dive",
    subtitle: "Electric, gas, and water providers.",
  },
];

export function sectorStance(sector: string): SectorStance {
  const row = MARKET_SECTORS.find((item) => item.sector === sector);
  if (row) return row.stance;
  return "cyclical";
}
