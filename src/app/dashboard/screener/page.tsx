import type { Metadata } from "next";
import { FilterPanel } from "@/components/FilterPanel";
import { Methodology } from "@/components/Methodology";

export const metadata: Metadata = {
  title: "Screener — TVM Investments",
};

export default async function ScreenerPage({
  searchParams,
}: {
  searchParams: Promise<{ archive?: string }>;
}) {
  const { archive } = await searchParams;
  return (
    <div className="dashboard-research space-y-8">
      <FilterPanel archiveDate={archive} />
      <Methodology />
    </div>
  );
}
