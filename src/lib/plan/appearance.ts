/** How each session type looks in the calendar and lists. */

import type { SessionType } from "@/lib/plan/template";

export type TypeGroup = "strength" | "run" | "hyrox" | "recovery" | "rest" | "race";

type TypeMeta = {
  label: string;
  group: TypeGroup;
};

export const TYPE_META: Record<SessionType, TypeMeta> = {
  lower_hyrox: { label: "Lower + Hyrox", group: "strength" },
  upper: { label: "Upper", group: "strength" },
  full_body_circuit: { label: "Full body + circuit", group: "strength" },
  light_lift: { label: "Light lift", group: "strength" },
  easy_run: { label: "Easy run", group: "run" },
  intervals: { label: "Intervals", group: "run" },
  long_run: { label: "Long run", group: "run" },
  jog_strides: { label: "Jog + strides", group: "run" },
  partner_hyrox: { label: "Partner Hyrox", group: "hyrox" },
  race_simulation: { label: "Race simulation", group: "hyrox" },
  half_simulation: { label: "Half simulation", group: "hyrox" },
  swim_pickleball: { label: "Swim or pickleball", group: "recovery" },
  rest: { label: "Rest", group: "rest" },
  race: { label: "Race", group: "race" },
};

/**
 * Written out in full rather than composed, because Tailwind only sees
 * class names that appear literally in the source.
 */
export const GROUP_DOT: Record<TypeGroup, string> = {
  strength: "bg-primary",
  run: "bg-alt",
  hyrox: "bg-sky-400",
  recovery: "bg-teal-300",
  rest: "bg-white/25",
  race: "bg-white",
};

export const GROUP_TEXT: Record<TypeGroup, string> = {
  strength: "text-primary",
  run: "text-alt",
  hyrox: "text-sky-400",
  recovery: "text-teal-300",
  rest: "text-muted-foreground",
  race: "text-foreground",
};

export const GROUP_LABEL: Record<TypeGroup, string> = {
  strength: "Strength",
  run: "Run",
  hyrox: "Hyrox",
  recovery: "Recovery",
  rest: "Rest",
  race: "Race",
};

export function groupOf(type: SessionType): TypeGroup {
  return TYPE_META[type]?.group ?? "rest";
}
