import { InsetGroup, InsetRow } from "@/components/ios/inset-list";
import { Screen } from "@/components/ios/screen";

export default function ProgressPage() {
  return (
    <Screen title="Progress" subtitle="Weight, paces and benchmarks">
      <InsetGroup footer="Arrives in phase 3, once there's data worth charting.">
        <InsetRow label="7-day weight trend" value="Soon" />
        <InsetRow label="Targets" value="Soon" />
        <InsetRow label="Run pace" value="Soon" />
        <InsetRow label="Benchmarks" value="Soon" />
      </InsetGroup>
    </Screen>
  );
}
