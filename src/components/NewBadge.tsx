"use client";

import { useAuth } from "@/components/AuthProvider";
import type { NewFeatureId } from "@/lib/new-badges";

export function NewBadge({ feature }: { feature: NewFeatureId }) {
  const { isFeatureNew } = useAuth();
  if (!isFeatureNew(feature)) return null;
  return <span className="new-badge">New</span>;
}
