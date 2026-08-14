"use client";

import { doc, onSnapshot } from "firebase/firestore";
import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { useAuth } from "@/components/AuthProvider";
import { TVMIcon } from "@/components/TVMBrand";
import { BogenHit } from "@/components/BogenProvider";
import { getClientFirestore } from "@/lib/firebase/client";
import {
  formatWarningText,
  MAINTENANCE_COLLECTION,
  MAINTENANCE_DOC_ID,
  parseSiteMaintenance,
  resolveMaintenanceState,
  type SiteMaintenance,
} from "@/lib/maintenance";

const ADMIN_EMAIL =
  process.env.NEXT_PUBLIC_TVM_ADMIN_EMAIL || "admin@tvm-investments.test";
const DISMISS_KEY = "tvm-warning-dismissed";

const IDLE: SiteMaintenance = {
  enabled: false,
  warning: false,
  start: "",
  end: "",
  message: "",
  startMs: null,
  endMs: null,
};

type MaintenanceContextValue = {
  warning: boolean;
  lock: boolean;
  text: string;
  start: string;
  end: string;
};

const MaintenanceContext = createContext<MaintenanceContextValue>({
  warning: false,
  lock: false,
  text: "",
  start: "",
  end: "",
});

export function useMaintenance() {
  return useContext(MaintenanceContext);
}

function warningFingerprint(site: SiteMaintenance) {
  return [site.warning, site.enabled, site.start, site.end, site.message].join("|");
}

function readDismissed() {
  try {
    return window.localStorage.getItem(DISMISS_KEY) || "";
  } catch {
    return "";
  }
}

function writeDismissed(fingerprint: string) {
  try {
    window.localStorage.setItem(DISMISS_KEY, fingerprint);
  } catch {
    /* private mode */
  }
}

export function MaintenanceNavCard({ compact = false }: { compact?: boolean }) {
  const { warning, text, start, end } = useMaintenance();
  const [open, setOpen] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointer(event: MouseEvent) {
      if (!cardRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!warning) return null;
  const detail = end
    ? `Until ${end}`
    : start
      ? `From ${start}`
      : "Scheduled downtime";

  return (
    <div ref={cardRef} className="relative">
      <BogenHit
        id="nav-maintenance"
        compact={compact}
        onDark
        className={`maintenance-nav-card rounded-2xl ${
          compact
            ? "h-[52px] justify-center px-2"
            : "min-h-[52px] gap-3 px-3 py-2.5 text-left"
        }`}
      >
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
          className="absolute inset-0 z-0 rounded-2xl"
          title={open ? "Hide maintenance details" : "Show maintenance details"}
        />
        <span className="pointer-events-none relative z-[1]">
          <TVMIcon name="warning" size={18} />
        </span>
        {!compact && (
          <span className="pointer-events-none relative z-[1] min-w-0">
            <span className="block text-sm font-semibold leading-tight">
              Maintenance
            </span>
            <span className="block truncate text-[11px] font-medium leading-tight opacity-85">
              {open ? "Hide details" : detail}
            </span>
          </span>
        )}
        {!compact && (
          <span
            className={`pointer-events-none relative z-[1] ml-auto text-[11px] font-semibold transition-transform ${
              open ? "rotate-180" : ""
            }`}
            aria-hidden
          >
            ▾
          </span>
        )}
      </BogenHit>
      {open ? (
        <div
          className={`maintenance-nav-card z-40 rounded-2xl px-3 py-3 text-[12px] font-medium leading-relaxed ${
            compact
              ? "absolute left-full top-0 ml-2 w-56"
              : "mt-2"
          }`}
        >
          {text}
          {start || end ? (
            <p className="mt-2 text-[11px] opacity-80">
              {detail}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function MaintenanceGate({ children }: { children: React.ReactNode }) {
  const { user, entitlement, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [site, setSite] = useState<SiteMaintenance>(IDLE);
  const [now, setNow] = useState(() => Date.now());
  const [dismissed, setDismissed] = useState("");
  const [mounted, setMounted] = useState(false);
  const bannerRef = useRef<HTMLDivElement>(null);
  const isAdmin =
    entitlement.role === "admin" ||
    user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();

  useEffect(() => {
    setMounted(true);
    setDismissed(readDismissed());
  }, []);

  useEffect(() => {
    const db = getClientFirestore();
    if (!db) return;
    return onSnapshot(
      doc(db, MAINTENANCE_COLLECTION, MAINTENANCE_DOC_ID),
      (snapshot) => {
        setSite(
          parseSiteMaintenance(snapshot.data() as Record<string, unknown> | undefined),
        );
      },
      () => {
        setSite(IDLE);
      },
    );
  }, []);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    const upcoming = [site.startMs, site.endMs].filter(
      (value): value is number => value != null && value > Date.now(),
    );
    const next = upcoming.length ? Math.min(...upcoming) : null;
    const delay =
      next != null
        ? Math.max(50, Math.min(next - Date.now() + 75, 30_000))
        : 30_000;
    const id = window.setTimeout(tick, delay);
    return () => window.clearTimeout(id);
  }, [now, site.startMs, site.endMs]);

  const resolved = useMemo(
    () => resolveMaintenanceState(site, now),
    [now, site],
  );

  useEffect(() => {
    if (loading) return;
    const onApp = pathname.startsWith("/dashboard");
    if (resolved.lock && user && !isAdmin && onApp) {
      router.replace("/maintenance");
      return;
    }
    if (user && pathname === "/maintenance" && (isAdmin || !resolved.lock)) {
      router.replace("/dashboard");
    }
  }, [isAdmin, loading, pathname, resolved.lock, router, user]);

  const fingerprint = useMemo(() => warningFingerprint(site), [site]);
  const warningOn = resolved.warning;
  const showWarning = mounted && warningOn && dismissed !== fingerprint;
  const warningText = formatWarningText(site);
  const maintenanceValue = useMemo(
    () => ({
      warning: warningOn,
      lock: resolved.lock,
      text: warningText,
      start: site.start,
      end: site.end,
    }),
    [resolved.lock, site.end, site.start, warningOn, warningText],
  );

  useEffect(() => {
    const root = document.documentElement;
    if (!showWarning) {
      root.classList.remove("has-site-warning");
      root.style.setProperty("--site-notice", "0px");
      return;
    }
    root.classList.add("has-site-warning");
    const node = bannerRef.current;
    if (!node) return;
    const apply = () => {
      root.style.setProperty("--site-notice", `${node.offsetHeight}px`);
    };
    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(node);
    return () => {
      observer.disconnect();
      root.classList.remove("has-site-warning");
      root.style.setProperty("--site-notice", "0px");
    };
  }, [showWarning, warningText]);

  function dismiss() {
    writeDismissed(fingerprint);
    setDismissed(fingerprint);
  }

  const banner =
    showWarning && typeof document !== "undefined" ? (
      <div ref={bannerRef} role="status" className="site-warning">
        <p className="site-warning-text">{warningText}</p>
        <button
          type="button"
          className="site-warning-close"
          aria-label="Dismiss maintenance notice"
          onClick={dismiss}
        >
          <TVMIcon name="close" size={16} />
        </button>
      </div>
    ) : null;

  return (
    <MaintenanceContext.Provider value={maintenanceValue}>
      {banner && createPortal(banner, document.body)}
      {children}
    </MaintenanceContext.Provider>
  );
}
