"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { StockCandidate } from "@/types";
import { useAuth } from "@/components/AuthProvider";
import { TVMIcon } from "@/components/TVMBrand";
import { TvmSwitch } from "@/components/TvmSwitch";
import { useTheme } from "@/components/ThemeProvider";
import { useExperience } from "@/components/ExperienceProvider";
import { useTour } from "@/components/TourProvider";
import { useUpgrade } from "@/components/UpgradeProvider";
import { CURRENT_RELEASE_ID, RELEASES } from "@/lib/release-notes";
import { showBeta3Labs } from "@/lib/beta-labs";
import { RELEASE_ISO, releaseVisibleOn } from "@/lib/site-era";
import { resolveAccountName } from "@/lib/person-name";
import { BogenHeading, useBogen } from "@/components/BogenProvider";
import { useSiteEra } from "@/components/SiteEraProvider";
import { NewBadge } from "@/components/NewBadge";
import { ProGlowPhrase, ProGlowText } from "@/components/ProGlowText";
import { UltraShinePhrase } from "@/components/UltraText";
import { ReleaseFeatureList } from "@/components/ReleaseFeatureList";

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
            <BogenHeading id="portfolio">Portfolio</BogenHeading>
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
        <div className="rounded-2xl bg-surface p-4">
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

        <div className="rounded-2xl bg-surface p-4">
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

