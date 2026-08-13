import type { Metadata } from "next";
import { FilterPanel } from "@/components/FilterPanel";
import { Methodology } from "@/components/Methodology";
import { getDashboardSnapshot } from "@/lib/snapshot";

export const metadata: Metadata = {
  title: "Screener — TVM Investments",
};

export default async function ScreenerPage({
  searchParams,
}: {
  searchParams: Promise<{ archive?: string }>;
}) {
  const { archive } = await searchParams;
  const snapshot = await getDashboardSnapshot(archive);
  return (
    <div className="dashboard-research space-y-8">
      <FilterPanel initialStocks={snapshot.screenedStocks} />
      <Methodology />
    </div>
  );
}
