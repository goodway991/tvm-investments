import type { Metadata } from "next";
import { AdminAccountsPanel } from "@/components/AdminAccountsPanel";
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
      <AdminAccountsPanel />
      <AdminFeedbackPanel />
      <FeedbackPanel />
    </div>
  );
}
