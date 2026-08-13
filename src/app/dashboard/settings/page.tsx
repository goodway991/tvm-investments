import type { Metadata } from "next";
import { AdminAccountsPanel } from "@/components/AdminAccountsPanel";
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
      <FeedbackPanel />
    </div>
  );
}
