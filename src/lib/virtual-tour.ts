export type TourSceneId =
  | "welcome"
  | "dashboard"
  | "brief"
  | "screener"
  | "stock"
  | "watchlist"
  | "portfolio"
  | "reports"
  | "settings"
  | "repeat";

export interface TourSlide {
  id: TourSceneId;
  name: string;
  how: string;
}

export const TOUR_SLIDES: TourSlide[] = [
  {
    id: "welcome",
    name: "Your research desk",
    how: "After you sign in, the dashboard is home. Numbers refresh on weekday closes — this is educational research, not advice.",
  },
  {
    id: "dashboard",
    name: "Dashboard",
    how: "Tap a summary card to jump in: top pick opens the stock, names screened opens the screener, daily movers opens the movers list.",
  },
  {
    id: "brief",
    name: "Daily Brief",
    how: "Open Daily Brief in the sidebar for the day’s flagged names, sector notes, and the short write-up of what the desk is watching.",
  },
  {
    id: "screener",
    name: "Screener",
    how: "Use the eight-signal screener to filter the universe. Adjust the filters, then tap a name to read why it screened in.",
  },
  {
    id: "stock",
    name: "Stock sheet",
    how: "Tap any flagged name to open its full sheet — chart, scores, and notes. Close stays pinned at the top and bottom so you can always leave.",
  },
  {
    id: "watchlist",
    name: "Watchlist pulse",
    how: "Add names on Watchlist, then check Watchlist pulse on the dashboard. Compact view shows only what you selected; Expand lets you add more.",
  },
  {
    id: "portfolio",
    name: "Portfolio",
    how: "Track cash and positions you enter. New accounts start at zero — add only what you want to follow. The calculator sits with the same workspace.",
  },
  {
    id: "reports",
    name: "Reports",
    how: "Open Reports for the write-ups on flagged picks. Free includes the core notes; Pro unlocks the longer culture and path write-ups.",
  },
  {
    id: "settings",
    name: "Settings",
    how: "View your plan, send a bug or feature note, and manage the account from Settings. Legal pages are linked there too.",
  },
  {
    id: "repeat",
    name: "That’s the desk",
    how: "To repeat this tour anytime, go to Settings and tap Virtual Tour.",
  },
];
