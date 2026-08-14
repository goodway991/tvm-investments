"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function LegalFooter() {
  const year = new Date().getFullYear();
  const pathname = usePathname();
  const isLanding = pathname === "/";

  return (
    <footer className="px-6 pb-10 pt-6">
      <div className="mx-auto flex w-[min(1180px,100%)] flex-col gap-3 text-center text-[11px] leading-relaxed text-ink-soft sm:flex-row sm:items-center sm:justify-between sm:text-left">
        <p>© {year} TVM Investments</p>
        {isLanding ? (
          <nav className="flex flex-wrap justify-center gap-x-4 gap-y-1">
            <Link href="/privacy" className="hover:text-violet">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-violet">
              Terms of Service
            </Link>
            <Link href="/disclaimer" className="hover:text-violet">
              Risk Disclaimer
            </Link>
          </nav>
        ) : null}
      </div>
      {isLanding && (
        <p className="mx-auto mt-6 w-[min(1180px,100%)] max-w-3xl text-center text-[9px] leading-relaxed text-ink-soft/70">
          *“Up to 99% accuracy” is a best-case figure for quoted prices and session
          data under normal market conditions. It is not a guarantee, a typical
          result, or a measure of investment performance. Quotes can be delayed,
          incomplete, or wrong. TVM Investments provides educational research only
          — not investment, tax, or legal advice — and is not liable for trading
          losses or decisions made from this site. See our Terms of Service and
          Risk Disclaimer.
        </p>
      )}
    </footer>
  );
}
