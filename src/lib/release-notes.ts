export const CURRENT_RELEASE_ID = "beta-2.1";

export type ReleaseFeatureVisualId = "bogen" | "events";

export type ReleaseFeature = {
  title: string;
  body?: string;
  visual?: ReleaseFeatureVisualId;
};

export type ReleaseNote = {
  id: string;
  version: string;
  title: string;
  date: string;
  summary: string;
  items?: string[];
  features?: ReleaseFeature[];
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
  {
    id: "beta-2.1",
    version: "Beta v2.1",
    title: "Bogen mode",
    date: "August 15th, 2026",
    summary:
      "A question mark next to each feature, with a short how-to when you tap it. Turn it on or off in Settings.",
    features: [
      {
        title: "Bogen mode",
        visual: "bogen",
        body: "Turn it on in Settings. A question mark appears next to sidebar items and widgets. Tap one to read what that feature does and how to use it. Turn it off the same way — the circles disappear.",
      },
      {
        title: "Market-moving events",
        visual: "events",
        body: "On Daily Brief, tap a market-moving event card to expand it. The card gets longer with the fuller note and any extra info — then tap again to collapse back to the headline.",
      },
      {
        title: "UI updates",
      },
    ],
  },
];

export const CURRENT_RELEASE =
  RELEASES.find((release) => release.id === CURRENT_RELEASE_ID) ??
  RELEASES[RELEASES.length - 1];
