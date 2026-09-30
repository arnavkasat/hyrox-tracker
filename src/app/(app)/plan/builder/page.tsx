import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { BuilderView } from "./builder-view";
import { Screen } from "@/components/ios/screen";
import { getAppContext } from "@/lib/data/queries";
import { emptyTemplate, type WeeklyTemplate } from "@/lib/plan/custom";
import { PRESETS } from "@/lib/plan/blocks";
import { weekdayTemplate } from "@/lib/plan/template";

/** Seeds the builder from the built-in block so you start from something real. */
function builtInAsTemplate(): WeeklyTemplate {
  const template = emptyTemplate();

  for (let weekday = 1; weekday <= 7; weekday++) {
    const day = weekdayTemplate(1, weekday);
    template.days[String(weekday)] =
      day.type === "rest"
        ? null
        : {
            title: day.title,
            type: day.type,
            planned: day.planned,
            withPartner: day.withPartner ?? false,
          };
  }

  // The built-in block's own phase changes, as editable overrides.
  const intervals = PRESETS.find((p) => p.id === "intervals");
  const partner = PRESETS.find((p) => p.id === "partner_hyrox");

  if (intervals) {
    template.overrides.push({
      fromWeek: 9,
      weekday: 2,
      day: {
        title: intervals.title,
        type: intervals.type,
        planned: intervals.planned,
        withPartner: false,
      },
    });
  }
  if (partner) {
    template.overrides.push({
      fromWeek: 9,
      weekday: 5,
      day: {
        title: partner.title,
        type: partner.type,
        planned: partner.planned,
        withPartner: true,
      },
    });
  }

  return template;
}

export default async function BuilderPage() {
  const { settings } = await getAppContext();

  const saved = settings.plan_template as WeeklyTemplate | null;
  const usingBuiltIn = saved === null;

  return (
    <Screen
      title="Build your week"
      subtitle={usingBuiltIn ? "Starting from the built-in Hyrox block" : "Your own template"}
      action={
        <Link
          href="/plan"
          className="press flex items-center gap-0.5 text-[17px] font-medium text-primary"
        >
          <ChevronLeft className="size-5" />
          Plan
        </Link>
      }
    >
      <BuilderView initial={saved ?? builtInAsTemplate()} usingBuiltIn={usingBuiltIn} />
    </Screen>
  );
}
