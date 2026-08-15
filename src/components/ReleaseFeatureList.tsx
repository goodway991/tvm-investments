import type { ReleaseFeature } from "@/lib/release-notes";
import { ReleaseFeatureVisual } from "@/components/ReleaseFeatureVisual";
import { ProGlowText } from "@/components/ProGlowText";

export function ReleaseFeatureList({
  features,
}: {
  features: ReleaseFeature[];
}) {
  return (
    <div className="space-y-5">
      {features.map((feature) => (
        <div key={feature.title}>
          <h3 className="font-display text-base font-bold text-ink">
            <ProGlowText>{feature.title}</ProGlowText>
          </h3>
          {feature.visual ? (
            <div className="mt-2">
              <ReleaseFeatureVisual id={feature.visual} />
            </div>
          ) : null}
          {feature.body ? (
            <p className="mt-2 font-display text-sm font-semibold leading-relaxed text-ink">
              <ProGlowText>{feature.body}</ProGlowText>
            </p>
          ) : null}
        </div>
      ))}
    </div>
  );
}
