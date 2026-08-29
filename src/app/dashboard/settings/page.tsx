import type { Metadata } from "next";
import { AdminAccountsPanel } from "@/components/AdminAccountsPanel";
import { AdminWaitlistPanel } from "@/components/AdminWaitlistPanel";
import { AdminFeedbackPanel } from "@/components/AdminFeedbackPanel";
import { SettingsPanel } from "@/components/AccountPanels";
import { FeedbackPanel } from "@/components/FeedbackPanel";
import { WaitlistCard } from "@/components/WaitlistCard";

export const metadata: Metadata = {
  title: "Settings — TVM Investments",
};

export default function SettingsPage() {
  return (
    <div className="dashboard-research">
      <SettingsPanel />
      <div className="mt-4">
        <WaitlistCard />
      </div>
      <AdminWaitlistPanel />
      <AdminAccountsPanel />
      <AdminFeedbackPanel />
      <FeedbackPanel />
    </div>
  );
}
