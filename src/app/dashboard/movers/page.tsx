import type { Metadata } from "next";
import { MoversTable } from "@/components/MoversTable";
import { getDashboardSnapshot } from "@/lib/snapshot";

export const metadata: Metadata = {
  title: "Movers — TVM Investments",
};

export default async function MoversPage({
  searchParams,
}: {
  searchParams: Promise<{ archive?: string }>;
}) {
  const { archive } = await searchParams;
  const snapshot = await getDashboardSnapshot(archive);
  return (
    <div className="dashboard-research space-y-4">
      <p className="text-sm text-ink-soft">
        End-of-day scan: {snapshot.scanUniverse.combined.toLocaleString()} liquid
        US names
        {snapshot.scanUniverse.sp500
          ? ` · ${snapshot.scanUniverse.sp500} in the S&P 500`
          : ""}
        {snapshot.scanUniverse.dow30
          ? ` · ${snapshot.scanUniverse.dow30} in the Dow 30`
          : ""}
      </p>
      <MoversTable movers={snapshot.topMovers} />
    </div>
  );
}
