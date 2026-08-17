import type { Metadata } from "next";
import { ReportsClient } from "@/components/ReportsClient";
import { getDashboardSnapshot } from "@/lib/snapshot";
import { reportsView } from "@/lib/snapshot-view";

export const metadata: Metadata = {
  title: "Reports — TVM Investments",
};

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ archive?: string }>;
}) {
  const { archive } = await searchParams;
  const snapshot = await getDashboardSnapshot(archive);
  return <ReportsClient snapshot={reportsView(snapshot)} />;
}
