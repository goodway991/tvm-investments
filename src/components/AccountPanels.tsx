"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { StockCandidate } from "@/types";
import { useAuth } from "@/components/AuthProvider";
import { useUpgrade } from "@/components/UpgradeProvider";

export function PortfolioPanel({ stocks }: { stocks: StockCandidate[] }) {
  const {
    portfolio,
    positions,
    updatePortfolio,
    savePosition,
    removePosition,
  } = useAuth();
  const [cash, setCash] = useState(portfolio.cash);
  const [symbol, setSymbol] = useState(stocks[0]?.symbol ?? "AAPL");
  const [shares, setShares] = useState("0");
  const [averageCost, setAverageCost] = useState("0");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => setCash(portfolio.cash), [portfolio.cash]);

  const stockMap = useMemo(
    () => new Map(stocks.map((stock) => [stock.symbol, stock])),
    [stocks],
  );
  const holdingsValue = positions.reduce(
    (total, position) =>
      total + position.shares * (position.currentPrice || position.averageCost),
    0,
  );
  const computedTotal = cash + holdingsValue;

  async function saveCash() {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await updatePortfolio(cash, computedTotal);
      setMessage("Portfolio cash balance saved.");
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to save the portfolio.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function addPosition() {
    const count = Number(shares);
    const cost = Number(averageCost);
    if (!symbol || count <= 0 || cost < 0) {
      setError("Enter a symbol, positive share count, and valid average cost.");
      return;
    }
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const currentPrice = stockMap.get(symbol)?.price ?? cost;
      const existingValue = positions
        .filter((position) => position.symbol !== symbol)
        .reduce(
          (total, position) =>
            total +
            position.shares *
              (position.currentPrice || position.averageCost),
          0,
        );
      await savePosition({
        symbol,
        shares: count,
        averageCost: cost,
        currentPrice,
      });
      await updatePortfolio(cash, cash + existingValue + count * currentPrice);
      setShares("0");
      setAverageCost("0");
      setMessage(`${symbol} saved to your portfolio.`);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to save the position.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function remove(symbolToRemove: string) {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const remainingValue = positions
        .filter((position) => position.symbol !== symbolToRemove)
        .reduce(
          (total, position) =>
            total +
            position.shares *
              (position.currentPrice || position.averageCost),
          0,
        );
      await removePosition(symbolToRemove);
      await updatePortfolio(cash, cash + remainingValue);
      setMessage(`${symbolToRemove} removed.`);
    } catch (removeError) {
      setError(
        removeError instanceof Error
          ? removeError.message
          : "Unable to remove the position.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="glass-strong rounded-[24px] p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-violet">
            Account portfolio
          </p>
          <h2 className="mt-1 font-display text-2xl font-bold text-ink">
            Portfolio
          </h2>
          <p className="mt-1 text-sm text-ink-soft">
            New accounts start at zero. Add only positions you want to track.
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-ink-soft">Tracked value</p>
          <p className="font-display text-2xl font-bold text-ink">
            ${computedTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[.8fr_1.2fr]">
        <div className="rounded-2xl bg-[#f7f8fc] p-4">
          <label className="text-sm font-semibold text-ink" htmlFor="portfolio-cash">
            Cash balance
          </label>
          <div className="mt-2 flex items-center gap-2">
            <span className="font-display text-xl font-bold text-violet">$</span>
            <input
              id="portfolio-cash"
              type="number"
              min={0}
              value={cash}
              onChange={(event) => setCash(Math.max(0, Number(event.target.value) || 0))}
              className="field min-w-0 flex-1 rounded-xl px-3 py-2 text-ink"
            />
            <button
              type="button"
              onClick={saveCash}
              disabled={saving}
              className="rounded-full bg-violet px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              Save
            </button>
          </div>
        </div>

        <div className="rounded-2xl bg-[#f7f8fc] p-4">
          <p className="text-sm font-semibold text-ink">Add or update a position</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-4">
            <select
              value={symbol}
              onChange={(event) => setSymbol(event.target.value)}
              className="field rounded-xl px-3 py-2 text-sm text-ink"
            >
              {stocks.map((stock) => (
                <option key={stock.symbol} value={stock.symbol}>
                  {stock.symbol}
                </option>
              ))}
            </select>
            <input
              type="number"
              min={0}
              step="any"
              value={shares}
              onChange={(event) => setShares(event.target.value)}
              placeholder="Shares"
              aria-label="Shares"
              className="field rounded-xl px-3 py-2 text-sm text-ink"
            />
            <input
              type="number"
              min={0}
              step="any"
              value={averageCost}
              onChange={(event) => setAverageCost(event.target.value)}
              placeholder="Average cost"
              aria-label="Average cost"
              className="field rounded-xl px-3 py-2 text-sm text-ink"
            />
            <button
              type="button"
              onClick={addPosition}
              disabled={saving}
              className="glass-violet rounded-full px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              Save position
            </button>
          </div>
        </div>
      </div>

      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[620px] text-sm">
          <thead>
            <tr className="border-b border-ink/10 text-left text-xs text-ink-soft">
              <th className="pb-3">Symbol</th>
              <th className="pb-3 text-right">Shares</th>
              <th className="pb-3 text-right">Average cost</th>
              <th className="pb-3 text-right">Current price</th>
              <th className="pb-3 text-right">Value</th>
              <th className="pb-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {positions.map((position) => (
              <tr key={position.symbol} className="border-b border-ink/[0.06]">
                <td className="py-3 font-display font-bold text-ink">
                  {position.symbol}
                </td>
                <td className="py-3 text-right text-ink-soft">{position.shares}</td>
                <td className="py-3 text-right text-ink-soft">
                  ${position.averageCost.toFixed(2)}
                </td>
                <td className="py-3 text-right text-ink-soft">
                  ${position.currentPrice.toFixed(2)}
                </td>
                <td className="py-3 text-right font-semibold text-ink">
                  ${(position.shares * position.currentPrice).toFixed(2)}
                </td>
                <td className="py-3 text-right">
                  <button
                    type="button"
                    onClick={() => remove(position.symbol)}
                    disabled={saving}
                    className="text-xs font-semibold text-coral disabled:opacity-50"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!positions.length && (
          <p className="py-8 text-center text-sm text-ink-soft">
            No positions saved yet.
          </p>
        )}
      </div>

      {error && (
        <p className="mt-4 rounded-xl bg-coral/10 px-3 py-2 text-sm text-coral" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="mt-4 rounded-xl bg-emerald-400/10 px-3 py-2 text-sm text-emerald-600" role="status">
          {message}
        </p>
      )}
    </div>
  );
}

export function SettingsPanel() {
  const { user, profile, entitlement, watchlist, positions, logout } = useAuth();
  const { openUpgrade } = useUpgrade();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    await logout();
    window.location.href = "/login";
  }

  return (
    <div className="glass-strong rounded-[24px] p-6">
      <p className="text-xs font-semibold uppercase tracking-widest text-violet">
        Account
      </p>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-5">
        <div>
          <h2 className="font-display text-2xl font-bold text-ink">
            {profile?.displayName || "TVM user"}
          </h2>
          <p className="mt-1 text-sm text-ink-soft">{user?.email}</p>
        </div>
        <span className="glass-violet rounded-full px-4 py-2 text-sm font-semibold uppercase text-white">
          {entitlement.plan} · {entitlement.role}
        </span>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl bg-[#f7f8fc] p-4">
          <p className="text-xs text-ink-soft">Watched stocks</p>
          <p className="mt-1 font-display text-2xl font-bold text-ink">
            {watchlist.symbols.length}
          </p>
        </div>
        <div className="rounded-2xl bg-[#f7f8fc] p-4">
          <p className="text-xs text-ink-soft">Portfolio positions</p>
          <p className="mt-1 font-display text-2xl font-bold text-ink">
            {positions.length}
          </p>
        </div>
        <div className="rounded-2xl bg-[#f7f8fc] p-4">
          <p className="text-xs text-ink-soft">Watchlist limit</p>
          <p className="mt-1 font-display text-2xl font-bold text-ink">
            {entitlement.watchlistLimit}
          </p>
        </div>
      </div>

      <div className="mt-6 rounded-2xl bg-[#f7f8fc] p-4 text-sm leading-relaxed text-ink-soft">
        <p className="font-semibold text-ink">Plan</p>
        <p className="mt-1">
          You are on <span className="font-semibold text-ink">{entitlement.plan}</span>.
          Pro is $8/month or $60/year.
        </p>
        {entitlement.plan !== "pro" ? (
          <button
            type="button"
            onClick={openUpgrade}
            className="glass-violet mt-3 rounded-full px-5 py-2.5 text-sm font-semibold text-white"
          >
            Upgrade to Pro
          </button>
        ) : null}
      </div>

      <div className="mt-6 rounded-2xl bg-[#f7f8fc] p-4 text-sm leading-relaxed text-ink-soft">
        <p className="font-semibold text-ink">Legal &amp; privacy</p>
        <p className="mt-1">
          Your account, watchlist, and portfolio are private to you. Passwords are
          hashed by Firebase Auth and never stored in Firestore. Data is encrypted in
          transit (TLS) and at rest by Google Cloud.
        </p>
        <nav className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm font-medium text-violet">
          <Link href="/terms">Terms of Service</Link>
          <Link href="/privacy">Privacy Policy</Link>
          <Link href="/disclaimer">Risk Disclaimer</Link>
        </nav>
      </div>

      <button
        type="button"
        onClick={handleLogout}
        disabled={loggingOut}
        className="mt-6 rounded-full border border-coral/30 px-5 py-2.5 text-sm font-semibold text-coral transition-colors hover:bg-coral/10 disabled:opacity-50"
      >
        {loggingOut ? "Logging out…" : "Log out"}
      </button>
    </div>
  );
}
