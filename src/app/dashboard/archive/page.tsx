import type { Metadata } from "next";
import { ArchiveCalendarGate } from "@/components/ArchiveCalendarGate";

export const metadata: Metadata = {
  title: "Archive Calendar — TVM Investments",
};

export default function ArchiveCalendarPage() {
  return <ArchiveCalendarGate />;
}
