"use client";

import { useEffect, useId, useMemo, useState } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { authedFetch } from "@/lib/authed-fetch";
import { StockSearchField, type SearchHit } from "@/components/StockSearchField";
import { parseTicker } from "@/lib/ticker";
import { formatPrice } from "@/lib/chart-series";
import { useHtmlDark } from "@/lib/use-chart-draw";
import { UltraShinePhrase } from "@/components/UltraText";
import type { Hour72Calibration, Hour72Point } from "@/lib/hour72-forecast";

type Hour72Payload = {
  symbol?: string;
  last?: number;
  equationCount?: number;
  variableCount?: number;
  history?: Array<{ label: string; timestamp: number; value: number }>;
  path?: Hour72Point[];
  calibration?: Hour72Calibration;
  note?: string;
  error?: string;
};

const LIGHT = {
  line: "#2f62ff",
  band: "rgba(47, 98, 255, 0.16)",
  hist: "#12203c",
  grid: "#ece9f6",
  tick: "#51607a",
  tooltipBg: "#ffffff",
  tooltipColor: "#12203c",
  tooltipBorder: "1px solid rgba(37,99,235,.18)",
};

const DARK = {
  line: "#7dd3fc",
  band: "rgba(125, 211, 252, 0.22)",
  hist: "#e8f6ff",
  grid: "rgba(255,255,255,0.06)",
  tick: "rgba(255,255,255,0.45)",
  tooltipBg: "#16132b",
  tooltipColor: "#e8f6ff",
  tooltipBorder: "1px solid rgba(125,211,252,.22)",
};

