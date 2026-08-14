"use client";

import { AuthProvider } from "@/components/AuthProvider";
import { GiftedProModal } from "@/components/GiftedProModal";
import { TourProvider } from "@/components/TourProvider";
import { UpgradeProvider } from "@/components/UpgradeProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <UpgradeProvider>
        <TourProvider>
          {children}
          <GiftedProModal />
        </TourProvider>
      </UpgradeProvider>
    </AuthProvider>
  );
}
