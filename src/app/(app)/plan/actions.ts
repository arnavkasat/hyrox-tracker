"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getSessionsInWeeks } from "@/lib/data/queries";
import { validatePatches, type Issue, type SessionPatch } from "@/lib/plan/patch";
import { generatePlan } from "@/lib/plan/generate";
import type { PlanSession, Settings } from "@/lib/supabase/types";

export type ApplyResult =
  | { ok: true; warnings: Issue[] }
  | { ok: false; issues: Issue[] };

async function context() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  const { data, error } = await supabase
    .from("settings")
    .select("*")
    .eq("user_id", user.id)
    .single();
  if (error) throw new Error(error.message);

  return { supabase, userId: user.id, settings: data as Settings };
}

/**
 * The only path from a UI into plan_sessions. The block editor calls this
 * today; the AI chat and the weekly review will call it with the same shape.
 */
export async function applyPatches(patches: SessionPatch[]): Promise<ApplyResult> {
  if (patches.length === 0) return { ok: true, warnings: [] };

  const { supabase, userId, settings } = await context();

  // Pull the full weeks the patches touch, so week-level rules can see them.
  const { data: targeted, error: targetError } = await supabase
    .from("plan_sessions")
    .select("week")
    .eq("user_id", userId)
    .in("date", patches.map((p) => p.date));

  if (targetError) return { ok: false, issues: [{ date: null, message: targetError.message }] };

  const weeks = [...new Set((targeted ?? []).map((row) => row.week as number))];
  const existing: PlanSession[] = await getSessionsInWeeks(supabase, userId, weeks);

  const result = validatePatches(patches, existing, "user", settings.race_date);
  if (!result.ok) return { ok: false, issues: result.issues };

  for (const patch of result.patches) {
    const { date, ...fields } = patch;
    const { error } = await supabase
      .from("plan_sessions")
      .update({ ...fields, origin: "user" })
      .eq("user_id", userId)
      .eq("date", date);

    if (error) return { ok: false, issues: [{ date, message: error.message }] };
  }

  revalidatePath("/plan");
  revalidatePath("/today");
  revalidatePath("/train");
  return { ok: true, warnings: result.warnings };
}

/** Puts one day back to whatever the template says it should be. */
export async function resetDayToTemplate(date: string): Promise<ApplyResult> {
  const { supabase, userId, settings } = await context();

  const generated = generatePlan({
    raceDate: settings.race_date,
    trainingStartDate: settings.training_start_date,
  }).find((s) => s.date === date);

  if (!generated) {
    return { ok: false, issues: [{ date, message: "That day isn't part of the plan." }] };
  }

  const { error } = await supabase
    .from("plan_sessions")
    .update({
      title: generated.title,
      type: generated.type,
      planned: generated.planned,
      notes: generated.notes,
      with_partner: generated.with_partner,
      origin: "generated",
    })
    .eq("user_id", userId)
    .eq("date", date)
    .neq("status", "completed");

  if (error) return { ok: false, issues: [{ date, message: error.message }] };

  revalidatePath("/plan");
  revalidatePath("/today");
  revalidatePath("/train");
  return { ok: true, warnings: [] };
}
