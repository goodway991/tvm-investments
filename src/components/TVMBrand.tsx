type IconName =
  | "menu"
  | "close"
  | "home"
  | "dashboard"
  | "about"
  | "login"
  | "movers"
  | "screener"
  | "reports"
  | "watchlist"
  | "settings"
  | "search"
  | "arrow"
  | "back";

export function TVMBrand({
  size = 30,
  showWordmark = true,
}: {
  size?: number;
  showWordmark?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <span
        className="glass-violet grid shrink-0 place-items-center rounded-[13px] text-white"
        style={{ width: size, height: size }}
      >
        <svg width={size * 0.55} height={size * 0.55} viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M3 17.5 8.5 11l4 3.5L21 5"
            stroke="white"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="21" cy="5" r="2.4" fill="white" />
        </svg>
      </span>
      {showWordmark && (
        <span className="leading-none">
          <span className="font-display font-extrabold tracking-tight text-ink">TVM</span>
          <span className="ml-1 font-display font-semibold text-violet">Investments</span>
        </span>
      )}
    </span>
  );
}

export function TVMIcon({
  name,
  size = 20,
  className,
}: {
  name: IconName;
  size?: number;
  className?: string;
}) {
  const paths: Record<IconName, React.ReactNode> = {
    menu: <path d="M4 7h16M4 12h16M4 17h16" />,
    close: <path d="M6 6l12 12M18 6 6 18" />,
    home: <path d="M3 11.5 12 4l9 7.5M5 10v10h14V10" />,
    dashboard: <path d="M4 13h6V4H4v9Zm0 7h6v-5H4v5Zm10 0h6V11h-6v9Zm0-16v5h6V4h-6Z" />,
    about: <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-8 8a8 8 0 0 1 16 0" />,
    login: <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3" />,
    movers: <path d="M3 17.5 8.5 11l4 3.5L21 5" />,
    screener: <path d="M4 6h16M7 12h10M10 18h4" />,
    reports: <path d="M8 4h8l4 4v12H4V4h4Zm0 8h8M8 16h5" />,
    watchlist: <path d="M12 3l2.5 5 5.5.8-4 3.9.9 5.5L12 21l-4.9 2.6.9-5.5-4-3.9L9.5 8z" />,
    settings: (
      <>
        <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
        <path d="M19.4 12a7.4 7.4 0 0 0-.1-1.3l2-1.6-2-3.4-2.4 1a7.3 7.3 0 0 0-2.2-1.3l-.4-2.6H9.7l-.4 2.6a7.3 7.3 0 0 0-2.2 1.3l-2.4-1-2 3.4 2 1.6a7.4 7.4 0 0 0 0 2.6l-2 1.6 2 3.4 2.4-1a7.3 7.3 0 0 0 2.2 1.3l.4 2.6h4.6l.4-2.6a7.3 7.3 0 0 0 2.2-1.3l2.4 1 2-3.4-2-1.6c.06-.43.1-.86.1-1.3Z" />
      </>
    ),
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3-3" />
      </>
    ),
    arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
    back: <path d="M15 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10M10 17l5-5-5-5M15 12H3" />,
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden
    >
      <g
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {paths[name]}
      </g>
    </svg>
  );
}
