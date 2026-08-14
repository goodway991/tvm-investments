"use client";

import { useId, useMemo } from "react";
import { useChartDrawKey } from "@/lib/use-chart-draw";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ChartPoint } from "@/lib/chart-series";
import { formatPrice } from "@/lib/chart-series";
import {
  buildHorizonChart,
  MAX_HORIZON_TRADING_DAYS,
  type HorizonStats,
} from "@/lib/horizon-forecast";

const LIGHT = {
  line: "#2f62ff",
  band: "rgba(47, 98, 255, 0.16)",
  dash: "rgba(47, 98, 255, 0.38)",
  grid: "#ece9f6",
  tick: "#51607a",
  axis: "#e4e0f0",
  tooltipBg: "#ffffff",
  tooltipColor: "#12203c",
  tooltipBorder: "1px solid rgba(120,108,200,.18)",
  ref: "rgba(81, 96, 122, 0.35)",
};

const DARK = {
  line: "#7dd3fc",
  band: "rgba(125, 211, 252, 0.22)",
  dash: "rgba(186, 230, 253, 0.45)",
  grid: "rgba(255,255,255,0.06)",
  tick: "rgba(255,255,255,0.45)",
  axis: "rgba(255,255,255,0.08)",
  tooltipBg: "#16132b",
  tooltipColor: "#e8f6ff",
  tooltipBorder: "1px solid rgba(125,211,252,.22)",
  ref: "rgba(255,255,255,0.35)",
};

export function HorizonForecastChart({
  history,
  horizonDays,
  onHorizonChange,
  averageCost,
  height = 280,
  tone = "light",
  compact = false,
  statsOverride,
  note,
}: {
  history: ChartPoint[];
  horizonDays: number;
  onHorizonChange: (days: number) => void;
  averageCost?: number;
  height?: number;
  tone?: "light" | "dark";
  compact?: boolean;
  statsOverride?: Partial<HorizonStats> | null;
  note?: string | null;
}) {
  const palette = tone === "dark" ? DARK : LIGHT;
  const fillId = `forecastFill-${useId().replace(/:/g, "")}`;
  const drawKey = useChartDrawKey(
    `${history[0]?.label}-${history[history.length - 1]?.label}-${history.length}`,
  );
  const { points, stats } = useMemo(
    () => buildHorizonChart(history, horizonDays, statsOverride),
    [history, horizonDays, statsOverride],
  );
  const lastForecast = [...points].reverse().find((point) => point.predicted != null);
  const projected = lastForecast?.predicted ?? stats?.last ?? 0;
  const low = lastForecast?.low ?? projected;
  const high = lastForecast?.high ?? projected;
  const muted = tone === "dark" ? "text-white/55" : "text-ink-soft";
  const title = tone === "dark" ? "text-white" : "text-ink";

  if (history.length < 3) {
    return (
      <div className={`grid place-items-center text-sm ${muted}`} style={{ height }}>
        Need a bit more price history to project this name.
      </div>
    );
  }

  const horizonLabel =
    horizonDays <= 0.05
      ? "Now"
      : horizonDays >= MAX_HORIZON_TRADING_DAYS - 0.05
        ? "2 weeks"
        : `${horizonDays.toFixed(1)} trading days`;

  return (
    <div>
      {!compact && (
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${muted}`}>
              Forward path
            </p>
            <p className={`mt-1 font-display text-3xl font-bold ${title}`}>
              {formatPrice(projected)}
            </p>
            <p className={`mt-1 text-xs ${muted}`}>
              {horizonDays <= 0.05
                ? "Last close. Slide forward to open the two-week cone."
                : `Range ${formatPrice(low)} – ${formatPrice(high)}`}
            </p>
          </div>
          <p
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              tone === "dark"
                ? "border border-white/10 bg-white/5 text-sky-100"
                : "border border-violet/15 bg-violet/10 text-violet"
            }`}
          >
            {horizonLabel}
          </p>
        </div>
      )}

      <div
        key={drawKey}
        className={compact ? "chart-stage" : "chart-stage mt-4"}
        style={{ height }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={palette.line} stopOpacity={0.28} />
                <stop offset="100%" stopColor={palette.line} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={palette.grid} vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: palette.tick, fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: palette.axis }}
              interval="preserveStartEnd"
              minTickGap={18}
            />
            <YAxis
              domain={["auto", "auto"]}
              width={58}
              tick={{ fill: palette.tick, fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value: number) => formatPrice(value)}
            />
            <Tooltip
              formatter={(value, name) => [
                formatPrice(Number(value)),
                name === "predicted"
                  ? "Path"
                  : name === "high"
                    ? "High"
                    : name === "low"
                      ? "Low"
                      : "Close",
              ]}
              labelFormatter={(label) => String(label)}
              contentStyle={{
                color: palette.tooltipColor,
                background: palette.tooltipBg,
                border: palette.tooltipBorder,
                borderRadius: 12,
                boxShadow: "0 14px 34px -20px rgba(30,70,160,.3)",
              }}
            />
            {stats && (
              <ReferenceLine
                y={stats.last}
                stroke={palette.ref}
                strokeDasharray="5 6"
              />
            )}
            {averageCost && averageCost > 0 && (
              <ReferenceLine
                y={averageCost}
                stroke="rgba(244,113,116,0.7)"
                strokeDasharray="4 4"
              />
            )}
            <Area
              type="monotone"
              dataKey="bandBase"
              stackId="band"
              stroke="none"
              fill="transparent"
              connectNulls
              isAnimationActive={false}
            />
            <Area
              type="monotone"
              dataKey="bandSize"
              stackId="band"
              stroke="none"
              fill={palette.band}
              connectNulls
              isAnimationActive={false}
            />
            <Area
              type="monotone"
              dataKey="predicted"
              stroke="none"
              fill={`url(#${fillId})`}
              connectNulls
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="high"
              stroke={palette.dash}
              strokeDasharray="4 5"
              strokeWidth={1.2}
              dot={false}
              connectNulls
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="low"
              stroke={palette.dash}
              strokeDasharray="4 5"
              strokeWidth={1.2}
              dot={false}
              connectNulls
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="actual"
              stroke={palette.line}
              strokeWidth={2.4}
              dot={false}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="predicted"
              stroke={palette.line}
              strokeWidth={2.4}
              dot={false}
              connectNulls
              isAnimationActive={false}
              activeDot={{ r: 4, fill: palette.line }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <label className="mt-3 block">
        <span className={`flex items-center justify-between text-xs ${muted}`}>
          <span>Now</span>
          <span>{horizonLabel}</span>
          <span>2 weeks</span>
        </span>
        {compact && horizonDays > 0.05 && (
          <span className={`mt-1 block text-center text-xs ${muted}`}>
            Range {formatPrice(low)} – {formatPrice(high)}
          </span>
        )}
        <input
          type="range"
          min={0}
          max={MAX_HORIZON_TRADING_DAYS}
          step={0.05}
          value={horizonDays}
          onChange={(event) => onHorizonChange(Number(event.target.value))}
          className={`horizon-slider mt-2 w-full ${tone === "light" ? "horizon-slider-light" : ""}`}
          aria-label="Forecast horizon"
        />
      </label>
      {note && (
        <p className={`mt-2 text-xs leading-relaxed ${muted}`}>{note}</p>
      )}
    </div>
  );
}
