"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ArchiveBanner,
  ArchiveModePulse,
  withArchiveQuery,
} from "@/components/ArchiveBar";
import { useAuth } from "@/components/AuthProvider";
import { TVMBrand, TVMIcon } from "@/components/TVMBrand";
import { ArchiveCalendarLock, PortfolioLock, TestingSuiteLock } from "@/components/TestingSuiteLock";
import { MaintenanceNavCard } from "@/components/MaintenanceGate";
import { useTour } from "@/components/TourProvider";
import { useUpgrade } from "@/components/UpgradeProvider";
import { canUsePreviewFeature } from "@/lib/plans";
import { showTvm10Labs, showUltraDesk } from "@/lib/beta-labs";
import { resolveAccountName } from "@/lib/person-name";
import { BogenHit } from "@/components/BogenProvider";
import { ProGlowPhrase, ProGlowText } from "@/components/ProGlowText";
import { NewBadge } from "@/components/NewBadge";
import { LOCAL_EXPERIMENT, useExperience } from "@/components/ExperienceProvider";
import { useSiteEra } from "@/components/SiteEraProvider";
import { UltraShinePhrase } from "@/components/UltraText";
import { planHasPro, type PlanId } from "@/lib/plans";

export const dashboardNav = [
  { label: "Dashboard", href: "/dashboard", icon: "dashboard" as const, bogen: "nav-dashboard" as const },
  { label: "Workstation", href: "/dashboard/workstation", icon: "screener" as const, bogen: "nav-screener" as const, ultra: true },
  { label: "Daily Brief", href: "/dashboard/brief", icon: "brief" as const, bogen: "nav-brief" as const },
  { label: "Screener", href: "/dashboard/screener", icon: "screener" as const, bogen: "nav-screener" as const },
  { label: "Reports", href: "/dashboard/reports", icon: "reports" as const, bogen: "nav-reports" as const },
  { label: "Watchlist", href: "/dashboard/watchlist", icon: "watchlist" as const, bogen: "nav-watchlist" as const },
  { label: "Portfolio", href: "/dashboard/portfolio", icon: "dashboard" as const, bogen: "nav-portfolio" as const },
];

function navIsActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function accountLabel(
  profile: { displayName?: string } | null,
  user: { displayName?: string | null; email?: string | null } | null,
) {
  return resolveAccountName({
    profileName: profile?.displayName,
    authName: user?.displayName,
    email: user?.email,
  });
}

function navWindowClass(active: boolean, inactive = "text-ink-soft hover:bg-ink/[0.04] hover:text-ink") {
  return active ? "nav-window-active text-ink" : inactive;
}

function navItemClass(
  active: boolean,
  outline: boolean,
  inactive = "text-ink-soft hover:bg-ink/[0.04] hover:text-ink",
) {
  if (outline) return navWindowClass(active, inactive);
  return active ? "glass-violet text-white" : inactive;
}

