import type { Metadata } from "next";
import { DailyBrief } from "@/components/DailyBrief";
import { getDashboardSnapshot } from "@/lib/snapshot";

export const metadata: Metadata = {
  title: "Daily Brief — TVM Investments",
};

export default async function BriefPage({
  searchParams,
}: {
  searchParams: Promise<{ archive?: string }>;
}) {
  const { archive } = await searchParams;
  const snapshot = await getDashboardSnapshot(archive);
  return <DailyBrief snapshot={snapshot} />;
}
