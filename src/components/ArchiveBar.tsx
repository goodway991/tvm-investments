"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function ArchiveBanner() {
  const searchParams = useSearchParams();
  const archive = searchParams.get("archive");
  const pathname = usePathname();
  const router = useRouter();
  const visible = Boolean(archive);

  return (
    <div
      className={`grid transition-[grid-template-rows,opacity,margin] duration-500 ease-[cubic-bezier(.22,1,.36,1)] ${
        visible ? "mb-5 grid-rows-[1fr] opacity-100" : "pointer-events-none mb-0 grid-rows-[0fr] opacity-0"
      }`}
      aria-hidden={!visible}
    >
      <div className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-sky-200/80 bg-sky-50 px-4 py-3 text-sm text-ink">
          <p>
            Viewing the <span className="font-semibold">{archive}</span> research
            archive. Charts, news, and pick widgets are from that day. Watchlist and
            portfolio stay live.
          </p>
          <button
            type="button"
            onClick={() => router.push(pathname)}
            className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-violet"
          >
            Back to latest
          </button>
        </div>
      </div>
    </div>
  );
}

export function ArchiveModePulse() {
  const searchParams = useSearchParams();
  const archive = searchParams.get("archive");
  const previous = useRef(archive);
  const [mode, setMode] = useState<"on" | "off" | null>(null);

  useEffect(() => {
    if (previous.current === archive) return;
    const was = previous.current;
    previous.current = archive;
    setMode(!was && archive ? "on" : was && !archive ? "off" : "on");
  }, [archive]);

  useEffect(() => {
    if (!mode) return;
    const timeout = window.setTimeout(() => setMode(null), 780);
    return () => window.clearTimeout(timeout);
  }, [mode]);

  if (!mode) return null;
  return (
    <div className={`archive-mode-pulse archive-mode-pulse-${mode}`} aria-hidden />
  );
}

export function withArchiveQuery(href: string, archive: string | null) {
  if (!archive) return href;
  return `${href}?archive=${archive}`;
}
