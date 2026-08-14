export const CURRENT_TOUR_ID = "tour-2";

export type TourSceneId =
  | "welcome"
  | "dashboard"
  | "brief"
  | "screener"
  | "stock"
  | "watchlist"
  | "portfolio"
  | "reports"
  | "menu"
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
    name: "Welcome in",
    how: "After you sign in, Dashboard is home. Numbers refresh on weekday closes — this is educational research, not advice.",
  },
  {
    id: "dashboard",
    name: "Dashboard",
    how: "Tap a summary card to jump in: top pick opens the stock, names screened opens the screener, daily movers opens the movers list.",
  },
  {
    id: "brief",
    name: "Daily Brief",
    how: "Open Daily Brief in the sidebar for the day’s flagged names, sector notes, and a short write-up of what is in focus.",
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
    name: "Watchlist",
    how: "Add names on Watchlist, then check Watchlist pulse on the dashboard. Compact view shows only what you selected; Expand lets you add more.",
  },
  {
    id: "portfolio",
    name: "Portfolio",
    how: "Track cash and positions you enter. New accounts start at zero — add only what you want to follow. The calculator sits in the same workspace.",
  },
  {
    id: "reports",
    name: "Reports",
    how: "Open Reports for the write-ups on flagged picks. Free includes the core notes; Pro unlocks the longer culture and path write-ups.",
  },
  {
    id: "menu",
    name: "The logo is the menu",
    how: "Tap the TVM mark at the top of the sidebar to shrink it to the logo, hide the menu, or bring the full menu back. Maintenance, Pro, and your account stay at the bottom.",
  },
  {
    id: "settings",
    name: "Settings",
    how: "Tap your name at the bottom of the sidebar for Settings — plan, feedback, and this tour again.",
  },
  {
    id: "repeat",
    name: "That’s the tour",
    how: "Replay anytime from Settings → Virtual Tour.",
  },
];
