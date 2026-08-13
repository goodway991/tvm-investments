# TVM Investments

Daily stock research site that flags candidates using **8 weighted trading strategies**, composite scoring, AI news classification, and a backtested track record.

This repo is an independent Next.js recode of the Figma Make prototype. The Make file inventory lives in `figma-make-backup/`. Firebase Auth and the named Firestore database `tvm-investments` are wired for local development.

> **Not investment advice.** Outputs are flagged by quantitative criteria for educational research.

## Quick Start

```bash
cd ~/Projects/tvm-investments
cp .env.example .env.local
npm install
npm run dev
```

Open [http://127.0.0.1:3000](http://127.0.0.1:3000). Without market-data API keys, the site runs in **demo mode** with realistic sample data. Sign-up / log-in uses Firebase project `tvm-investments-varish`.

## Features

| Feature | Description |
|---------|-------------|
| Top 10 movers | Biggest daily % price changes |
| 8-strategy screener | Weighted composite score (not checkboxes) |
| Top 3 picks | Charts, signals, ~1-page research report each |
| Market events | US & global headlines |
| Tech sector | Dedicated sector write-up |
| Filters | P/E, Beta, Volume, EPS, Market Cap |
| Calculator | USD input + live price → scenario returns (±%, custom %) |
| Backtest log | 1d / 1w / 1m forward returns vs S&P |
| EOD cron | Vercel cron at 10 PM ET weekdays |

## API Keys Setup

### 1. Finnhub (primary live data)

1. Register at [finnhub.io/register](https://finnhub.io/register)
2. Copy API key → `FINNHUB_API_KEY` in `.env.local`
3. Set `DATA_MODE=live`

Provides: quotes, OHLCV, news, fundamentals, sector data.

### 2. OpenAI (news classification — strategy #1)

1. Get key at [platform.openai.com](https://platform.openai.com)
2. Set `OPENAI_API_KEY` in `.env.local`
3. Uses `gpt-4o-mini` to classify headlines as company-specific vs sector/market vs no clear cause

Without this key, rule-based keyword fallback is used.

### 3. Yahoo Finance (calculator live quotes)

Already integrated via `yahoo-finance2` npm package — no API key required.

When `DATA_MODE=live`, the calculator fetches real-time quotes from Yahoo Finance.

#### Connecting Yahoo Finance for 24/7 live data (walkthrough)

**Option A — Built-in (recommended, already in this repo)**

The project uses the `yahoo-finance2` Node library. It pulls from Yahoo's public endpoints — no OAuth, no no-code middleware.

1. Set `DATA_MODE=live` in `.env.local`
2. Install deps: `npm install`
3. Calculator API (`/api/calculator?symbol=AAPL&amount=1000`) auto-fetches live prices

**Option B — No-code (Make.com / Zapier + webhook)**

1. Create a Make scenario: **HTTP module** → Yahoo Finance quote URL or a third-party Yahoo wrapper
2. Schedule trigger every 15 min during market hours
3. POST results to your Firebase Firestore or `POST /api/calculator`
4. Good if you want visual workflow debugging without code changes

**Option C — MCP (Model Context Protocol)**

1. Install a Yahoo Finance MCP server (search Cursor MCP directory or GitHub for `yahoo-finance mcp`)
2. In Cursor → Settings → MCP → Add server
3. Use MCP tools from agent sessions to query quotes during research
4. For the **website**, still use the built-in API route — MCP is for your IDE/agent workflow, not browser clients

**Option D — Alpha Vantage (backup)**

Set `ALPHA_VANTAGE_API_KEY` for additional fundamentals if Finnhub limits are hit (5 calls/min free tier).

### 4. Firebase (Auth + Firestore + backtest log)

Local `.env.local` already points at Firebase project **tvm-investments-varish**, named database **tvm-investments** (Enterprise Native, `us-east1`). Email/password Auth and Firestore rules are deployed.

#### Client config

1. Confirm the web app values in [Firebase Console](https://console.firebase.google.com) → Project settings
2. Copy `NEXT_PUBLIC_FIREBASE_*` into `.env.local` if you recreate the project

#### Admin (server writes)

1. Project Settings → Service Accounts → Generate new private key
2. Set in `.env.local`:
   ```
   FIREBASE_ADMIN_PROJECT_ID=your-project
   FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-...@....iam.gserviceaccount.com
   FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
   ```

#### Firestore collections

| Collection | Purpose |
|------------|---------|
| `daily_snapshots` | Full EOD screener output |
| `backtest_entries` | Pick + forward returns |
| `user_investments` | Calculator scenarios (optional logging) |

Enable Firestore in Firebase Console before first deploy.

## Deploy to Vercel

1. Push repo to GitHub (install Xcode CLI tools first: `xcode-select --install`)
2. Import project at [vercel.com/new](https://vercel.com/new)
3. Add all `.env.local` variables in Vercel project settings
4. Deploy — cron runs `/api/cron/daily-snapshot` weekdays at 22:00 UTC (adjust in `vercel.json`)
5. Set `CRON_SECRET` and Vercel will send `Authorization: Bearer <secret>`

## Methodology Weights

| Strategy | Weight |
|----------|--------|
| Dip, no fundamental cause | 18% |
| Oversold RSI / Bollinger | 14% |
| Volume & momentum | 12% |
| Support bounces | 14% |
| Relative strength | 12% |
| Catalyst upside | 12% |
| Gap fills | 10% |
| Short squeeze | 8% |

Strategies #6 (options flow) and #8 (short interest) show **partial/unavailable** markers on free data tiers — visible in UI, not hidden.

## Red Flags & Limitations

1. **Not financial advice** — heuristics can fail; company-specific bad news masquerading as noise is the main risk for dip-buying
2. **Survivorship / small sample** — backtest needs 30+ trading days of logged picks before conclusions
3. **Free-tier data gaps** — short interest (FINRA biweekly), options flow (paid), after-hours gaps
4. **LLM news classification** — can misclassify; confidence labels are estimates
5. **Demo mode** — scores are illustrative until live keys are configured
6. **Yahoo Finance** — unofficial API; may rate-limit; not for high-frequency production without fallback

## Project Structure

```
src/
  app/           # Next.js pages + API routes
  components/    # UI
  lib/
    scoring.ts   # 8 strategies + composite score
    indicators.ts
    demo-data.ts
    analysis-pipeline.ts
    firebase/
    providers/   # Finnhub, Yahoo
scripts/
  run-daily-snapshot.ts
```

## Manual Snapshot

```bash
npm run snapshot
```

Runs the same pipeline as the Vercel cron job.
