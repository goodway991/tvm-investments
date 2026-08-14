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
    title: "Research desk",
    date: "August 2026",
    summary: "The first live desk: daily screens, a watchlist, and a private account.",
    items: [
      "Daily brief, movers, screener, and company notes on the weekday snapshot",
      "Watchlist pulse, portfolio log, and Pro / Free plan limits",
      "Virtual tour, Settings, and a maintenance lock that ADMIN can still enter",
    ],
  },
  {
    id: "beta-2",
    version: "Beta v2",
    title: "Glass desk",
    date: "August 2026",
    summary: "Dark mode, a clearer watchlist, and a heads-up before downtime.",
    items: [
      "Dark mode in Settings, with a deep navy desk and frosted glass cards",
      "Watchlist picker is back: popular names in an Add / Added grid",
      "Weekday scan covers about 1,500 liquid US names",
      "Orange maintenance warning you can switch on from Firebase, with dates you type yourself",
      "Accent color is blue throughout — navy in light mode, white in dark mode",
    ],
  },
];

export const CURRENT_RELEASE =
  RELEASES.find((release) => release.id === CURRENT_RELEASE_ID) ?? RELEASES[RELEASES.length - 1];
