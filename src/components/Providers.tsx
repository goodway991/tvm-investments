"use client";

import { AuthProvider } from "@/components/AuthProvider";
import { GiftedProModal } from "@/components/GiftedProModal";
import { UpgradeProvider } from "@/components/UpgradeProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <UpgradeProvider>
        {children}
        <GiftedProModal />
      </UpgradeProvider>
    </AuthProvider>
  );
}
