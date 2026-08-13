import type { Metadata } from "next";
import { DashboardClient } from "@/components/DashboardClient";
import { getDashboardSnapshot } from "@/lib/snapshot";

export const metadata: Metadata = {
  title: "Dashboard — TVM Investments",
  description: "Daily movers, composite signals, research reports, and investment scenarios.",
};

export const revalidate = 3600;

export default async function DashboardRoute() {
  const snapshot = await getDashboardSnapshot();
  return <DashboardClient snapshot={snapshot} />;
}
