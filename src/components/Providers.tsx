"use client";

import { AuthProvider } from "@/components/AuthProvider";
import { UpgradeProvider } from "@/components/UpgradeProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <UpgradeProvider>{children}</UpgradeProvider>
    </AuthProvider>
  );
}
