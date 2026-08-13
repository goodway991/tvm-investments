import type { Metadata } from "next";
import { SettingsPanel } from "@/components/AccountPanels";
import { FeedbackPanel } from "@/components/FeedbackPanel";

export const metadata: Metadata = {
  title: "Settings — TVM Investments",
};

export default function SettingsPage() {
  return (
    <div className="dashboard-research">
      <SettingsPanel />
      <FeedbackPanel />
    </div>
  );
}
