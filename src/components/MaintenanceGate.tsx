"use client";

import { doc, onSnapshot } from "firebase/firestore";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { getClientFirestore } from "@/lib/firebase/client";
import { MAINTENANCE_COLLECTION, MAINTENANCE_DOC_ID } from "@/lib/maintenance";

const ADMIN_EMAIL =
  process.env.NEXT_PUBLIC_TVM_ADMIN_EMAIL || "admin@tvm-investments.test";

export function MaintenanceGate({ children }: { children: React.ReactNode }) {
  const { user, entitlement, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [enabled, setEnabled] = useState(false);
  const isAdmin =
    entitlement.role === "admin" ||
    user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();

  useEffect(() => {
    const db = getClientFirestore();
    if (!db) return;
    return onSnapshot(
      doc(db, MAINTENANCE_COLLECTION, MAINTENANCE_DOC_ID),
      (snapshot) => {
        setEnabled(snapshot.data()?.enabled === true);
      },
      () => {
        setEnabled(false);
      },
    );
  }, []);

  useEffect(() => {
    if (loading) return;
    const onDesk = pathname.startsWith("/dashboard");
    if (enabled && user && !isAdmin && onDesk) {
      router.replace("/maintenance");
      return;
    }
    if (user && pathname === "/maintenance" && (isAdmin || !enabled)) {
      router.replace("/dashboard");
    }
  }, [enabled, isAdmin, loading, pathname, router, user]);

  return children;
}
