"use client";

import { useEffect, useId, useState } from "react";
import { useChartDrawKey, useHtmlDark } from "@/lib/use-chart-draw";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { OHLCVBar } from "@/types";
import {
  buildChartSeries,
  formatPrice,
  type ChartPoint,
  type ChartRange,
} from "@/lib/chart-series";

export function TimeSeriesChart({
  data,
  height = 180,
  color = "#2f62ff",
  rangeLabel,
}: {
  data: ChartPoint[];
  height?: number;
  color?: string;
  rangeLabel?: string;
}) {
  const gradientId = `pulseFill-${useId().replace(/:/g, "")}`;
  const dark = useHtmlDark();
  const tick = dark ? "#d2dcf0" : "#51607a";
  const grid = dark ? "rgba(255,255,255,0.12)" : "#ece9f6";
  const axis = dark ? "rgba(255,255,255,0.16)" : "#e4e0f0";
  const drawKey = useChartDrawKey(
    `${data[0]?.label}-${data[data.length - 1]?.label}-${data.length}`,
  );

  if (data.length < 2) {
    return (
      <div
        className="grid place-items-center text-sm text-ink-soft"
        style={{ height }}
      >
        Not enough price history for this range.
      </div>
    );
  }

  return (
    <div className="chart-stage" style={{ height }} key={drawKey}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.28} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={grid} vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: tick, fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: axis }}
            interval="preserveStartEnd"
            minTickGap={18}
          />
          <YAxis
            domain={["auto", "auto"]}
            width={58}
            tick={{ fill: tick, fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value: number) => formatPrice(value)}
          />
          <Tooltip
            formatter={(value) => [formatPrice(Number(value)), "Price"]}
            labelFormatter={(label) => (rangeLabel ? `${rangeLabel} · ${label}` : String(label))}
            contentStyle={{
              color: dark ? "#f4f7ff" : "#12203c",
              background: dark ? "#2a3a58" : "#ffffff",
              border: dark
                ? "1px solid rgba(158,196,255,.28)"
                : "1px solid rgba(37,99,235,.18)",
              borderRadius: 12,
              boxShadow: "0 14px 34px -20px rgba(30,70,160,.3)",
            }}
            labelStyle={{ color: dark ? "#f4f7ff" : "#12203c" }}
            itemStyle={{ color: dark ? "#f4f7ff" : "#12203c" }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2.4}
            fill={`url(#${gradientId})`}
            dot={false}
            activeDot={{ r: 4, fill: color }}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function YahooPriceChart({
  symbol,
  ohlcv,
  yearCloses,
  range,
  sessionDate,
  height = 180,
  color,
}: {
  symbol: string;
  ohlcv: OHLCVBar[];
  yearCloses?: OHLCVBar[];
  range: ChartRange;
  sessionDate?: string;
  height?: number;
  color?: string;
}) {
  const [points, setPoints] = useState<ChartPoint[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setPoints(null);
    const params = new URLSearchParams({ symbol, range });
    if (sessionDate) params.set("date", sessionDate);

    fetch(`/api/yahoo/chart?${params}`)
      .then((response) => response.json())
      .then((payload: { points?: ChartPoint[] }) => {
        if (!cancelled && payload.points?.length) {
          setPoints(payload.points);
        }
      })
      .catch(() => {
        if (!cancelled) setPoints(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [symbol, range, sessionDate]);

  if (loading) {
    return <div className="chart-skeleton" style={{ height }} aria-hidden />;
  }

  const fallback =
    range === "day" ? [] : buildChartSeries(ohlcv, range, symbol, yearCloses);
  const data = points && points.length >= 2 ? points : fallback;

  return (
    <TimeSeriesChart
      data={data}
      height={height}
      color={color}
      rangeLabel={`${symbol}`}
    />
  );
}
