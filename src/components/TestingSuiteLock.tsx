function MiniPadlock() {
  return (
    <svg viewBox="0 0 24 32" className="h-7 w-6 shrink-0" aria-hidden>
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
        fill="currentColor"
        fillOpacity="0.18"
        stroke="currentColor"
        strokeWidth="2"
      />
      <circle cx="12" cy="21" r="1.4" fill="currentColor" />
      <path d="M12 22.3v2.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function MiniConstructionCone({ className = "h-7 w-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 32" className={`${className} shrink-0`} aria-hidden>
      <path d="M4 28h16" stroke="#a1a1aa" strokeWidth="2" strokeLinecap="round" />
      <path d="M9.2 28 11.4 8.6h1.2L16.8 28Z" fill="#d4d4d8" stroke="#a1a1aa" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M10.05 21.2h3.9l.45 4H9.6l.45-4Z" fill="#f4b183" />
      <path d="M10.55 14.4h2.9l.4 3.4h-3.7l.4-3.4Z" fill="#f4b183" />
      <rect x="10.7" y="6.2" width="2.6" height="2.6" rx="0.6" fill="#a1a1aa" />
    </svg>
  );
}

function LockedFeatureCard({
  compact = false,
  title,
  status = "Coming soon",
  mark = "lock",
}: {
  compact?: boolean;
  title: string;
  status?: string;
  mark?: "lock" | "construction";
}) {
  const icon = mark === "construction" ? <MiniConstructionCone /> : <MiniPadlock />;
  return (
    <button
      type="button"
      disabled
      className={`testing-suite-lock rounded-2xl ${
        compact
          ? "grid h-[52px] w-full place-items-center px-2"
          : "flex min-h-[52px] w-full items-center gap-3.5 px-4 py-3 text-left"
      }`}
      title={`${title} is still being built`}
    >
      {icon}
      {!compact && (
        <span className="min-w-0">
          <span className="on-white block text-sm font-semibold leading-tight">
            {title}
          </span>
          <span className="on-white block text-[11px] font-medium leading-tight">
            {status}
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

export function PortfolioLock({ compact = false }: { compact?: boolean }) {
  return (
    <LockedFeatureCard
      compact={compact}
      title="Portfolio"
      status="Under construction"
      mark="construction"
    />
  );
}

export function PortfolioConstructionMark({ className }: { className?: string }) {
  return <MiniConstructionCone className={className ?? "h-16 w-14"} />;
}
