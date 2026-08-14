"use client";

import { doc, onSnapshot } from "firebase/firestore";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { getClientFirestore } from "@/lib/firebase/client";
import {
  formatWarningText,
  MAINTENANCE_COLLECTION,
  MAINTENANCE_DOC_ID,
  parseSiteMaintenance,
  type SiteMaintenance,
} from "@/lib/maintenance";

const ADMIN_EMAIL =
  process.env.NEXT_PUBLIC_TVM_ADMIN_EMAIL || "admin@tvm-investments.test";

const IDLE: SiteMaintenance = {
  enabled: false,
  warning: false,
  start: "",
  end: "",
  message: "",
};

export function MaintenanceGate({ children }: { children: React.ReactNode }) {
  const { user, entitlement, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [site, setSite] = useState<SiteMaintenance>(IDLE);
  const bannerRef = useRef<HTMLDivElement>(null);
  const isAdmin =
    entitlement.role === "admin" ||
    user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();

  useEffect(() => {
    const db = getClientFirestore();
    if (!db) return;
    return onSnapshot(
      doc(db, MAINTENANCE_COLLECTION, MAINTENANCE_DOC_ID),
      (snapshot) => {
        setSite(parseSiteMaintenance(snapshot.data() as Record<string, unknown> | undefined));
      },
      () => {
        setSite(IDLE);
      },
    );
  }, []);

  useEffect(() => {
    if (loading) return;
    const onDesk = pathname.startsWith("/dashboard");
    if (site.enabled && user && !isAdmin && onDesk) {
      router.replace("/maintenance");
      return;
    }
    if (user && pathname === "/maintenance" && (isAdmin || !site.enabled)) {
      router.replace("/dashboard");
    }
  }, [isAdmin, loading, pathname, router, site.enabled, user]);

  const showWarning = site.warning;
  const warningText = formatWarningText(site);

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

  return (
    <>
      {showWarning ? (
        <div
          ref={bannerRef}
          role="status"
          className="site-warning"
        >
          {warningText}
        </div>
      ) : null}
      {children}
    </>
  );
}
