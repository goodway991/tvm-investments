"use client";

import { AuthProvider } from "@/components/AuthProvider";
import { GiftedProModal } from "@/components/GiftedProModal";
import { WhatsNewModal } from "@/components/WhatsNewModal";
import { MaintenanceGate } from "@/components/MaintenanceGate";
import { ThemeProvider } from "@/components/ThemeProvider";
import { TourProvider } from "@/components/TourProvider";
import { UpgradeProvider } from "@/components/UpgradeProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <UpgradeProvider>
          <TourProvider>
            <MaintenanceGate>
              {children}
              <GiftedProModal />
              <WhatsNewModal />
            </MaintenanceGate>
          </TourProvider>
        </UpgradeProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
