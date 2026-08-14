export const CURRENT_RELEASE_ID = "beta-2";

export type ReleaseNote = {
  id: string;
  version: string;
  title: string;
  date: string;
  summary: string;
  items: string[];
};

export const RELEASES: ReleaseNote[] = [
  {
    id: "beta-1",
    version: "Beta v1",
    title: "We're live",
    date: "August 12th, 2026",
    summary:
      "TVM Investments opens — weekday screens, a watchlist, and a private account for people who research their own names.",
    items: [
      "Daily Brief, movers, screener, and company notes after each weekday session",
      "Watchlist pulse, a portfolio log, and Pro vs Free",
      "A first-run tour and Settings so the account feels like yours",
    ],
  },
  {
    id: "beta-2",
    version: "Beta v2",
    title: "After dark",
    date: "August 14th, 2026",
    summary:
      "Night mode lands. Frosted glass, a sharper watchlist, and a cleaner look from sign-in to Settings.",
    items: [
      "Dark mode in Settings — near-black glass, bright type, blue where it counts",
      "Watchlist is back as an Add / Added grid of household names",
      "Weekday scan now covers about 1,500 liquid US names",
      "A dismissible orange notice when scheduled downtime is coming",
      "Blue throughout — navy in light, white in dark",
    ],
  },
];

export const CURRENT_RELEASE =
  RELEASES.find((release) => release.id === CURRENT_RELEASE_ID) ?? RELEASES[RELEASES.length - 1];
