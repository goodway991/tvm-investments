export type BogenId =
  | "nav-dashboard"
  | "nav-brief"
  | "nav-screener"
  | "nav-reports"
  | "nav-watchlist"
  | "nav-portfolio"
  | "nav-archive"
  | "nav-horizon"
  | "nav-maintenance"
  | "nav-upgrade"
  | "nav-account"
  | "nav-logo"
  | "top-pick"
  | "names-screened"
  | "daily-movers-card"
  | "composite"
  | "ticker-search"
  | "watchlist-pulse"
  | "todays-movers"
  | "overview-calculator"
  | "flagged-picks"
  | "brief"
  | "market-events"
  | "sector-dives"
  | "screener"
  | "methodology"
  | "movers"
  | "watchlist"
  | "portfolio"
  | "portfolio-cash"
  | "portfolio-holding"
  | "portfolio-review"
  | "portfolio-score"
  | "portfolio-predict"
  | "portfolio-diversity"
  | "portfolio-concentration"
  | "portfolio-quality"
  | "portfolio-value"
  | "portfolio-buffer"
  | "portfolio-breadth"
  | "portfolio-improve"
  | "portfolio-next"
  | "portfolio-considering"
  | "reports"
  | "reports-horizon"
  | "calculator"
  | "stock-sheet"
  | "archive"
  | "horizon"
  | "settings"
  | "feedback"
  | "virtual-tour"
  | "admin-gifting";

export type BogenTipCopy = {
  title: string;
  what: string;
  how: string;
};

