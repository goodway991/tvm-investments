import { NextResponse } from "next/server";
import { ARCHIVE_DEMO_DATES, mergeArchiveDates } from "@/lib/archive-demo";
import { FREE_ARCHIVE_LOOKBACK_DAYS } from "@/lib/plans";
import { listSnapshotDates } from "@/lib/firebase/admin";
import { readDiskSnapshot } from "@/lib/snapshot-cache";

export const dynamic = "force-dynamic";

export async function GET() {
  const dates = await listSnapshotDates();
  const disk = await readDiskSnapshot();
  if (disk?.date && /^\d{4}-\d{2}-\d{2}$/.test(disk.date) && !dates.includes(disk.date)) {
    dates.unshift(disk.date);
  }
  return NextResponse.json({
    dates: mergeArchiveDates(dates),
    rules: {
      freeLookbackDays: FREE_ARCHIVE_LOOKBACK_DAYS,
      proFromJoinDate: true,
      seededDemoDates: ARCHIVE_DEMO_DATES,
    },
  });
}
