"use client";

import { doc, onSnapshot } from "firebase/firestore";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { getClientFirestore } from "@/lib/firebase/client";
import { MAINTENANCE_COLLECTION, MAINTENANCE_DOC_ID } from "@/lib/maintenance";

export function MaintenanceGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [enabled, setEnabled] = useState(false);

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
    if (enabled && user && onDesk) {
      router.replace("/maintenance");
      return;
    }
    if (!enabled && user && pathname === "/maintenance") {
      router.replace("/dashboard");
    }
  }, [enabled, loading, pathname, router, user]);

  return children;
}
