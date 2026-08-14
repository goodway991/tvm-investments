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
  const { warning, start, end } = useMaintenance();
  if (!warning) return null;
  const detail = end
    ? `Until ${end}`
    : start
      ? `From ${start}`
      : "Scheduled downtime";
  return (
    <div
      className={`maintenance-nav-card rounded-2xl ${
        compact
          ? "grid h-[52px] w-full place-items-center px-2"
          : "flex min-h-[52px] w-full items-center gap-3 px-3 py-2.5 text-left"
      }`}
      title={detail}
    >
      <TVMIcon name="warning" size={18} />
      {!compact && (
        <span className="min-w-0">
          <span className="block text-sm font-semibold leading-tight">
            Maintenance
          </span>
          <span className="block truncate text-[11px] font-medium leading-tight opacity-85">
            {detail}
          </span>
        </span>
      )}
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
