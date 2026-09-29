import { InsetGroup, InsetRow } from "@/components/ios/inset-list";
import { Screen } from "@/components/ios/screen";

export default function ReviewPage() {
  return (
    <Screen title="Review" subtitle="Weekly summary and plan changes">
      <InsetGroup footer="Arrives in phase 4: a Sunday-evening job summarises the week and proposes plan changes for you to accept or reject.">
        <InsetRow label="This week" value="Soon" />
      </InsetGroup>
    </Screen>
  );
}
