import type { Metadata } from "next";
import { DashboardOverview } from "@/components/DashboardOverview";
import { getDashboardSnapshot } from "@/lib/snapshot";
import { dashboardView } from "@/lib/snapshot-view";

export const metadata: Metadata = {
  title: "Dashboard — TVM Investments",
  description: "Daily movers, composite signals, and research reports.",
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ archive?: string }>;
}) {
  const { archive } = await searchParams;
  const snapshot = await getDashboardSnapshot(archive);
  return <DashboardOverview snapshot={dashboardView(snapshot)} />;
}
