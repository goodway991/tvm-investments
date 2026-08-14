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
import { ArchiveCalendarLock, TestingSuiteLock } from "@/components/TestingSuiteLock";
import { MaintenanceNavCard } from "@/components/MaintenanceGate";
import { useTour } from "@/components/TourProvider";
import { useUpgrade } from "@/components/UpgradeProvider";
import { canUsePreviewFeature } from "@/lib/plans";

export const dashboardNav = [
  { label: "Dashboard", href: "/dashboard", icon: "dashboard" as const },
  { label: "Daily Brief", href: "/dashboard/brief", icon: "brief" as const },
  { label: "Screener", href: "/dashboard/screener", icon: "screener" as const },
  { label: "Reports", href: "/dashboard/reports", icon: "reports" as const },
  { label: "Watchlist", href: "/dashboard/watchlist", icon: "watchlist" as const },
  { label: "Portfolio", href: "/dashboard/portfolio", icon: "dashboard" as const },
];

function navIsActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function accountLabel(
  profile: { displayName?: string } | null,
  email?: string | null,
) {
  const name = profile?.displayName?.trim();
  if (name) return name;
  const fromEmail = email?.split("@")[0]?.trim();
  return fromEmail || "Account";
}

function ProfileNavLink({
  compact = false,
  name,
  active,
  href,
  onNavigate,
}: {
  compact?: boolean;
  name: string;
  active: boolean;
  href: string;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      title={compact ? name : undefined}
      className={`flex items-center rounded-2xl py-3 text-left text-[15px] font-medium duration-300 ${
        compact ? "justify-center px-2" : "gap-3.5 px-4"
      } ${
        active
          ? "glass-violet text-white"
          : "text-ink-soft hover:bg-ink/[0.04] hover:text-ink"
      }`}
    >
      <span
        className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${
          active ? "bg-white/20" : "bg-ink/[0.08]"
        }`}
      >
        <TVMIcon name="profile" size={18} />
      </span>
      {!compact && (
        <span className="min-w-0 flex-1 truncate leading-tight">{name}</span>
      )}
    </Link>
  );
}

function widgetBox(compact: boolean) {
  return compact
    ? "grid h-[52px] w-full place-items-center px-2"
    : "flex min-h-[52px] w-full items-center gap-3 px-3 py-2.5 text-left";
}

function UpgradeNavCard({
  compact = false,
  plan,
  onUpgrade,
}: {
  compact?: boolean;
  plan: "free" | "pro";
  onUpgrade: () => void;
}) {
  if (plan === "pro") {
    return (
      <div
        className={`glass-violet rounded-2xl text-white ${widgetBox(compact)}`}
        title="Pro account"
      >
        {compact ? (
          <span className="text-[11px] font-bold uppercase">Pro</span>
        ) : (
          <span className="min-w-0">
            <span className="block text-sm font-semibold leading-tight">
              Pro account
            </span>
            <span className="block text-[11px] font-medium leading-tight text-white/80">
              Unlocked
            </span>
          </span>
        )}
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={onUpgrade}
      title="Upgrade to Pro"
      className={`glass-violet rounded-2xl text-white ${widgetBox(compact)}`}
    >
      {compact ? (
        <span className="text-[11px] font-bold uppercase">Pro</span>
      ) : (
        <span className="min-w-0">
          <span className="block text-sm font-semibold leading-tight">
            Upgrade to Pro
          </span>
          <span className="block text-[11px] font-medium leading-tight text-white/80">
            Unlock more
          </span>
        </span>
      )}
    </button>
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
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const archive = searchParams.get("archive");
  const showArchive = canUsePreviewFeature(entitlement.role, "archiveCalendar");
  const showHorizon = canUsePreviewFeature(entitlement.role, "horizonSuite");
  const archiveRoute = navIsActive(pathname, "/dashboard/archive");
  const horizonActive = navIsActive(pathname, "/dashboard/horizon");
  const archiveLive = Boolean(archive);

  return (
    <div className="mt-4 flex flex-col gap-2">
      <MaintenanceNavCard compact={compact} />
      {showArchive ? (
        <Link
          href={withArchiveQuery("/dashboard/archive", archive)}
          onClick={onNavigate}
          title={compact ? "Archive Calendar" : undefined}
          className={`flex items-center rounded-2xl py-3 text-left text-[15px] font-medium duration-300 ${
            compact ? "justify-center px-2" : "gap-3.5 px-4"
          } ${
            archiveLive
              ? "archive-widget-live bg-sky-50 text-ink"
              : archiveRoute
                ? "glass-violet text-white"
                : "text-ink-soft hover:bg-ink/[0.04] hover:text-ink"
          }`}
        >
          <TVMIcon name="calendar" />
          {!compact && (
            <span className="min-w-0 flex-1">
              <span className="block leading-tight">Archive Calendar</span>
              {archiveLive && (
                <span className="archive-active-label mt-0.5 block">ACTIVE</span>
              )}
            </span>
          )}
        </Link>
      ) : (
        <ArchiveCalendarLock compact={compact} />
      )}
      {showHorizon ? (
        <Link
          href={withArchiveQuery("/dashboard/horizon", archive)}
          onClick={onNavigate}
          title={compact ? "Horizon Suite" : undefined}
          className={`flex items-center rounded-2xl py-3 text-left text-[15px] font-medium duration-300 ${
            compact ? "justify-center px-2" : "gap-3.5 px-4"
          } ${
            horizonActive
              ? "glass-violet text-white"
              : "text-ink-soft hover:bg-ink/[0.04] hover:text-ink"
          }`}
        >
          <TVMIcon name="horizon" />
          {!compact && "Horizon Suite"}
        </Link>
      ) : (
        <TestingSuiteLock compact={compact} />
      )}
    </div>
  );
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { user, profile, entitlement, loading, error, tourPending } = useAuth();
  const { openUpgrade } = useUpgrade();
  const { isOpen: tourOpen, openTour } = useTour();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const archive = searchParams.get("archive");
  const [sidebarMode, setSidebarMode] = useState<
    "expanded" | "collapsed" | "hidden"
  >("expanded");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (loading || !user || !tourPending || tourOpen) return;
    const timer = window.setTimeout(() => openTour({ required: true }), 400);
    return () => window.clearTimeout(timer);
  }, [loading, openTour, tourOpen, tourPending, user]);

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
          className="glass fixed left-4 top-[calc(1rem+var(--site-notice,0px))] z-30 hidden h-11 w-11 place-items-center rounded-full text-violet lg:grid"
          aria-label="Open dashboard menu"
        >
          <TVMIcon name="menu" />
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
        <div className="flex items-center justify-between gap-2">
          <TVMBrand showWordmark={sidebarMode === "expanded"} />
          <button
            type="button"
            onClick={cycleSidebar}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-ink-soft transition-colors hover:bg-violet/10 hover:text-violet"
            aria-label={
              sidebarMode === "expanded"
                ? "Collapse dashboard menu"
                : "Hide dashboard menu"
            }
          >
            <TVMIcon name="menu" size={18} />
          </button>
        </div>

        <nav className="mt-10 flex flex-col gap-1.5" aria-label="Dashboard navigation">
          {dashboardNav.map((item) => {
            const active = navIsActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={withArchiveQuery(item.href, archive)}
                title={sidebarMode === "collapsed" ? item.label : undefined}
                className={`flex items-center rounded-2xl py-3 text-left text-[15px] font-medium duration-300 ${
                  sidebarMode === "expanded"
                    ? "gap-3.5 px-4"
                    : "justify-center px-2"
                } ${
                  active
                    ? "glass-violet text-white"
                    : "text-ink-soft hover:bg-ink/[0.04] hover:text-ink"
                }`}
              >
                <TVMIcon name={item.icon} />
                {sidebarMode === "expanded" && item.label}
              </Link>
            );
          })}
        </nav>

        <PreviewSidebar compact={sidebarMode !== "expanded"} />

        <div className="mt-auto space-y-2">
          <UpgradeNavCard
            compact={sidebarMode !== "expanded"}
            plan={entitlement.plan}
            onUpgrade={openUpgrade}
          />
          <ProfileNavLink
            compact={sidebarMode !== "expanded"}
            name={accountLabel(profile, user.email)}
            active={navIsActive(pathname, "/dashboard/settings")}
            href={withArchiveQuery("/dashboard/settings", archive)}
          />
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <div className="sticky top-[var(--site-notice,0px)] z-20 flex items-center justify-between border-b border-ink/[0.06] bg-white/90 px-5 py-3 backdrop-blur lg:hidden">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="grid h-10 w-10 place-items-center rounded-full text-violet hover:bg-violet/10"
            aria-label="Open dashboard menu"
          >
            <TVMIcon name="menu" />
          </button>
          <TVMBrand />
          <span className="glass-violet rounded-full px-4 py-2 text-sm font-semibold uppercase text-white">
            {entitlement.plan}
          </span>
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
                {dashboardNav.map((item) => {
                  const active = navIsActive(pathname, item.href);
                  return (
                    <Link
                      key={item.href}
                      href={withArchiveQuery(item.href, archive)}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3.5 rounded-2xl px-4 py-3 text-[15px] font-medium duration-300 ${
                        active
                          ? "glass-violet text-white"
                          : "text-ink-soft hover:bg-violet/[0.05] hover:text-ink"
                      }`}
                    >
                      <TVMIcon name={item.icon} />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
              <PreviewSidebar onNavigate={() => setMobileMenuOpen(false)} />
              <div className="mt-auto space-y-2">
                <UpgradeNavCard
                  plan={entitlement.plan}
                  onUpgrade={() => {
                    setMobileMenuOpen(false);
                    openUpgrade();
                  }}
                />
                <ProfileNavLink
                  name={accountLabel(profile, user.email)}
                  active={navIsActive(pathname, "/dashboard/settings")}
                  href={withArchiveQuery("/dashboard/settings", archive)}
                  onNavigate={() => setMobileMenuOpen(false)}
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
