"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { TVMBrand, TVMIcon } from "@/components/TVMBrand";
import { LegalFooter } from "@/components/LegalFooter";
import { useUpgrade } from "@/components/UpgradeProvider";

const primaryLinks = [
  { label: "Home", href: "/", icon: "home" as const },
  { label: "Dashboard", href: "/dashboard", icon: "dashboard" as const },
  { label: "About Us", href: "/about", icon: "about" as const },
  { label: "Sign In", href: "/login", icon: "login" as const },
];

const workspaceLinks = [
  { label: "Daily Brief", href: "/dashboard/brief" },
  { label: "Screener", href: "/dashboard/screener" },
  { label: "Reports", href: "/dashboard/reports" },
  { label: "Watchlist", href: "/dashboard/watchlist" },
  { label: "Portfolio", href: "/dashboard/portfolio" },
  { label: "Settings", href: "/dashboard/settings" },
];

function LandingAuthBar() {
  return (
    <header className="sticky top-0 z-30 px-4 pb-2 pt-4">
      <div className="glass mx-auto flex w-[min(1180px,100%)] items-center gap-3 rounded-full py-2.5 pl-4 pr-2.5">
        <Link href="/" className="shrink-0" aria-label="TVM Investments home">
          <TVMBrand />
        </Link>
        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          <Link
            href="/login"
            className="inline-flex rounded-full px-4 py-2 text-sm font-medium text-ink-soft transition-all duration-200 hover:bg-white/50 hover:text-violet active:scale-[0.97]"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="glass-violet inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-medium text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_20px_40px_-14px_rgba(75,52,220,0.7)] active:scale-[0.97]"
          >
            Create account
          </Link>
        </div>
      </div>
    </header>
  );
}

export function PublicShell({
  children,
  showNavigation = true,
  showAuthBar = false,
}: {
  children: React.ReactNode;
  showNavigation?: boolean;
  showAuthBar?: boolean;
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const { openUpgrade } = useUpgrade();

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, []);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  if (!showNavigation) {
    return (
      <div className="min-h-screen">
        {showAuthBar ? <LandingAuthBar /> : null}
        {children}
        <LegalFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="fixed left-1/2 top-4 z-30 w-[min(1180px,calc(100%-2rem))] -translate-x-1/2">
        <div className="glass flex items-center gap-4 rounded-full py-2.5 pl-3 pr-3">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="grid h-10 w-10 cursor-pointer place-items-center rounded-full text-ink transition-colors hover:bg-white/60"
            aria-label="Open menu"
            aria-expanded={menuOpen}
          >
            <TVMIcon name="menu" />
          </button>

          <Link href="/" className="shrink-0" aria-label="TVM Investments home">
            <TVMBrand />
          </Link>

          <nav className="ml-4 hidden items-center gap-1 md:flex" aria-label="Primary navigation">
            {[
              { label: "Home", href: "/" },
              { label: "About", href: "/about" },
              { label: "Dashboard", href: "/dashboard" },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  isActive(link.href)
                    ? "text-violet"
                    : "text-ink-soft hover:text-ink"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <Link
              href="/login"
              className="hidden rounded-full px-4 py-2 text-sm font-medium text-ink-soft transition-all duration-200 hover:bg-white/50 hover:text-violet active:scale-[0.97] sm:inline-flex"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="glass-violet inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-medium text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_20px_40px_-14px_rgba(75,52,220,0.7)] active:scale-[0.97]"
            >
              Sign up
            </Link>
          </div>
        </div>
      </header>

      <button
        type="button"
        className="fixed inset-0 z-40 cursor-default transition-all duration-500"
        style={{
          backdropFilter: menuOpen ? "blur(6px)" : "blur(0px)",
          background: menuOpen ? "rgba(40, 32, 90, 0.12)" : "rgba(40, 32, 90, 0)",
          pointerEvents: menuOpen ? "auto" : "none",
        }}
        onClick={() => setMenuOpen(false)}
        aria-label="Close menu overlay"
        tabIndex={menuOpen ? 0 : -1}
      />

      <aside
        className="glass-strong fixed bottom-4 left-4 top-4 z-50 flex w-[300px] max-w-[82vw] flex-col rounded-[28px] p-6"
        style={{
          transform: menuOpen ? "translateX(0) scale(1)" : "translateX(-118%) scale(.96)",
          opacity: menuOpen ? 1 : 0,
          pointerEvents: menuOpen ? "auto" : "none",
          transition:
            "transform .55s cubic-bezier(.22,1,.36,1), opacity .4s ease",
        }}
        aria-hidden={!menuOpen}
        inert={!menuOpen}
      >
        <div className="flex items-center justify-between">
          <Link href="/" onClick={() => setMenuOpen(false)}>
            <TVMBrand />
          </Link>
          <button
            type="button"
            onClick={() => setMenuOpen(false)}
            className="grid h-9 w-9 cursor-pointer place-items-center rounded-full text-ink-soft transition-colors hover:bg-white/60 hover:text-violet"
            aria-label="Close menu"
          >
            <TVMIcon name="close" size={18} />
          </button>
        </div>

        <nav className="mt-8 flex flex-col gap-1.5" aria-label="Menu navigation">
          {primaryLinks.map((link, index) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className={`flex items-center gap-3.5 rounded-2xl px-4 py-3 text-left text-[15px] font-medium transition-all ${
                isActive(link.href)
                  ? "glass-violet text-white"
                  : "text-ink-soft hover:bg-white/60 hover:text-ink"
              }`}
              style={{
                transitionDelay: menuOpen ? `${120 + index * 55}ms` : "0ms",
                transform: menuOpen ? "translateX(0)" : "translateX(-14px)",
                opacity: menuOpen ? 1 : 0,
              }}
            >
              <TVMIcon name={link.icon} />
              {link.label}
            </Link>
          ))}
        </nav>

        <p className="mb-3 mt-7 px-4 text-xs font-semibold uppercase tracking-wider text-ink-soft/70">
          Workspace
        </p>
        <div className="flex flex-col gap-0.5">
          {workspaceLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className="rounded-xl px-4 py-2 text-left text-sm text-ink-soft transition-colors hover:bg-white/60 hover:text-violet"
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="glass mt-auto rounded-2xl p-4">
          <p className="font-display text-sm font-semibold text-ink">Go Pro</p>
          <p className="mt-1 text-xs leading-relaxed text-ink-soft">
            Unlock live-time screening and full backtests.
          </p>
          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              openUpgrade();
            }}
            className="glass-violet mt-3 block w-full rounded-full py-2 text-center text-sm font-medium text-white transition-transform hover:-translate-y-0.5"
          >
            Upgrade
          </button>
        </div>
      </aside>

      {children}
      <LegalFooter />
    </div>
  );
}
