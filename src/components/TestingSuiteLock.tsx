function MiniPadlock() {
  return (
    <svg viewBox="0 0 24 32" className="h-7 w-6 shrink-0 text-zinc-400" aria-hidden>
      <path
        d="M7 14.5V10a5 5 0 0 1 10 0v4.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <rect
        x="4"
        y="14"
        width="16"
        height="14"
        rx="2.6"
        fill="#d4d4d8"
        stroke="currentColor"
        strokeWidth="2"
      />
      <circle cx="12" cy="21" r="1.4" fill="#9ca3af" />
      <path d="M12 22.3v2.6" stroke="#9ca3af" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function LockedFeatureCard({
  compact = false,
  title,
}: {
  compact?: boolean;
  title: string;
}) {
  return (
    <button
      type="button"
      disabled
      className={`testing-suite-lock rounded-2xl border border-ink/[0.08] bg-[#f3f3f5] text-zinc-400 ${
        compact
          ? "grid h-12 w-full place-items-center px-2"
          : "flex min-h-[52px] items-center gap-3 px-3 py-2.5 text-left"
      }`}
      title={`${title} is still being built`}
    >
      <MiniPadlock />
      {!compact && (
        <span className="min-w-0">
          <span className="on-white block text-sm font-semibold leading-tight">
            {title}
          </span>
          <span className="on-white block text-[11px] font-medium leading-tight">
            Coming soon
          </span>
        </span>
      )}
    </button>
  );
}

export function TestingSuiteLock({ compact = false }: { compact?: boolean }) {
  return <LockedFeatureCard compact={compact} title="Horizon Suite" />;
}

export function ArchiveCalendarLock({ compact = false }: { compact?: boolean }) {
  return <LockedFeatureCard compact={compact} title="Archive Calendar" />;
}
