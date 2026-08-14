"use client";

import { AuthProvider } from "@/components/AuthProvider";
import { GiftedProModal } from "@/components/GiftedProModal";
import { WhatsNewModal } from "@/components/WhatsNewModal";
import { MaintenanceGate } from "@/components/MaintenanceGate";
import { ThemeProvider } from "@/components/ThemeProvider";
import { TourProvider } from "@/components/TourProvider";
import { UpgradeProvider } from "@/components/UpgradeProvider";
import { BogenProvider } from "@/components/BogenProvider";
import { MotionPauseRoot } from "@/components/LoopMotion";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <UpgradeProvider>
          <TourProvider>
            <BogenProvider>
              <MaintenanceGate>
                <MotionPauseRoot />
                {children}
                <GiftedProModal />
                <WhatsNewModal />
              </MaintenanceGate>
            </BogenProvider>
          </TourProvider>
        </UpgradeProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
