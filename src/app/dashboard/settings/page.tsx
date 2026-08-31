import type { Metadata } from "next";
import { AdminAccountsPanel } from "@/components/AdminAccountsPanel";
import { AdminBetaCodesPanel } from "@/components/AdminBetaCodesPanel";
import { AdminMaintenancePanel } from "@/components/AdminMaintenancePanel";
import { AdminPromoCodesPanel } from "@/components/AdminPromoCodesPanel";
import { AdminWaitlistPanel } from "@/components/AdminWaitlistPanel";
import { AdminFeedbackPanel } from "@/components/AdminFeedbackPanel";
import { SettingsPanel } from "@/components/AccountPanels";
import { FeedbackPanel } from "@/components/FeedbackPanel";

export const metadata: Metadata = {
  title: "Settings — TVM Investments",
};

export default function SettingsPage() {
  return (
    <div className="dashboard-research">
      <SettingsPanel />
      <AdminMaintenancePanel />
      <AdminBetaCodesPanel />
      <AdminWaitlistPanel />
      <AdminPromoCodesPanel />
      <AdminAccountsPanel />
      <AdminFeedbackPanel />
      <FeedbackPanel />
    </div>
  );
}