function ProfileNavLink({
  compact = false,
  name,
  active,
  href,
  onNavigate,
  pro = false,
  ultra = false,
  glow = false,
  outline = true,
}: {
  compact?: boolean;
  name: string;
  active: boolean;
  href: string;
  onNavigate?: () => void;
  pro?: boolean;
  ultra?: boolean;
  glow?: boolean;
  outline?: boolean;
}) {
  const chrome = ultra
    ? "ultra-profile-glow bg-transparent"
    : pro && glow
      ? "pro-profile-glow bg-transparent"
      : navItemClass(active, outline);
  return (
    <BogenHit
      id="nav-account"
      compact={compact}
      className={`rounded-2xl text-left ${
        compact ? "h-14 justify-center px-2" : "min-h-[72px] gap-3.5 px-3.5 py-3.5"
      } ${chrome}`}
    >
      <Link
        href={href}
        onClick={onNavigate}
        title={compact ? name : undefined}
        className="absolute inset-0 z-0 rounded-2xl"
        aria-label={ultra ? `${name}, Ultra account` : pro ? `${name}, Pro account` : name}
      />
      <span
        className={`pointer-events-none relative z-[1] grid shrink-0 place-items-center rounded-full bg-ink/[0.08] ${
          compact ? "h-11 w-11" : "h-12 w-12"
        }`}
      >
        <TVMIcon name="profile" size={compact ? 22 : 26} />
        {compact ? (
          <span className="absolute -right-2 -top-2">
            <NewBadge feature="settings" />
          </span>
        ) : null}
      </span>
      {!compact && (
        <span className="pointer-events-none relative z-[1] min-w-0 overflow-visible bg-transparent">
          <span
            className={
              pro || ultra
                ? "font-display text-lg font-bold leading-tight"
                : "block truncate text-[15px] font-medium leading-tight"
            }
          >
            {ultra ? (
              <UltraShinePhrase>{name}</UltraShinePhrase>
            ) : pro ? (
              <ProGlowPhrase>{name}</ProGlowPhrase>
            ) : (
              name
            )}
          </span>
          {ultra ? (
            <span className="mt-1 flex items-center gap-2 font-display text-sm font-bold leading-tight">
              <UltraShinePhrase>Ultra account</UltraShinePhrase>
              <NewBadge feature="settings" />
            </span>
          ) : pro ? (
            <span className="mt-1 flex items-center gap-2 font-display text-sm font-bold leading-tight">
              <ProGlowPhrase>Pro account</ProGlowPhrase>
              <NewBadge feature="settings" />
            </span>
          ) : (
            <span className="mt-1 block">
              <NewBadge feature="settings" />
            </span>
          )}
        </span>
      )}
    </BogenHit>
  );
}

function widgetBox(compact: boolean) {
  return compact
    ? "h-[52px] justify-center px-2"
    : "min-h-[52px] gap-3 px-3 py-2.5 text-left";
}

function UpgradeNavCard({
  compact = false,
  plan,
  onUpgrade,
  vintage = false,
}: {
  compact?: boolean;
  plan: PlanId;
  onUpgrade: () => void;
  vintage?: boolean;
}) {
  const ultraChip = plan === "ultra";
  const proChip = plan === "pro";
  const locked = ultraChip || proChip || vintage;
  const body = ultraChip ? (
    compact ? (
      <span className="pointer-events-none relative z-[1] text-[11px] font-bold uppercase">
        <UltraShinePhrase>Ultra</UltraShinePhrase>
      </span>
    ) : (
      <span className="pointer-events-none relative z-[1] min-w-0">
        <span className="block font-display text-sm font-bold leading-tight">
          <UltraShinePhrase>Ultra account</UltraShinePhrase>
        </span>
        <span className="block text-[11px] font-medium leading-tight text-white/55">
          Unlocked
        </span>
      </span>
    )
  ) : proChip ? (
    compact ? (
      <span className="pointer-events-none relative z-[1] text-[11px] font-bold uppercase">
        <ProGlowText>Pro</ProGlowText>
      </span>
    ) : (
      <span className="pointer-events-none relative z-[1] min-w-0">
        <span className="block font-display text-sm font-bold leading-tight">
          <ProGlowPhrase>Pro account</ProGlowPhrase>
        </span>
        <span className="block text-[11px] font-medium leading-tight text-ink-soft">
          Unlocked
        </span>
      </span>
    )
  ) : compact ? (
      <span className="pointer-events-none relative z-[1] text-[11px] font-bold uppercase">
        <ProGlowPhrase>Pro</ProGlowPhrase>
      </span>
  ) : (
    <span className="pointer-events-none relative z-[1] flex min-w-0 flex-col items-start overflow-visible">
      <span className="font-display text-sm font-bold leading-tight">
        <ProGlowPhrase>Upgrade to Pro</ProGlowPhrase>
      </span>
      <span className="mt-0.5 font-display text-[11px] font-bold leading-tight">
        <ProGlowPhrase>Unlock more</ProGlowPhrase>
      </span>
    </span>
  );

  return (
    <BogenHit
      id="nav-upgrade"
      compact={compact}
      className={`rounded-2xl ${widgetBox(compact)} ${
        ultraChip ? "ultra-profile-glow" : "pro-profile-glow"
      } bg-transparent`}
    >
      {locked ? (
        <span className="absolute inset-0 z-0 rounded-2xl" title={ultraChip ? "Ultra account" : "Pro account"} />
      ) : (
        <button
          type="button"
          onClick={onUpgrade}
          title="Upgrade to Pro"
          className="absolute inset-0 z-0 rounded-2xl"
          aria-label="Upgrade to Pro"
        />
      )}
      {body}
    </BogenHit>
  );
}

