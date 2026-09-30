"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { today as todayIn } from "@/lib/date";
import { generateFromTemplate, type WeeklyTemplate } from "@/lib/plan/custom";
import { generatePlan } from "@/lib/plan/generate";
import type { Settings } from "@/lib/supabase/types";

export type BuilderResult = { ok: true; replaced: number } | { ok: false; message: string };

/**
 * Saves the template and rebuilds the plan from it.
 *
 * Only future days that the generator itself owns are touched. Anything you
 * edited by hand, anything already trained, and everything in the past is
 * left exactly as it is — rebuilding the plan should never rewrite history.
 */
export async function saveTemplate(
  template: WeeklyTemplate | null,
): Promise<BuilderResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Not signed in." };

  const { data: settingsRow, error: settingsError } = await supabase
    .from("settings")
    .select("*")
    .eq("user_id", user.id)
    .single();
  if (settingsError) return { ok: false, message: settingsError.message };

  const settings = settingsRow as Settings;
  const today = todayIn(settings.timezone);

  const { error: saveError } = await supabase
    .from("settings")
    .update({ plan_template: template })
    .eq("user_id", user.id);
  if (saveError) return { ok: false, message: saveError.message };

  const generated = template
    ? generateFromTemplate({
        raceDate: settings.race_date,
        trainingStartDate: settings.training_start_date,
        template,
      })
    : generatePlan({
        raceDate: settings.race_date,
        trainingStartDate: settings.training_start_date,
      });

  // Which future days are still the generator's to replace?
  const { data: replaceable, error: readError } = await supabase
    .from("plan_sessions")
    .select("date")
    .eq("user_id", user.id)
    .eq("origin", "generated")
    .eq("status", "planned")
    .gt("date", today);
  if (readError) return { ok: false, message: readError.message };

  const allowed = new Set((replaceable ?? []).map((row) => row.date as string));
  const updates = generated.filter((s) => allowed.has(s.date));

  for (const session of updates) {
    const { error } = await supabase
      .from("plan_sessions")
      .update({
        title: session.title,
        type: session.type,
        planned: session.planned,
        notes: session.notes,
        with_partner: session.with_partner,
        phase: session.phase,
      })
      .eq("user_id", user.id)
      .eq("date", session.date)
      .eq("origin", "generated")
      .eq("status", "planned");

    if (error) return { ok: false, message: error.message };
  }

  revalidatePath("/plan");
  revalidatePath("/today");
  revalidatePath("/progress");
  return { ok: true, replaced: updates.length };
}
