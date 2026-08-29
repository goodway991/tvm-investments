"use client";

import { useEffect, useState } from "react";
import { authedFetch } from "@/lib/authed-fetch";
import { StockSearchField, type SearchHit } from "@/components/StockSearchField";
import { parseTicker } from "@/lib/ticker";
import { BogenHeading, BogenTip } from "@/components/BogenProvider";
import { HorizonForecastChart } from "@/components/HorizonForecastChart";
import { NewBadge } from "@/components/NewBadge";
import { PredictButton, usePredictUsage } from "@/components/PredictButton";
import { UltraShinePhrase } from "@/components/UltraText";
import { useUpgrade } from "@/components/UpgradeProvider";
import {
  ADVANCED_PRESETS,
  DEFAULT_ADVANCED_SETTINGS,
  clampAdvancedSettings,
  type AdvancedSettings,
} from "@/lib/advanced-forecast";
import {
  MAX_HORIZON_TRADING_DAYS,
  type HorizonStats,
} from "@/lib/horizon-forecast";
import type { ChartPoint } from "@/lib/chart-series";

type AdvancedPayload = {
  history?: ChartPoint[];
  last?: number;
  dailyDrift?: number;
  dailyVol?: number;
  kappa?: number;
  thetaLog?: number;
  lastDelta?: number;
  rho?: number;
  avgBlend?: number;
  note?: string | null;
  error?: string;
};

function settingsKey(uid: string) {
  return `tvm-advanced-settings:${uid}`;
}

function Knob({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="text-sm text-ink-soft">
      {label} {value}
      <input
        type="range"
        min={0}
        max={100}
        step={1}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-1 w-full"
      />
    </label>
  );
}