function PreviewSidebar({
  compact = false,
  onNavigate,
}: {
  compact?: boolean;
  onNavigate?: () => void;
}) {
  const { entitlement } = useAuth();
  const { era } = useSiteEra();
  const { density } = useExperience();
  const clean = density === "clean";
  const outline = era.features.navOutlineGlow;
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const archive = searchParams.get("archive");
  const showArchive = canUsePreviewFeature(entitlement.role, "archiveCalendar");
  const showHorizon =
    era.id === "live" && canUsePreviewFeature(entitlement.role, "horizonSuite");
  const hideLocks = clean;
  const archiveRoute = navIsActive(pathname, "/dashboard/archive");
  const horizonActive = navIsActive(pathname, "/dashboard/horizon");
  const archiveLive = Boolean(archive);

  return (
    <div className="mt-4 flex flex-col gap-2">
      {showArchive ? (
        <BogenHit
          id="nav-archive"
          compact={compact}
          className={`rounded-2xl py-3 text-left text-[15px] font-medium ${
            compact ? "justify-center px-2" : "gap-3.5 px-4"
          } ${
            archiveLive
              ? "archive-widget-live bg-sky-50 text-ink"
              : navItemClass(archiveRoute, outline)
          }`}
        >
          <Link
            href={withArchiveQuery("/dashboard/archive", archive)}
            onClick={onNavigate}
            title={compact ? "Archive Calendar" : undefined}
            className="absolute inset-0 z-0 rounded-2xl"
            aria-label="Archive Calendar"
          />
          <span className="pointer-events-none relative z-[1]">
            <TVMIcon name="calendar" />
          </span>
          {!compact && (
            <span className="pointer-events-none relative z-[1] min-w-0">
              <span className="block leading-tight">Archive Calendar</span>
              {archiveLive && (
                <span className="archive-active-label mt-0.5 block">ACTIVE</span>
              )}
            </span>
          )}
        </BogenHit>
      ) : hideLocks ? null : (
        <BogenHit
          id="nav-archive"
          compact={compact}
          className={`w-full ${compact ? "justify-center" : ""}`}
        >
          <div className="min-w-0 w-full flex-1">
            <ArchiveCalendarLock compact={compact} />
          </div>
        </BogenHit>
      )}
      {showHorizon ? (
        <BogenHit
          id="nav-horizon"
          compact={compact}
          className={`rounded-2xl py-3 text-left text-[15px] font-medium ${
            compact ? "justify-center px-2" : "gap-3.5 px-4"
          } ${navItemClass(horizonActive, outline)}`}
        >
          <Link
            href={withArchiveQuery("/dashboard/horizon", archive)}
            onClick={onNavigate}
            title={compact ? "Horizon Suite" : undefined}
            className="absolute inset-0 z-0 rounded-2xl"
            aria-label="Horizon Suite"
          />
          <span className="pointer-events-none relative z-[1]">
            <TVMIcon name="horizon" />
          </span>
          {!compact && (
            <span className="pointer-events-none relative z-[1]">Horizon Suite</span>
          )}
        </BogenHit>
      ) : era.id !== "live" || hideLocks ? null : (
        <BogenHit
          id="nav-horizon"
          compact={compact}
          className={`w-full ${compact ? "justify-center" : ""}`}
        >
          <div className="min-w-0 w-full flex-1">
            <TestingSuiteLock compact={compact} />
          </div>
        </BogenHit>
      )}
    </div>
  );
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { user, profile, entitlement, loading, error, tourPending } = useAuth();
  const { era, rewind } = useSiteEra();
  const { density } = useExperience();
  const clean = density === "clean" && !rewind;
  const outline = era.features.navOutlineGlow;
  const { openUpgrade } = useUpgrade();
  const { isOpen: tourOpen, openTour } = useTour();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const archive = searchParams.get("archive");
  const stackPaid = planHasPro(entitlement.plan) && era.features.proProfileStack;
  const showPlanChip = entitlement.plan === "free" || !stackPaid;
  const onUltra = entitlement.plan === "ultra";
  const onPro = entitlement.plan === "pro";
  const [sidebarMode, setSidebarMode] = useState<
    "expanded" | "collapsed" | "hidden"
  >("expanded");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (loading || !user || !tourPending || tourOpen || archive) return;
    const timer = window.setTimeout(() => openTour({ required: true }), 400);
    return () => window.clearTimeout(timer);
  }, [archive, loading, openTour, tourOpen, tourPending, user]);

  function cycleSidebar() {
    setSidebarMode((current) =>
      current === "expanded"
        ? "collapsed"
        : current === "collapsed"
          ? "hidden"
          : "expanded",
    );
  }

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-surface">
        <div className="glass-strong rounded-[24px] px-8 py-6 text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-violet/20 border-t-violet" />
          <p className="mt-3 text-sm text-ink-soft">Loading your TVM account…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="grid min-h-screen place-items-center bg-surface px-5">
        <div className="glass-strong max-w-md rounded-[28px] p-8 text-center">
          <TVMBrand />
          <h1 className="mt-6 font-display text-3xl font-bold text-ink">
            Sign in to open the dashboard
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-ink-soft">
            Watchlists, portfolio positions, plan limits, and settings are saved
            to your Firebase account.
          </p>
          <Link
            href="/login"
            className="glass-violet mt-6 inline-flex rounded-full px-6 py-3 text-sm font-semibold text-white"
          >
            Log in
          </Link>
          {error && (
            <p className="mt-4 rounded-xl bg-coral/10 px-3 py-2 text-sm text-coral">
              {error}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-surface">
      {sidebarMode === "hidden" && (
        <button
          type="button"
          onClick={cycleSidebar}
          className="glass fixed left-4 top-[calc(1rem+var(--site-notice,0px))] z-30 hidden h-11 w-11 place-items-center rounded-full lg:grid"
          aria-label="Open dashboard menu"
          title="Open dashboard menu"
        >
          <TVMBrand showWordmark={false} size={22} />
        </button>
      )}

      <aside
        className={`sticky top-[var(--site-notice,0px)] hidden h-[calc(100vh-var(--site-notice,0px))] shrink-0 flex-col bg-chrome transition-all duration-500 lg:flex ${
          sidebarMode === "expanded"
            ? "w-[260px] overflow-y-auto border-r border-ink/[0.06] px-6 py-7"
            : sidebarMode === "collapsed"
              ? "w-[84px] overflow-visible border-r border-ink/[0.06] px-3 py-7"
              : "w-0 overflow-hidden border-0 px-0 py-7 opacity-0"
        }`}
      >
        <BogenHit
          id="nav-logo"
          compact={sidebarMode !== "expanded"}
          fullWidth={false}
          className={`rounded-2xl p-1.5 ${
            sidebarMode === "expanded" ? "gap-2.5 self-start" : "mx-auto"
          }`}
        >
          <button
            type="button"
            onClick={cycleSidebar}
            title={
              sidebarMode === "expanded"
                ? "Shrink menu to the logo"
                : "Hide the menu"
            }
            aria-label={
              sidebarMode === "expanded"
                ? "Shrink menu to the logo"
                : "Hide the menu"
            }
            className="absolute inset-0 z-0 rounded-2xl hover:bg-violet/10"
          />
          <span className="pointer-events-none relative z-[1]">
            <TVMBrand showWordmark={sidebarMode === "expanded"} />
          </span>
        </BogenHit>
        {sidebarMode === "expanded" && !rewind && showTvm10Labs() ? (
          <p className="mt-2 px-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-soft">
            {LOCAL_EXPERIMENT}
          </p>
        ) : null}

        <nav className="mt-10 flex flex-col gap-1.5" aria-label="Dashboard navigation">
          {(clean
            ? dashboardNav.filter((item) => item.label !== "Screener")
            : dashboardNav
          )
            .filter(
              (item) =>
                item.label !== "Workstation" || showUltraDesk(entitlement.plan),
            )
            .map((item) => {
            const active = navIsActive(pathname, item.href);
            const compact = sidebarMode !== "expanded";
            const portfolioLocked =
              item.label === "Portfolio" && !showTvm10Labs();
            if (portfolioLocked) {
              return (
                <BogenHit
                  key={item.href}
                  id={item.bogen}
                  compact={compact}
                  className={`rounded-2xl py-3 text-left text-[15px] font-medium ${
                    compact ? "justify-center px-2" : "gap-3.5 px-4"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <PortfolioLock compact={compact} />
                  </div>
                </BogenHit>
              );
            }
            return (
              <BogenHit
                key={item.href}
                id={item.bogen}
                compact={compact}
                className={`rounded-2xl py-3 text-left text-[15px] font-medium ${
                  compact ? "justify-center px-2" : "gap-3.5 px-4"
                } ${navItemClass(active, outline)}`}
              >
                <Link
                  href={withArchiveQuery(item.href, archive)}
                  title={compact ? item.label : undefined}
                  className="absolute inset-0 z-0 rounded-2xl"
                  aria-label={item.label}
                />
                <span className="pointer-events-none relative z-[1]">
                  <TVMIcon name={item.icon} />
                  {compact && item.label === "Portfolio" ? (
                    <span className="absolute -right-2 -top-1">
                      <NewBadge feature="portfolio" />
                    </span>
                  ) : null}
                </span>
                {!compact && (
                  <span className="pointer-events-none relative z-[1] flex items-center gap-2">
                    {item.label}
                    {item.label === "Portfolio" ? <NewBadge feature="portfolio" /> : null}
                  </span>
                )}
              </BogenHit>
            );
          })}
        </nav>

        <PreviewSidebar compact={sidebarMode !== "expanded"} />

        <div className="mt-auto space-y-2 pt-4">
          {era.features.maintenanceNav ? (
            <MaintenanceNavCard compact={sidebarMode !== "expanded"} />
          ) : null}
          {showPlanChip ? (
            <UpgradeNavCard
              compact={sidebarMode !== "expanded"}
              plan={entitlement.plan}
              onUpgrade={openUpgrade}
              vintage={onPro || onUltra}
            />
          ) : null}
          <ProfileNavLink
            compact={sidebarMode !== "expanded"}
            name={accountLabel(profile, user)}
            active={navIsActive(pathname, "/dashboard/settings")}
            href={withArchiveQuery("/dashboard/settings", archive)}
            pro={stackPaid && onPro}
            ultra={onUltra}
            glow={era.features.proProfileGlow}
            outline={outline}
          />
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <div className="sticky top-[var(--site-notice,0px)] z-20 flex items-center justify-between border-b border-ink/[0.06] bg-white/90 px-5 py-3 backdrop-blur lg:hidden">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="rounded-2xl p-1.5 hover:bg-violet/10"
            aria-label="Open dashboard menu"
          >
            <TVMBrand />
          </button>
          {onUltra ? (
            <span className="ultra-profile-glow rounded-full px-4 py-2 text-sm font-semibold">
              <UltraShinePhrase>Ultra</UltraShinePhrase>
            </span>
          ) : onPro ? (
            <span className="pro-profile-glow rounded-full bg-transparent px-4 py-2 text-sm font-semibold">
              <ProGlowText>Pro</ProGlowText>
            </span>
          ) : (
            <button
              type="button"
              onClick={openUpgrade}
              className="pro-profile-glow rounded-full bg-transparent px-4 py-2 text-sm font-semibold"
            >
              <ProGlowPhrase>Pro</ProGlowPhrase>
            </button>
          )}
        </div>

        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="absolute inset-0 bg-ink/20 backdrop-blur-sm"
              aria-label="Close dashboard menu"
            />
            <aside className="glass-strong absolute bottom-3 left-3 top-3 z-10 flex w-[min(310px,calc(100%-1.5rem))] flex-col rounded-[28px] p-5">
              <div className="flex items-center justify-between">
                <TVMBrand />
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="grid h-9 w-9 place-items-center rounded-full text-ink-soft hover:bg-violet/10 hover:text-violet"
                  aria-label="Close dashboard menu"
                >
                  <TVMIcon name="close" size={18} />
                </button>
              </div>
              <nav className="mt-8 flex flex-col gap-1.5">
                {(clean
            ? dashboardNav.filter((item) => item.label !== "Screener")
            : dashboardNav
          )
            .filter(
              (item) =>
                item.label !== "Workstation" || showUltraDesk(entitlement.plan),
            )
            .map((item) => {
                  const active = navIsActive(pathname, item.href);
                  const portfolioLocked =
                    item.label === "Portfolio" && !showTvm10Labs();
                  if (portfolioLocked) {
                    return (
                      <BogenHit
                        key={item.href}
                        id={item.bogen}
                        className="gap-3.5 rounded-2xl px-4 py-3 text-[15px] font-medium"
                      >
                        <div className="min-w-0 flex-1">
                          <PortfolioLock />
                        </div>
                      </BogenHit>
                    );
                  }
                  return (
                    <BogenHit
                      key={item.href}
                      id={item.bogen}
                      className={`gap-3.5 rounded-2xl px-4 py-3 text-[15px] font-medium ${navItemClass(
                        active,
                        outline,
                        "text-ink-soft hover:bg-violet/[0.05] hover:text-ink",
                      )}`}
                    >
                      <Link
                        href={withArchiveQuery(item.href, archive)}
                        onClick={() => setMobileMenuOpen(false)}
                        className="absolute inset-0 z-0 rounded-2xl"
                        aria-label={item.label}
                      />
                      <span className="pointer-events-none relative z-[1]">
                        <TVMIcon name={item.icon} />
                      </span>
                      <span className="pointer-events-none relative z-[1] flex items-center gap-2">
                        {item.label}
                        {item.label === "Portfolio" ? (
                          <NewBadge feature="portfolio" />
                        ) : null}
                      </span>
                    </BogenHit>
                  );
                })}
              </nav>
              <PreviewSidebar onNavigate={() => setMobileMenuOpen(false)} />
              <div className="mt-auto space-y-2 pt-4">
                {era.features.maintenanceNav ? <MaintenanceNavCard /> : null}
                {showPlanChip ? (
                  <UpgradeNavCard
                    plan={entitlement.plan}
                    onUpgrade={() => {
                      setMobileMenuOpen(false);
                      openUpgrade();
                    }}
                    vintage={onPro || onUltra}
                  />
                ) : null}
                <ProfileNavLink
                  name={accountLabel(profile, user)}
                  active={navIsActive(pathname, "/dashboard/settings")}
                  href={withArchiveQuery("/dashboard/settings", archive)}
                  onNavigate={() => setMobileMenuOpen(false)}
                  pro={stackPaid && onPro}
                  ultra={onUltra}
                  glow={era.features.proProfileGlow}
                  outline={outline}
                />
              </div>
            </aside>
          </div>
        )}

        <main className="relative mx-auto max-w-[1400px] px-5 py-8 sm:px-9">
          <ArchiveModePulse />
          <ArchiveBanner />
          {children}
        </main>
      </div>
    </div>
  );
}