export function Hour72Predictor({
  symbol,
  onSymbol,
  universe,
  watchlist,
}: {
  symbol: string;
  onSymbol: (symbol: string) => void;
  universe: SearchHit[];
  watchlist: string[];
}) {
  const dark = useHtmlDark();
  const palette = dark ? DARK : LIGHT;
  const bandId = useId().replace(/:/g, "");
  const [draft, setDraft] = useState(symbol);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [payload, setPayload] = useState<Hour72Payload | null>(null);

  useEffect(() => {
    setDraft(symbol);
    setPayload(null);
    setError("");
  }, [symbol]);

  async function run() {
    const ticker = parseTicker(draft) || parseTicker(symbol);
    if (!ticker) {
      setError("Search a ticker first.");
      return;
    }
    onSymbol(ticker);
    setDraft(ticker);
    setError("");
    setBusy(true);
    try {
      const response = await authedFetch("/api/hour72-forecast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol: ticker }),
      });
      const text = await response.text();
      let next: Hour72Payload = {};
      if (text.trim()) {
        try {
          next = JSON.parse(text) as Hour72Payload;
        } catch {
          throw new Error("72-hour desk returned bad JSON.");
        }
      }
      if (!response.ok || !next.path?.length) {
        throw new Error(next.error || "72-hour desk did not return a path.");
      }
      setPayload(next);
    } catch (caught) {
      setPayload(null);
      setError(caught instanceof Error ? caught.message : "72-hour desk failed.");
    } finally {
      setBusy(false);
    }
  }

  const chartData = useMemo(() => {
    if (!payload?.path?.length) return [];
    const hist = (payload.history ?? []).map((row) => ({
      label: row.label,
      timestamp: row.timestamp,
      actual: row.value,
      predicted: null as number | null,
      low: null as number | null,
      high: null as number | null,
      bandBase: null as number | null,
      bandSize: null as number | null,
    }));
    const tip = hist[hist.length - 1];
    const forward = payload.path.map((row, index) => ({
      label: row.label,
      timestamp: row.timestamp,
      actual: index === 0 && tip ? tip.actual : null,
      predicted: row.predicted,
      low: row.low,
      high: row.high,
      bandBase: row.low,
      bandSize: Math.max(0, row.high - row.low),
    }));
    if (tip && forward[0]) {
      forward[0] = {
        ...forward[0],
        actual: tip.actual,
        predicted: tip.actual,
        low: tip.actual,
        high: tip.actual,
        bandBase: tip.actual,
        bandSize: 0,
      };
    }
    return [...hist.slice(0, -1), ...forward];
  }, [payload]);

  const cal = payload?.calibration;

  return (
    <section className="glass-strong rounded-[24px] border border-violet/20 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-violet">
            Admin lab · Ultra October unlock
          </p>
          <h2 className="mt-1 font-display text-lg font-semibold text-ink">
            <UltraShinePhrase>72-hour hour-by-hour desk</UltraShinePhrase>
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-ink-soft">
            Hundreds of equations and thousands of tape variables on hourly bars,
            projected hour-by-hour for the next 72 hours with research bands.
            Admin-only until Ultra gets it in October. Not a guaranteed future
            price.
          </p>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => void run()}
          className="glass-violet rounded-full px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {busy ? "Fitting…" : payload ? "Re-run 72h" : "Run 72h path"}
        </button>
      </div>

      <div className="mt-4 max-w-md">
        <StockSearchField
          universe={universe}
          watchlist={watchlist}
          showSearchButton
          placeholder="Search stocks…"
          onPick={(hit) => {
            onSymbol(hit.symbol);
            setDraft(hit.symbol);
            setError("");
            setPayload(null);
          }}
        />
        {draft ? (
          <p className="mt-2 text-sm font-semibold text-ink">
            {draft}
            <span className="ml-2 font-normal text-ink-soft">selected</span>
          </p>
        ) : null}
      </div>

      {error ? (
        <p className="mt-3 text-sm text-coral" role="alert">
          {error}
        </p>
      ) : null}

      {payload && cal ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-4">
          <div className="rounded-2xl bg-surface p-3">
            <p className="text-[11px] text-ink-soft">Equations</p>
            <p className="mt-1 font-display text-xl font-bold text-ink">
              {payload.equationCount?.toLocaleString()}
            </p>
          </div>
          <div className="rounded-2xl bg-surface p-3">
            <p className="text-[11px] text-ink-soft">Variables</p>
            <p className="mt-1 font-display text-xl font-bold text-ink">
              {payload.variableCount?.toLocaleString()}
            </p>
          </div>
          <div className="rounded-2xl bg-surface p-3">
            <p className="text-[11px] text-ink-soft">Walk-forward fidelity</p>
            <p className="mt-1 font-display text-xl font-bold text-ink">
              {cal.fidelityPct.toFixed(2)}%
            </p>
          </div>
          <div className="rounded-2xl bg-surface p-3">
            <p className="text-[11px] text-ink-soft">Direction hit / band</p>
            <p className="mt-1 font-display text-xl font-bold text-ink">
              {cal.directionHitPct.toFixed(0)}% · {cal.bandCoveragePct.toFixed(0)}%
            </p>
          </div>
        </div>
      ) : null}

      {chartData.length > 0 ? (
        <div className="mt-4 h-[320px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={`h72-band-${bandId}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={palette.line} stopOpacity={0.28} />
                  <stop offset="100%" stopColor={palette.line} stopOpacity={0.04} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={palette.grid} vertical={false} />
              <XAxis
                dataKey="label"
                minTickGap={28}
                tick={{ fill: palette.tick, fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                domain={["auto", "auto"]}
                width={56}
                tick={{ fill: palette.tick, fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(value) => formatPrice(Number(value))}
              />
              <Tooltip
                contentStyle={{
                  background: palette.tooltipBg,
                  color: palette.tooltipColor,
                  border: palette.tooltipBorder,
                  borderRadius: 12,
                  fontSize: 12,
                }}
                formatter={(value, name) => {
                  if (value == null || typeof value !== "number") return ["—", name];
                  return [formatPrice(value), name];
                }}
              />
              <Area
                type="monotone"
                dataKey="bandBase"
                stackId="band"
                stroke="none"
                fill="transparent"
                isAnimationActive={false}
              />
              <Area
                type="monotone"
                dataKey="bandSize"
                stackId="band"
                stroke="none"
                fill={`url(#h72-band-${bandId})`}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="actual"
                stroke={palette.hist}
                strokeWidth={1.6}
                dot={false}
                connectNulls={false}
                isAnimationActive={false}
                name="Hourly tape"
              />
              <Line
                type="monotone"
                dataKey="predicted"
                stroke={palette.line}
                strokeWidth={2}
                dot={false}
                connectNulls
                isAnimationActive={false}
                name="72h path"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      ) : null}

      {payload?.note ? (
        <p className="mt-3 text-xs leading-relaxed text-ink-soft">{payload.note}</p>
      ) : null}
      <p className="mt-2 text-[11px] leading-relaxed text-ink-soft/80">
        Walk-forward fidelity is measured on recent 1-step hourly fits for this
        name — not a promise that the next 72 hours will print inside the band.
        Markets gap; this is educational research.
      </p>
    </section>
  );
}