function VersionCard({
  release,
  current,
}: {
  release: (typeof RELEASES)[number];
  current: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="glass overflow-hidden rounded-2xl">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left"
      >
        <span>
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-display text-sm font-bold text-ink">
              {release.version}
            </span>
            {current ? (
              <span className="rounded-full bg-violet/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-violet">
                Current
              </span>
            ) : null}
          </span>
          <span className="mt-0.5 block text-xs text-ink-soft">
            {release.title} · {release.date}
          </span>
        </span>
        <span className="text-xs font-semibold text-violet">
          {open ? "Close" : "Open"}
        </span>
      </button>
      {open ? (
        <div className="border-t border-ink/[0.06] px-4 py-3">
          <p className="text-sm text-ink">
            <ProGlowText>{release.summary}</ProGlowText>
          </p>
          {release.features?.length ? (
            <div className="mt-3">
              <ReleaseFeatureList features={release.features} />
            </div>
          ) : null}
          {release.items?.length ? (
            <ul className="mt-2 space-y-1 text-sm">
              {release.items.map((item) => (
                <li key={item} className="font-display font-bold text-ink">
                  <ProGlowText>{item}</ProGlowText>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function SettingsPanel() {
  const {
    user,
    profile,
    entitlement,
    watchlist,
    positions,
    logout,
    updateDisplayName,
  } = useAuth();
  const { openUpgrade } = useUpgrade();
  const { openTour } = useTour();
  const { appearance, resolved, setAppearance } = useTheme();
  const { density, setDensity, openCustomize } = useExperience();
  const { enabled: bogenEnabled, setEnabled: setBogenEnabled } = useBogen();
  const { era, rewind, archiveDate } = useSiteEra();
  const glowName = entitlement.plan === "pro" && era.features.proProfileStack;
  const ultraName = entitlement.plan === "ultra" && era.features.proProfileStack;
  const [loggingOut, setLoggingOut] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [nameBusy, setNameBusy] = useState(false);
  const [nameError, setNameError] = useState("");

  function startEditName() {
    setFirstName(profile?.firstName || "");
    setLastName(profile?.lastName || "");
    setNameError("");
    setEditingName(true);
  }

  async function saveName() {
    setNameBusy(true);
    setNameError("");
    try {
      await updateDisplayName(firstName, lastName);
      setEditingName(false);
    } catch (saveError) {
      setNameError(
        saveError instanceof Error ? saveError.message : "Unable to save your name.",
      );
    } finally {
      setNameBusy(false);
    }
  }

  async function handleLogout() {
    setLoggingOut(true);
    await logout();
    window.location.href = "/login";
  }

  return (
    <div className="glass-strong rounded-[24px] p-6">
      <p className="text-xs font-semibold uppercase tracking-widest text-violet">
        <BogenHeading id="settings">Account</BogenHeading>
      </p>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-5">
        <div className="min-w-0 flex-1">
          {editingName ? (
            <div>
              <div className="grid max-w-md grid-cols-2 gap-3">
                <label className="block min-w-0">
                  <span className="mb-1.5 block text-xs font-medium text-ink-soft">
                    First name
                  </span>
                  <input
                    type="text"
                    maxLength={40}
                    value={firstName}
                    onChange={(event) => setFirstName(event.target.value)}
                    placeholder="First"
                    className="field w-full rounded-2xl px-4 py-2.5 text-[15px] text-ink"
                  />
                </label>
                <label className="block min-w-0">
                  <span className="mb-1.5 block text-xs font-medium text-ink-soft">
                    Last name
                  </span>
                  <input
                    type="text"
                    maxLength={40}
                    value={lastName}
                    onChange={(event) => setLastName(event.target.value)}
                    placeholder="Last"
                    className="field w-full rounded-2xl px-4 py-2.5 text-[15px] text-ink"
                  />
                </label>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => void saveName()}
                  disabled={nameBusy}
                  className="glass-violet rounded-full px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {nameBusy ? "Saving…" : "Save name"}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingName(false)}
                  disabled={nameBusy}
                  className="rounded-full px-4 py-2 text-sm font-semibold text-ink-soft"
                >
                  Cancel
                </button>
              </div>
              {nameError ? (
                <p className="mt-2 text-sm text-coral" role="alert">
                  {nameError}
                </p>
              ) : null}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h2 className="font-display text-2xl font-bold text-ink">
                {ultraName ? (
                  <UltraShinePhrase>
                    {resolveAccountName({
                      profileName: profile?.displayName,
                      authName: user?.displayName,
                      email: user?.email,
                    })}
                  </UltraShinePhrase>
                ) : glowName ? (
                  <ProGlowPhrase>
                    {resolveAccountName({
                      profileName: profile?.displayName,
                      authName: user?.displayName,
                      email: user?.email,
                    })}
                  </ProGlowPhrase>
                ) : (
                  resolveAccountName({
                    profileName: profile?.displayName,
                    authName: user?.displayName,
                    email: user?.email,
                  })
                )}
              </h2>
              <button
                type="button"
                onClick={startEditName}
                className="grid h-9 w-9 place-items-center rounded-full text-violet hover:bg-violet/10"
                aria-label="Edit first and last name"
              >
                <TVMIcon name="pencil" size={16} />
              </button>
            </div>
          )}
          <p className="mt-1 text-sm text-ink-soft">{user?.email}</p>
        </div>
        {entitlement.plan === "ultra" ? (
          <span className="ultra-profile-glow rounded-full px-4 py-2 text-sm font-semibold">
            <UltraShinePhrase>Ultra</UltraShinePhrase>
          </span>
        ) : entitlement.plan === "pro" ? (
          <span className="pro-profile-glow rounded-full bg-transparent px-4 py-2 text-sm font-semibold">
            <ProGlowText>Pro</ProGlowText>
          </span>
        ) : (
          <span className="rounded-full border border-ink/10 px-4 py-2 text-sm font-semibold text-ink-soft">
            Free
          </span>
        )}
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl bg-surface p-4">
          <p className="text-xs text-ink-soft">Watched stocks</p>
          <p className="mt-1 font-display text-2xl font-bold text-ink">
            {watchlist.symbols.length}
          </p>
        </div>
        <div className="rounded-2xl bg-surface p-4">
          <p className="text-xs text-ink-soft">Portfolio positions</p>
          <p className="mt-1 font-display text-2xl font-bold text-ink">
            {positions.length}
          </p>
        </div>
        <div className="rounded-2xl bg-surface p-4">
          <p className="text-xs text-ink-soft">Watchlist limit</p>
          <p className="mt-1 font-display text-2xl font-bold text-ink">
            {entitlement.watchlistLimit}
          </p>
        </div>
      </div>

      <div className="mt-6 rounded-2xl bg-surface p-4 text-sm leading-relaxed text-ink-soft">
        <p className="font-semibold text-ink">Plan</p>
        <p className="mt-1">
          You are on{" "}
          {entitlement.plan === "ultra" ? (
            <UltraShinePhrase>Ultra</UltraShinePhrase>
          ) : (
            <span className="font-semibold capitalize text-ink">{entitlement.plan}</span>
          )}
          .
        </p>
        <button
          type="button"
          onClick={openUpgrade}
          className="glass-violet mt-3 rounded-full px-5 py-2.5 text-sm font-semibold text-white"
        >
          View plan
        </button>
      </div>

      {era.features.darkMode ? (
        <div className="mt-6 rounded-2xl bg-surface p-4 text-sm leading-relaxed text-ink-soft">
          <p className="flex items-center gap-2 font-semibold text-ink">
            Display appearance
            <NewBadge feature="appearance" />
          </p>
          <p className="mt-1">
            Switch between light and a glowy blue dark mode. The change stays on
            this browser.
          </p>
          <div className="mt-4 flex items-center gap-3">
            <span className={`text-sm font-semibold ${resolved === "light" ? "text-ink" : "text-ink-soft"}`}>
              Light
            </span>
            <TvmSwitch
                checked={resolved === "dark"}
                onCheckedChange={(dark) => setAppearance(dark ? "dark" : "light")}
                aria-label="Dark mode"
              />
            <span className={`text-sm font-semibold ${resolved === "dark" ? "text-ink" : "text-ink-soft"}`}>
              Dark
            </span>
          </div>
        </div>
      ) : null}

      {!rewind && showBeta3Labs() ? (
      <div className="mt-6 rounded-2xl bg-surface p-4 text-sm leading-relaxed text-ink-soft">
        <p className="flex items-center gap-2 font-semibold text-ink">
          Dashboard layout
          <NewBadge feature="density" />
        </p>
        <p className="mt-1">
          Clean keeps today’s pick, your book, and a short mover list. Normal is
          the full dashboard.
        </p>
        <div className="mt-4 flex items-center gap-3">
          <span className={`text-sm font-semibold ${density === "clean" ? "text-ink" : "text-ink-soft"}`}>
            Clean
          </span>
          <TvmSwitch
            checked={density === "normal"}
            onCheckedChange={(normal) => setDensity(normal ? "normal" : "clean")}
            aria-label="Normal dashboard layout"
          />
          <span className={`text-sm font-semibold ${density === "normal" ? "text-ink" : "text-ink-soft"}`}>
            Normal
          </span>
        </div>
        <button
          type="button"
          onClick={() => openCustomize()}
          className="mt-3 text-sm font-semibold text-violet"
        >
          Customize experience
        </button>
        {entitlement.role === "admin" ? (
          <button
            type="button"
            onClick={() => openCustomize()}
            className="glass-violet mt-3 block rounded-full px-5 py-2.5 text-sm font-semibold text-white"
          >
            Let’s get you started
          </button>
        ) : null}
      </div>
      ) : null}

      {era.features.bogen ? (
        <div className="mt-6 rounded-2xl bg-surface p-4 text-sm leading-relaxed text-ink-soft">
          <p className="flex items-center gap-2 font-semibold text-ink">
            Bogen mode
            <NewBadge feature="bogen" />
          </p>
          <p className="mt-1">
            Show a question mark next to each feature. Tap one to read what it
            does and how to use it.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => setBogenEnabled(true)}
              className={`rounded-full px-5 py-2.5 text-sm font-semibold ${
                bogenEnabled
                  ? "glass-violet text-white"
                  : "border border-ink/10 text-ink-soft hover:text-ink"
              }`}
            >
              On
            </button>
            <button
              type="button"
              onClick={() => setBogenEnabled(false)}
              className={`rounded-full px-5 py-2.5 text-sm font-semibold ${
                !bogenEnabled
                  ? "glass-violet text-white"
                  : "border border-ink/10 text-ink-soft hover:text-ink"
              }`}
            >
              Off
            </button>
          </div>
        </div>
      ) : null}

      <div className="mt-6 rounded-2xl bg-surface p-4 text-sm leading-relaxed text-ink-soft">
        <p className="font-semibold text-ink">Version history</p>
        <p className="mt-1">
          TVM Investments is in Beta. Open a version to read what landed.
        </p>
        <div className="mt-3 space-y-2">
          {[...RELEASES]
            .reverse()
            .filter((release) =>
              (showBeta3Labs() || release.id !== "beta-3") &&
              releaseVisibleOn(RELEASE_ISO[release.id] ?? "9999-99-99", archiveDate),
            )
            .map((release) => (
              <VersionCard
                key={release.id}
                release={release}
                current={!rewind && release.id === CURRENT_RELEASE_ID}
              />
            ))}
        </div>
      </div>

      <div className="mt-6 rounded-2xl bg-surface p-4 text-sm leading-relaxed text-ink-soft">
        <p className="font-semibold text-ink">
          <BogenHeading id="virtual-tour">Virtual Tour</BogenHeading>
        </p>
        <p className="mt-1">
          Replay the walkthrough — each feature in motion, including the logo
          menu.
        </p>
        <button
          type="button"
          onClick={() => openTour()}
          className="glass-violet mt-3 rounded-full px-5 py-2.5 text-sm font-semibold text-white"
        >
          Virtual Tour
        </button>
      </div>

      <div className="mt-6 rounded-2xl bg-surface p-4 text-sm leading-relaxed text-ink-soft">
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
