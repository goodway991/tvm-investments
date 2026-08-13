import { DashboardShell } from "@/components/DashboardShell";
import { Suspense } from "react";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense>
      <DashboardShell>{children}</DashboardShell>
    </Suspense>
  );
}
