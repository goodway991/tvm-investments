"use client";

import { Suspense } from "react";
import { AuthProvider } from "@/components/AuthProvider";
import { GiftedProModal } from "@/components/GiftedProModal";
import { WhatsNewModal } from "@/components/WhatsNewModal";
import { MaintenanceGate } from "@/components/MaintenanceGate";
import { ThemeProvider } from "@/components/ThemeProvider";
import { TourProvider } from "@/components/TourProvider";
import { UpgradeProvider } from "@/components/UpgradeProvider";
import { BogenProvider } from "@/components/BogenProvider";
import { ExperienceProvider } from "@/components/ExperienceProvider";
import { CustomizeExperienceModal } from "@/components/CustomizeExperienceModal";
import { GoodMorningModal } from "@/components/GoodMorningModal";
import { MotionPauseRoot } from "@/components/LoopMotion";
import { SiteEraProvider } from "@/components/SiteEraProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <Suspense>
      <SiteEraProvider>
        <ThemeProvider>
          <AuthProvider>
            <ExperienceProvider>
              <BogenProvider>
                <UpgradeProvider>
                  <TourProvider>
                    <MaintenanceGate>
                      <MotionPauseRoot />
                      {children}
                      <GiftedProModal />
                      <CustomizeExperienceModal />
                      <WhatsNewModal />
                      <GoodMorningModal />
                    </MaintenanceGate>
                  </TourProvider>
                </UpgradeProvider>
              </BogenProvider>
            </ExperienceProvider>
          </AuthProvider>
        </ThemeProvider>
      </SiteEraProvider>
    </Suspense>
  );
}
