import type { Metadata } from "next";
import { MaintenancePage } from "@/components/MaintenancePage";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Maintenance — TVM Investments",
  description: "The TVM research desk is briefly offline. Check back later.",
};

export default function MaintenanceRoute() {
  return <MaintenancePage />;
}
