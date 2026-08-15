import { showBeta3Labs } from "@/lib/beta-labs";

export const CURRENT_RELEASE_ID = showBeta3Labs() ? "beta-3" : "beta-2.1";
export const RELEASE_ACK_ID = showBeta3Labs() ? "beta-3-v2" : "beta-2.1-score";

const RELEASE_ACK_ORDER = [
  "beta-1",
  "beta-2",
  "beta-2.1-score",
  "beta-2.2",
  "beta-3-v2",
];

const RELEASE_ACK_ALIASES: Record<string, string> = {
  "beta-2.1": "beta-2.1-score",
  "beta-3": "beta-3-v2",
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
  | "clean-mode";

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
    version: "Beta v3",
    title: "Clean mode and Portfolio 2.0",
    date: "August 14th, 2026",
    summary:
      "A quieter dashboard when you want it, and a book you can actually fill in — holdings first, then names you’re considering.",
    features: [
      {
        title: "Portfolio 2.0",
        visual: "portfolio-2",
        body: "Log the shares you already hold, with a buy price or a buy date. Search your watchlist first, then the rest of the tape.",
      },
      {
        title: "Clean mode",
        visual: "clean-mode",
        body: "A slider in Settings (and in Let’s customize) switches Clean and Normal. Clean keeps today’s pick, your book, and a short mover list.",
      },
    ],
  },
];

export const CURRENT_RELEASE =
  RELEASES.find((release) => release.id === CURRENT_RELEASE_ID) ??
  RELEASES[RELEASES.length - 1];
