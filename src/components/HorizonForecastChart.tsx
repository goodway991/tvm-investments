"use client";

import { useId, useMemo, type ReactNode } from "react";
import { BogenHeading } from "@/components/BogenProvider";
import { BogenTerms } from "@/components/BogenTerms";
import { useChartDrawKey, useHtmlDark } from "@/lib/use-chart-draw";
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
  formatHorizonLabel,
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
  tooltipBorder: "1px solid rgba(37,99,235,.18)",
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
  committedDays,
  predictAction,
  forecastPlan,
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
  committedDays?: number;
  predictAction?: ReactNode;
  forecastPlan?: "pro" | "ultra";
  averageCost?: number;
  height?: number;
  tone?: "light" | "dark";
  compact?: boolean;
  statsOverride?: Partial<HorizonStats> | null;
  note?: string | null;
}) {
  const palette = tone === "dark" ? DARK : LIGHT;
  const htmlDark = useHtmlDark();
  const tooltipInk =
    htmlDark || tone === "dark" ? DARK.tooltipColor : LIGHT.tooltipColor;
  const tooltipBg =
    htmlDark || tone === "dark" ? DARK.tooltipBg : LIGHT.tooltipBg;
  const tooltipBorder =
    htmlDark || tone === "dark" ? DARK.tooltipBorder : LIGHT.tooltipBorder;
  const fillId = `forecastFill-${useId().replace(/:/g, "")}`;
  const strokeId = `forecastStroke-${useId().replace(/:/g, "")}`;
  const drawKey = useChartDrawKey(
    `${history[0]?.label}-${history[history.length - 1]?.label}-${history.length}`,
  );
  const windowDays = Math.max(0, horizonDays);
  const pathDays =
    committedDays && committedDays > 0
      ? Math.min(windowDays, committedDays)
      : 0;
  const sliderMax =
    committedDays && committedDays > 0
      ? committedDays
      : MAX_HORIZON_TRADING_DAYS;
  const { points, stats } = useMemo(
    () => buildHorizonChart(history, pathDays, statsOverride, windowDays),
    [history, pathDays, windowDays, statsOverride],
  );
  const lastForecast = [...points].reverse().find((point) => point.predicted != null);
  const projected = lastForecast?.predicted ?? stats?.last ?? 0;
  const maxLabel = formatHorizonLabel(sliderMax);
  const showMidLabel =
    horizonDays > 0.05 && formatHorizonLabel(horizonDays) !== maxLabel;
  const low = lastForecast?.low ?? projected;
  const high = lastForecast?.high ?? projected;
  const muted = tone === "dark" ? "text-white/55" : "text-ink-soft";
  const title = tone === "dark" ? "text-white" : "text-ink";
  const ultraPath = forecastPlan === "ultra";
  const peachPath = forecastPlan === "pro";
  const predictedStroke = ultraPath
    ? `url(#${strokeId})`
    : peachPath
      ? `url(#${strokeId})`
      : palette.line;
  const predictedDot = ultraPath
    ? "#7aa6ff"
    : peachPath
      ? "#ffc48a"
      : palette.line;
  const predictedFill = ultraPath
    ? "#7aa6ff"
    : peachPath
      ? "#ffd2b0"
      : palette.line;
  const bandStroke = ultraPath
    ? "rgba(255,255,255,0.2)"
    : peachPath
      ? "rgba(255, 210, 176, 0.5)"
      : palette.dash;
  const predictedClass = ultraPath
    ? "horizon-path-ultra"
    : peachPath
      ? "horizon-path-pro"
      : undefined;

  if (history.length < 3) {
    return (
      <div>
        <div className={`grid place-items-center text-sm ${muted}`} style={{ height }}>
          Pick a ticker and a horizon, then Predict.
        </div>
        <label className="mt-3 block">
          <span className={`flex items-center justify-between text-xs ${muted}`}>
            <span>Now</span>
            <span>{maxLabel}</span>
          </span>
          <input
            type="range"
            min={0}
            max={sliderMax}
            step={1}
            value={Math.min(horizonDays, sliderMax)}
            onChange={(event) =>
              onHorizonChange(Math.min(Number(event.target.value), sliderMax))
            }
            className={`horizon-slider mt-2 w-full ${tone === "light" ? "horizon-slider-light" : ""}`}
            aria-label="Forecast horizon"
          />
        </label>
        {predictAction ? (
          <div className="mt-4 flex justify-center">{predictAction}</div>
        ) : null}
      </div>
    );
  }

  const horizonLabel = formatHorizonLabel(horizonDays);
  const projectedLabel = formatHorizonLabel(pathDays);

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
              {pathDays <= 0.05
                ? "Last close. Pick a horizon, then Predict to draw the path."
                : `Range ${formatPrice(low)} – ${formatPrice(high)} · ${projectedLabel}`}
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
        className={compact ? "chart-stage-static" : "chart-stage-static mt-4"}
        style={{ height }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={predictedFill} stopOpacity={0.22} />
                <stop offset="100%" stopColor={predictedFill} stopOpacity={0} />
              </linearGradient>
              {ultraPath ? (
                <linearGradient id={strokeId} x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#6ea2ff" />
                  <stop offset="48%" stopColor="#ffffff" />
                  <stop offset="100%" stopColor="#ffc48a" />
                </linearGradient>
              ) : null}
              {peachPath && !ultraPath ? (
                <linearGradient id={strokeId} x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#e8b48a" />
                  <stop offset="46%" stopColor="#ffc48a" />
                  <stop offset="100%" stopColor="#ffe0c4" />
                </linearGradient>
              ) : null}
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
                color: tooltipInk,
                background: tooltipBg,
                border: tooltipBorder,
                borderRadius: 12,
                boxShadow: "0 14px 34px -20px rgba(30,70,160,.3)",
              }}
              labelStyle={{ color: tooltipInk }}
              itemStyle={{ color: tooltipInk }}
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
              type="linear"
              dataKey="bandBase"
              stackId="band"
              stroke="none"
              fill="transparent"
              connectNulls
              isAnimationActive={false}
              legendType="none"
              tooltipType="none"
            />
            <Area
              type="linear"
              dataKey="bandSize"
              stackId="band"
              stroke="none"
              fill={palette.band}
              connectNulls
              isAnimationActive={false}
              legendType="none"
              tooltipType="none"
            />
            <Area
              type="linear"
              dataKey="predicted"
              stroke="none"
              fill={`url(#${fillId})`}
              connectNulls
              isAnimationActive={false}
              legendType="none"
              tooltipType="none"
            />
            <Line
              type="linear"
              dataKey="high"
              stroke={bandStroke}
              strokeDasharray="4 5"
              strokeWidth={1.2}
              strokeOpacity={0.45}
              dot={false}
              connectNulls
              isAnimationActive={false}
            />
            <Line
              type="linear"
              dataKey="low"
              stroke={bandStroke}
              strokeDasharray="4 5"
              strokeWidth={1.2}
              strokeOpacity={0.45}
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
            {(ultraPath || peachPath) && pathDays > 0 ? (
              <Line
                type="linear"
                dataKey="predicted"
                stroke={predictedStroke}
                strokeWidth={5.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                dot={false}
                connectNulls
                isAnimationActive={false}
                className={ultraPath ? "horizon-path-ultra-halo" : "horizon-path-pro-halo"}
                legendType="none"
                tooltipType="none"
              />
            ) : null}
            <Line
              type="linear"
              dataKey="predicted"
              stroke={predictedStroke}
              strokeWidth={2.4}
              strokeLinecap="round"
              strokeLinejoin="round"
              dot={false}
              connectNulls
              isAnimationActive={false}
              className={predictedClass}
              activeDot={{ r: 4, fill: predictedDot }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <label className="mt-3 block">
        <span className={`flex items-center justify-between text-xs ${muted}`}>
          <BogenHeading id="horizon-preset" className="gap-1">
            <BogenTerms text="Now" />
          </BogenHeading>
          {showMidLabel ? (
            <span>
              <BogenTerms text={horizonLabel} />
            </span>
          ) : null}
          <span>{maxLabel}</span>
        </span>
        {compact && pathDays > 0.05 && (
          <span className={`mt-1 block text-center text-xs ${muted}`}>
            Range {formatPrice(low)} – {formatPrice(high)}
          </span>
        )}
        <input
          type="range"
          min={0}
          max={sliderMax}
          step={1}
          value={Math.min(horizonDays, sliderMax)}
          onChange={(event) =>
            onHorizonChange(Math.min(Number(event.target.value), sliderMax))
          }
          className={`horizon-slider mt-2 w-full ${tone === "light" ? "horizon-slider-light" : ""}`}
          aria-label="Forecast horizon"
        />
      </label>
      {predictAction ? <div className="mt-4 flex justify-center">{predictAction}</div> : null}
      {note && (
        <p className={`mt-2 text-xs leading-relaxed ${muted}`}>
          <BogenTerms text={note} />
        </p>
      )}
    </div>
  );
}
