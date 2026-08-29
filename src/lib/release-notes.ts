import { showTvm10Labs } from "@/lib/beta-labs";

export const CURRENT_RELEASE_ID = showTvm10Labs() ? "tvm-1" : "beta-3";
/** Frozen for TVM 1.0. Do not bump this for copy edits — that re-opens What’s New. */
export const RELEASE_ACK_ID = showTvm10Labs() ? "tvm-1-launch" : "beta-3-reopen";

const RELEASE_ACK_ORDER = [
  "beta-1",
  "beta-2",
  "beta-2.1-score",
  "beta-2.2",
  "beta-3-v2",
  "beta-3-live",
  "beta-3-reopen",
  "tvm-1-v1",
  "tvm-1-v2",
  "tvm-1-v3",
  "tvm-1-v4",
  "tvm-1-v5",
  "tvm-1-v6",
  "tvm-1-v7",
  "tvm-1",
  "tvm-1-launch",
];

const RELEASE_ACK_ALIASES: Record<string, string> = {
  "beta-2.1": "beta-2.1-score",
  "beta-3": "beta-3-live",
};

function normalizeReleaseAck(id: string) {
  return RELEASE_ACK_ALIASES[id] || id;
}

function ackIndex(id: string) {
  return RELEASE_ACK_ORDER.indexOf(normalizeReleaseAck(id));
}

export function releaseIsAcknowledged(
  seen: string,
  required = RELEASE_ACK_ID,
) {
  if (!seen) return false;
  const seenId = normalizeReleaseAck(seen);
  const needId = normalizeReleaseAck(required);
  if (seenId === needId) return true;
  const seenIdx = ackIndex(seenId);
  const needIdx = ackIndex(needId);
  if (seenIdx === -1 || needIdx === -1) return false;
  return seenIdx >= needIdx;
}

export function laterReleaseAck(left: string, right: string) {
  if (!left) return right;
  if (!right) return left;
  const leftIdx = ackIndex(left);
  const rightIdx = ackIndex(right);
  if (leftIdx === -1 && rightIdx === -1) return right;
  if (leftIdx === -1) return right;
  if (rightIdx === -1) return left;
  return leftIdx >= rightIdx ? left : right;
}

export type ReleaseFeatureVisualId =
  | "bogen"
  | "events"
  | "account-score"
  | "portfolio-2"
  | "clean-mode"
  | "customize"
  | "sectors"
  | "horizon"
  | "ultra"
  | "accuracy";

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
    date: "August 14th, 2026",
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
        title: "Account score on Daily Brief — your watchlist and book",
        visual: "account-score",
      },
      {
        title: "UI updates",
      },
    ],
  },
  {
    id: "beta-3",
    version: "Beta v3.0",
    title: "Clean mode",
    date: "August 15th, 2026",
    summary:
      "A quieter dashboard when you want it, and a first-run sheet so the desk is yours.",
    features: [
      {
        title: "Clean vs Normal",
        visual: "clean-mode",
        body: "Flip the slider in Settings or Let’s customize. Clean is Welcome, today’s pick, your book, and three movers. Normal is the full dashboard.",
      },
      {
        title: "Let’s customize",
        visual: "customize",
        body: "A short setup for Bogen, light or dark, and Clean vs Normal. You can change any of it later in Settings.",
      },
    ],
  },
  {
    id: "tvm-1",
    version: "TVM 1.0",
    title: "Ultra desk",
    date: "September 25th, 2026",
    summary:
      "Builds on Beta v3.0. Country and time zone for every account. Ultra gets a 6am good morning, Portfolio 2.0, and a workstation. Predictions read at the 99%* target. Every plan now gets all six sector deep dives.",
    features: [
      {
        title: "99%* accurate predictions",
        visual: "accuracy",
        body: "Pulse Predict, Portfolio Score, and Portfolio Addition now read at the 99%* research-read target. Ultra also gets Advanced Predictions on the workstation. Not a guarantee — the plan table footnote still applies.",
      },
      {
        title: "Portfolio 2.0",
        visual: "portfolio-2",
        body: "Analyze the book and Predict a score before you add a name. Pro gets 3 Portfolio Score Predictions and 1 Portfolio Addition Prediction a week. Ultra is unlimited. Free still logs holdings.",
      },
      {
        title: "Ultra",
        visual: "ultra",
        body: "Unlimited Predict, a 6:00 good morning in your zone, Portfolio 2.0, and a workstation. Pro stays at 5 Pulse Predicts, 3 score predictions, 1 book addition, and 5 Horizon predictions a week. Free gets 2 Pulse Predicts.",
      },
      {
        title: "Horizon Suite",
        visual: "horizon",
        body: "Slide to a horizon, then Predict. Live tape stays blue. Pro draws peach glow; Ultra draws the blue–white–peach sweep.",
      },
      {
        title: "All 6 sector deep dives",
        visual: "sectors",
        body: "Daily Brief flips through every sleeve — tech, financials, healthcare, consumer, industrials, and energy. Free, Pro, and Ultra all get the full deck.",
      },
      {
        title: "Bogen mode updated",
        visual: "bogen",
        body: "Turn Bogen on and unfamiliar vocab is highlighted. Tap an underline for a short popup — stock news, Daily Brief headlines, morning recap, and Horizon Suite recipes like what High score quiet names or a trading-day horizon actually do.",
      },
    ],
    items: [
      "Open View plan to see every Ultra feature.",
    ],
  },
];

export const CURRENT_RELEASE =
  RELEASES.find((release) => release.id === CURRENT_RELEASE_ID) ??
  RELEASES[RELEASES.length - 1];