export function AdvancedPredictions({
  uid,
  symbol,
  onSymbol,
  universe,
  watchlist,
}: {
  uid: string;
  symbol: string;
  onSymbol: (symbol: string) => void;
  universe: SearchHit[];
  watchlist: string[];
}) {
  const { openUpgrade } = useUpgrade();
  const { usage, busy, consume, plan } = usePredictUsage("advanced");
  const [settings, setSettings] = useState<AdvancedSettings>(DEFAULT_ADVANCED_SETTINGS);
  const [draft, setDraft] = useState(symbol);
  const [horizonDays, setHorizonDays] = useState(MAX_HORIZON_TRADING_DAYS);
  const [committedDays, setCommittedDays] = useState(0);
  const [history, setHistory] = useState<ChartPoint[]>([]);
  const [stats, setStats] = useState<HorizonStats | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [reading, setReading] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(settingsKey(uid));
      if (raw) setSettings(clampAdvancedSettings(JSON.parse(raw)));
    } catch {
      /* ignore */
    }
  }, [uid]);

  useEffect(() => {
    setDraft(symbol);
    setCommittedDays(0);
    setHistory([]);
    setStats(null);
    setNote(null);
    setError("");
  }, [symbol]);

  function persist(next: AdvancedSettings) {
    const clamped = clampAdvancedSettings(next);
    setSettings(clamped);
    setCommittedDays(0);
    try {
      window.localStorage.setItem(settingsKey(uid), JSON.stringify(clamped));
    } catch {
      /* private mode */
    }
  }

  async function onPredict() {
    if (committedDays > 0) {
      setCommittedDays(0);
      setHorizonDays(MAX_HORIZON_TRADING_DAYS);
      return;
    }
    const ticker = parseTicker(draft) || parseTicker(symbol);
    if (!ticker) {
      setError("Search a name first — same search bar as Watchlist.");
      return;
    }
    const days = horizonDays > 0 ? horizonDays : MAX_HORIZON_TRADING_DAYS;
    if (horizonDays <= 0) setHorizonDays(days);
    onSymbol(ticker);
    setDraft(ticker);
    setError("");
    setReading(true);
    try {
      const response = await authedFetch("/api/advanced-forecast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol: ticker, settings }),
      });
      const text = await response.text();
      let payload: AdvancedPayload = {};
      if (text.trim()) {
        try {
          payload = JSON.parse(text) as AdvancedPayload;
        } catch {
          throw new Error("Advanced Prediction did not return enough data.");
        }
      }
      if (!response.ok || !payload.history?.length || payload.last == null) {
        throw new Error(payload.error || "Advanced Prediction did not return enough data.");
      }
      const result = await consume();
      if (!result.ok) {
        openUpgrade("ultra");
        return;
      }
      setHistory(payload.history);
      setStats({
        last: payload.last,
        dailyDrift: payload.dailyDrift ?? 0,
        dailyVol: payload.dailyVol ?? 0.02,
        kappa: payload.kappa ?? 0,
        thetaLog: payload.thetaLog ?? payload.dailyDrift ?? 0,
        lastDelta: payload.lastDelta ?? 0,
        rho: payload.rho ?? 0,
        avgBlend: payload.avgBlend ?? settings.averagePath / 100,
      });
      setNote(payload.note ?? null);
      setCommittedDays(days);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Advanced Prediction failed.",
      );
    } finally {
      setReading(false);
    }
  }

  return (
    <section className="glass-strong rounded-[24px] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-violet">
            <UltraShinePhrase>Advanced Predictions</UltraShinePhrase>
          </p>
          <h2 className="mt-1 flex flex-wrap items-center gap-2 font-display text-lg font-semibold text-ink">
            <BogenHeading id="advanced-predict">Tune the 99%* read</BogenHeading>
            <NewBadge feature="workstation" />
            <BogenTip id="advanced-predict" />
          </h2>
          <p className="mt-1 max-w-xl text-sm text-ink-soft">
            Ultra only. Pick a name, set the knobs, then Predict. Same 99%*
            target as Pulse — with more control.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["quiet", "Quiet"],
              ["balanced", "Balanced"],
              ["push", "Push"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => persist(ADVANCED_PRESETS[id])}
              className="rounded-full border border-ink/10 px-3 py-1 text-xs font-semibold text-ink"
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,280px)_1fr]">
        <div>
          <p className="text-sm text-ink-soft">Ticker</p>
          <div className="mt-1">
            <StockSearchField
              universe={universe}
              watchlist={watchlist}
              showSearchButton
              placeholder="Search stocks…"
              onPick={(hit) => {
                onSymbol(hit.symbol);
                setDraft(hit.symbol);
                setError("");
              }}
            />
          </div>
          {symbol ? (
            <p className="mt-2 text-sm font-semibold text-ink">
              {symbol}
              <span className="ml-2 font-normal text-ink-soft">selected</span>
            </p>
          ) : (
            <p className="mt-2 text-xs text-ink-soft">
              Search, then Advanced Predict.
            </p>
          )}
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Knob
            label="Noise flatten"
            value={settings.noiseFlatten}
            onChange={(noiseFlatten) => persist({ ...settings, noiseFlatten })}
          />
          <Knob
            label="Follow-through"
            value={settings.followThrough}
            onChange={(followThrough) => persist({ ...settings, followThrough })}
          />
          <Knob
            label="Acceleration"
            value={settings.acceleration}
            onChange={(acceleration) => persist({ ...settings, acceleration })}
          />
          <Knob
            label="Tape pressure"
            value={settings.tapePressure}
            onChange={(tapePressure) => persist({ ...settings, tapePressure })}
          />
          <Knob
            label="Still zone"
            value={settings.stillZone}
            onChange={(stillZone) => persist({ ...settings, stillZone })}
          />
          <Knob
            label="Average path"
            value={settings.averagePath}
            onChange={(averagePath) => persist({ ...settings, averagePath })}
          />
        </div>
      </div>
      <label className="mt-3 block text-sm text-ink-soft">
        Lookback {settings.lookback} sessions
        <input
          type="range"
          min={40}
          max={90}
          step={1}
          value={settings.lookback}
          onChange={(event) =>
            persist({ ...settings, lookback: Number(event.target.value) })
          }
          className="mt-1 w-full"
        />
      </label>

      <div className="mt-5">
        {error ? <p className="mb-3 text-sm text-coral">{error}</p> : null}
        <HorizonForecastChart
          history={history}
          horizonDays={horizonDays}
          committedDays={committedDays}
          onHorizonChange={(days) => {
            if (days <= 0) {
              setCommittedDays(0);
              setHorizonDays(0);
              return;
            }
            if (committedDays > 0) {
              setHorizonDays(Math.min(days, committedDays));
              return;
            }
            setHorizonDays(days);
          }}
          forecastPlan="ultra"
          statsOverride={stats}
          note={note}
          height={260}
          predictAction={
            <PredictButton
              plan={plan}
              kind="advanced"
              used={usage.advanced}
              busy={busy || reading}
              predicted={committedDays > 0}
              predictLabel="Advanced Predict"
              hideLabel="Hide"
              onPredict={() => void onPredict()}
              onUpgrade={openUpgrade}
            />
          }
        />
      </div>
    </section>
  );
}
