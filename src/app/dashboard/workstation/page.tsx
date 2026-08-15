import type { Metadata } from "next";
import { WorkstationClient } from "@/components/WorkstationClient";
import { getDashboardSnapshot } from "@/lib/snapshot";

export const metadata: Metadata = {
  title: "Workstation — TVM Investments",
};

export default async function WorkstationPage({
  searchParams,
}: {
  searchParams: Promise<{ archive?: string }>;
}) {
  const { archive } = await searchParams;
  const snapshot = await getDashboardSnapshot(archive);
  return (
    <div className="dashboard-research">
      <WorkstationClient snapshot={snapshot} />
    </div>
  );
}
