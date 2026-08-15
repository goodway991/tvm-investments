"use client";

import { useAuth } from "@/components/AuthProvider";
import type { NewFeatureId } from "@/lib/new-badges";
import { publicNewFeatureIds } from "@/lib/new-badges";

export function NewBadge({ feature }: { feature: NewFeatureId }) {
  const { isFeatureNew } = useAuth();
  if (!publicNewFeatureIds().includes(feature) || !isFeatureNew(feature)) {
    return null;
  }
  return <span className="new-badge">New</span>;
}
