"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/components/AuthProvider";
import { VirtualTour } from "@/components/VirtualTour";
import { useExperience } from "@/components/ExperienceProvider";
import { showCustomizeExperience } from "@/lib/beta-labs";
import { customizeAutoAction } from "@/lib/customize-prompt";

interface TourContextValue {
  isOpen: boolean;
  openTour: (options?: { required?: boolean }) => void;
}

const TourContext = createContext<TourContextValue>({
  isOpen: false,
  openTour: () => {},
});

export function useTour() {
  return useContext(TourContext);
}

export function TourProvider({ children }: { children: ReactNode }) {
  const { completeTour, giftPending, entitlement, profile, user, loading } = useAuth();
  const { openCustomize } = useExperience();
  const [open, setOpen] = useState(false);
  const [required, setRequired] = useState(false);

  const openTour = useCallback((options?: { required?: boolean }) => {
    setRequired(Boolean(options?.required));
    setOpen(true);
  }, []);

  const finish = useCallback(async () => {
    setOpen(false);
    setRequired(false);
    await completeTour();
    const action = customizeAutoAction({
      uid: user?.uid,
      loading,
      tourPending: false,
      profileReady: Boolean(profile?.createdAt),
      seenCustomize: profile?.seenCustomize,
      country: profile?.country,
      timeZone: profile?.timeZone,
      role: entitlement.role,
      createdAt: profile?.createdAt,
    });
    if (
      !giftPending &&
      showCustomizeExperience(entitlement.role) &&
      action === "open"
    ) {
      openCustomize();
    }
  }, [
    completeTour,
    entitlement.role,
    giftPending,
    loading,
    openCustomize,
    profile?.country,
    profile?.createdAt,
    profile?.seenCustomize,
    profile?.timeZone,
    user?.uid,
  ]);

  const dismiss = useCallback(() => {
    if (required) return;
    setOpen(false);
  }, [required]);

  const value = useMemo(
    () => ({ isOpen: open, openTour }),
    [open, openTour],
  );

  return (
    <TourContext.Provider value={value}>
      {children}
      {open ? (
        <VirtualTour
          required={required}
          onFinish={() => void finish()}
          onDismiss={required ? undefined : dismiss}
        />
      ) : null}
    </TourContext.Provider>
  );
}