export const BOGEN_TIPS: Record<BogenId, BogenTipCopy> = {
  "nav-dashboard": {
    title: "Dashboard",
    what: "Home after you sign in. It summarizes today’s scan: top pick, movers, watchlist pulse, and a quick calculator.",
    how: "Tap a summary card to jump to that page or open a stock sheet. Use search to look up a ticker.",
  },
  "nav-brief": {
    title: "Daily Brief",
    what: "The session write-up: market headlines and sector notes rebuilt from today’s scan of about 1,500 liquid US names.",
    how: "Open Daily Brief in the sidebar. Flip through headline and sector cards. Pro unlocks extra sector dives.",
  },
  "nav-screener": {
    title: "Screener",
    what: "A filter over today’s scored universe. Eight research signals combine into a composite score.",
    how: "Set P/E, beta, volume, EPS, or market cap, or type a ticker. Tap a name to open its sheet.",
  },
  "nav-reports": {
    title: "Reports",
    what: "Write-ups on the flagged picks: why they screened in, scores, and notes. Free shows the core three; Pro adds more lists.",
    how: "Open Reports. Tap a pick to read the full sheet. Pro also gets separate short-term and long-term lists.",
  },
  "nav-watchlist": {
    title: "Watchlist",
    what: "Your personal list of names to follow. Free allows 10 and locks changes for seven days; Pro allows 100.",
    how: "Search a ticker or company, tap Add, then Save. Compact view shows only what you picked.",
  },
  "nav-portfolio": {
    title: "Portfolio",
    what: "A private log of cash and positions you enter. New accounts start at zero — it does not connect to a broker.",
    how: "Add cash, then add shares and average cost for names you want to track. Save after each change.",
  },
  "nav-archive": {
    title: "Archive Calendar",
    what: "Rewind the site to a prior weekday session so you can see what the scan showed that day.",
    how: "When it is unlocked, pick a date. The rest of the site rewinds to that day’s layout, features, and research until you leave archive mode.",
  },
  "nav-horizon": {
    title: "Horizon Suite",
    what: "A paper trading book for trying ideas without live money. Still being built for most accounts.",
    how: "If you have access, pick a name, place a paper trade, and reset the book when you want a clean start.",
  },
  "nav-maintenance": {
    title: "Maintenance",
    what: "A reminder when scheduled downtime is coming or in progress. It stays in the sidebar even if you dismiss the top banner.",
    how: "Tap the orange card to read the full window. The site unlocks automatically when the end time passes.",
  },
  "nav-upgrade": {
    title: "Upgrade to Pro",
    what: "Free is the core scan. Pro unlocks longer notes, more movers, extra watchlist slots, and more.",
    how: "Tap to see the plan table and checkout.",
  },
  "nav-account": {
    title: "Account",
    what: "Your name and plan, plus Settings for appearance, Bogen mode, the virtual tour, and feedback.",
    how: "Tap the profile row at the bottom of the sidebar. Pro sits under your name on that same row.",
  },
  "nav-logo": {
    title: "The TVM mark",
    what: "The logo is the menu control. There is no hamburger icon.",
    how: "Click the mark to shrink the sidebar to the logo, hide it completely, or bring the full menu back. When it is hidden, the floating mark opens it again.",
  },
  "top-pick": {
    title: "Top pick",
    what: "The highest composite-score name from today’s scan, with its session move.",
    how: "Tap the card to open that stock’s full sheet — chart, scores, and notes.",
  },
  "names-screened": {
    title: "Names screened",
    what: "How many liquid US names went through today’s eight-signal scan.",
    how: "Tap to open the Screener and filter that universe.",
  },
  "daily-movers-card": {
    title: "Daily movers",
    what: "How many names in the scan made a notable move versus the previous close.",
    how: "Tap to open the full movers table. Free shows the top 10; Pro shows the top 20.",
  },
  composite: {
    title: "Account score",
    what: "A 0–100 rating of your book: watchlist and portfolio names, using each stock’s scan score, niche, P/E, and RSI when we have them.",
    how: "Tap to open Watchlist. Add or drop names there (and in Portfolio) to move the score. Empty books show a dash until something is on the account.",
  },
  "ticker-search": {
    title: "Ticker search",
    what: "A shortcut to find a listed US name.",
    how: "Type a symbol or company, then Search. It opens Watchlist with that query so you can add it.",
  },
  "watchlist-pulse": {
    title: "Watchlist pulse",
    what: "Live charts for names on your watchlist, plus a Pro two-week path using closes and a short-term model.",
    how: "Flip with the arrows. Tap the symbol to open the sheet. Pro can tap Predict for the two-week path.",
  },
  "todays-movers": {
    title: "Today’s movers",
    what: "A short list of the largest session moves, ranked by percent change versus the previous close.",
    how: "Tap a row to open that stock. View all opens the full movers page.",
  },
  "overview-calculator": {
    title: "Quick calculator",
    what: "Illustrative dollar outcomes if a name moved ±5% or ±10%. Not a recommendation.",
    how: "Type a dollar amount. The four boxes update. For a named ticker, use the full calculator on this page or Portfolio.",
  },
  "flagged-picks": {
    title: "Flagged picks",
    what: "The three highest composite names from today’s scan.",
    how: "Tap a pick to open its sheet. Reports has the longer write-ups.",
  },
  brief: {
    title: "Daily Brief",
    what: "Headlines and sector notes for this session, not leftover copy from a prior day.",
    how: "Read the event cards, then flip sector dives. Pro unlocks additional sectors.",
  },
  "market-events": {
    title: "Market-moving events",
    what: "Four headline slots from this session’s scan — US, global, and mixed tape.",
    how: "Tap a card to expand the fuller note, source, and any tickers. Empty slots mean the snapshot did not fill that row.",
  },
  "sector-dives": {
    title: "Sector dives",
    what: "A flip-through of sector notes with example names, scores, and headlines from the scan.",
    how: "Use the arrows. Free includes the first dive; Pro unlocks the rest of the deck.",
  },
  screener: {
    title: "Stock filter",
    what: "Filters today’s scored scan by fundamentals and trading stats.",
    how: "Fill any box, or find a ticker. Results update in the table. Tap a symbol for the sheet.",
  },
  methodology: {
    title: "Eight-signal methodology",
    what: "The eight research signals that roll into the composite score. They are not independent checkboxes.",
    how: "Read each signal. A name hitting several at once ranks above a name hitting only one.",
  },
  movers: {
    title: "Price movers",
    what: "Largest moves versus the previous close across the daily scan.",
    how: "Sort is already by session move. Tap through to a sheet from other pages; this table is the ranked list. Free shows 10, Pro shows 20.",
  },
  watchlist: {
    title: "Watchlist",
    what: "Names you chose to follow. Limits and the seven-day lock depend on your plan.",
    how: "Search, tap Add or Added, then Save. Compact hides the picker. Watchlist pulse on Dashboard charts what you saved.",
  },
  portfolio: {
    title: "Current book",
    what: "A private log of cash and positions you already hold. It does not connect to a broker or place trades.",
    how: "Save cash, then search a name, enter shares, and a buy price or date. Remove a row if you no longer want it tracked.",
  },
  "portfolio-cash": {
    title: "Cash",
    what: "Idle dollars on this tracker. They count toward book value and the cash-buffer score in the review.",
    how: "Type the cash you want on the account and tap Save. It stays on this login until you change it.",
  },
  "portfolio-holding": {
    title: "Add a holding",
    what: "Search the tape or your watchlist, then save shares and a buy price or date as a real line in the book.",
    how: "Click the search bar, pick a name, fill shares and cost, then Save holding. That row is stored — unlike Considering, which is a sketch.",
  },
  "portfolio-review": {
    title: "Analyze book",
    what: "A Pro read of mix, concentration, scan quality, valuation, cash, and breadth — plus what to try next.",
    how: "Tap Analyze book. Each score card opens for a longer note. Pro unlocks the full review.",
  },
  "portfolio-score": {
    title: "Overall score",
    what: "A 0–100 snapshot of the saved book. Predict score, under Considering, opens a second bar for the mix if those names were added.",
    how: "Tap Analyze book for the current score. Fill Considering, then Predict score. The chip is possible minus the current book.",
  },
  "portfolio-predict": {
    title: "Predict score",
    what: "Re-runs the book review as if the considering names were already holdings.",
    how: "Fill Considering first. Tap Predict score. A green chip means the mix improved; coral means it slipped.",
  },
  "portfolio-diversity": {
    title: "Sector mix",
    what: "How spread the dollars are across sectors, not just how many tickers you listed.",
    how: "Tap More for the note. A second unrelated sleeve usually lifts this more than adding a cousin in the same group.",
  },
  "portfolio-concentration": {
    title: "Name concentration",
    what: "How much of the book sits in the largest single holding.",
    how: "Tap More. If one name is most of the value, size it down or grow the other lines.",
  },
  "portfolio-quality": {
    title: "Scan quality",
    what: "The weekday composite of the names you hold, weighted by position size.",
    how: "Tap More. Lagging lines are worth opening on Reports — the write-up sits behind the score.",
  },
  "portfolio-value": {
    title: "Valuation mix",
    what: "A value-weighted P/E read of the book when the scan has multiples on file.",
    how: "Tap More. High multiples are not a sell signal by themselves — they tell you a reset would hit this sleeve first.",
  },
  "portfolio-buffer": {
    title: "Cash buffer",
    what: "How much of the tracked book is cash vs invested names.",
    how: "Tap More. A small sleeve of cash gives you room to add without selling a winner first.",
  },
  "portfolio-breadth": {
    title: "Breadth",
    what: "How many holdings and sectors are actually carrying the book.",
    how: "Tap More. A few names in one sleeve scores differently than a wider set with real weight.",
  },
  "portfolio-improve": {
    title: "How to improve",
    what: "A short note on the weakest sleeves from this review, written from the scores above.",
    how: "Read it, then use the smaller next-step cards or open Considering to model a new name before you save it.",
  },
  "portfolio-next": {
    title: "Next steps",
    what: "Concrete follow-ups tied to this book — a new sleeve, a lagging name, or a cash move.",
    how: "Pick one card and do that first. The review updates the next time you tap Analyze book after the book changes.",
  },
  "portfolio-considering": {
    title: "Names you’re considering",
    what: "A scratch pad for extra shares on top of the saved book. It does not write to your holdings.",
    how: "Click the search bar, pick a watchlist name, and try share counts. Refreshing the page clears this sketch.",
  },
  reports: {
    title: "Flagged pick reports",
    what: "The session write-ups for the top composite names — scores, notes, and charts.",
    how: "Read Pick 1–3. Tap a name where it is a button to open the full sheet. Pro lists sit below.",
  },
  "reports-horizon": {
    title: "Short-term and long-term lists",
    what: "Pro-only ranked lists using different weights: dips and RSI versus longer-term strength and fundamentals.",
    how: "Scroll to each list on Reports. Free sees a lock instead — open View plan to upgrade.",
  },
  calculator: {
    title: "Hypothetical calculator",
    what: "Illustrative math on a ticker using a live quote when available. You can lose money; this is not advice.",
    how: "Enter a symbol and dollar amount, then run a preset or custom percent. Results are scenarios, not forecasts.",
  },
  "stock-sheet": {
    title: "Stock sheet",
    what: "The full card for one name: chart, composite pieces, and notes from this session.",
    how: "Open it from a pick, mover, or search. Close stays at the top and bottom so you can always leave.",
  },
  archive: {
    title: "Archive Calendar",
    what: "A rewind of the whole product as it was on a past session — layout, features, and that day’s research.",
    how: "Choose a date. An archive banner stays up until you return to the live session.",
  },
  horizon: {
    title: "Horizon Suite",
    what: "Paper trading with a cash book and positions. No live brokerage, no real P&L.",
    how: "Pick a quoted name, enter a paper order, and use Reset book to start over.",
  },
  settings: {
    title: "Settings",
    what: "Your account card: name, plan, appearance, Bogen mode, version history, tour, and legal links.",
    how: "Edit your name with the pencil. Appearance and Bogen mode save on this browser. A yellow New mark sits on Bogen mode for three days after you first see it.",
  },
  feedback: {
    title: "Feedback",
    what: "Send a bug report or a feature idea from this account, with a 1–5 star rating.",
    how: "Choose Bug or Feature, tap stars, write at least a short note, then send.",
  },
  "virtual-tour": {
    title: "Virtual tour",
    what: "A click-through of the main features, including a cursor demo of the logo menu.",
    how: "Tap Virtual Tour. Use Next and Back, or arrow keys. Finish saves that you have seen this version.",
  },
  "admin-gifting": {
    title: "Complimentary Pro",
    what: "Admin-only: grant or remove Pro for signed-up accounts without charging them.",
    how: "Find the person by name or email. Give Pro or Set to Free. Paid Pro boxes glow blue — leave those alone.",
  },
};
