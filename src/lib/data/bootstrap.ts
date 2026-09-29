import type { SupabaseClient } from "@supabase/supabase-js";

import { DEFAULT_SETTINGS } from "@/lib/plan/defaults";
import { generatePlan } from "@/lib/plan/generate";
import type { Settings } from "@/lib/supabase/types";

/**
 * Makes sure the signed-in user has a settings row and a generated plan.
 * Safe to call on every request: both steps are no-ops once seeded.
 */
export async function ensureBootstrapped(
  supabase: SupabaseClient,
  userId: string,
): Promise<Settings> {
  const { data: existing, error } = await supabase
    .from("settings")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;

  let settings = existing as Settings | null;

  if (!settings) {
    const { data, error: insertError } = await supabase
      .from("settings")
      .insert({ user_id: userId, ...DEFAULT_SETTINGS })
      .select()
      .single();

    if (insertError) throw insertError;
    settings = data as Settings;
  }

  await ensurePlan(supabase, userId, settings);
  return settings;
}

/** Generates the plan the first time only. */
async function ensurePlan(
  supabase: SupabaseClient,
  userId: string,
  settings: Settings,
): Promise<void> {
  const { count, error } = await supabase
    .from("plan_sessions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  if (error) throw error;
  if (count && count > 0) return;

  await seedPlan(supabase, userId, settings);
}

/**
 * Writes the generated plan. Existing dates are left alone, so re-running
 * this never destroys logged work.
 */
export async function seedPlan(
  supabase: SupabaseClient,
  userId: string,
  settings: Settings,
): Promise<number> {
  const sessions = generatePlan({
    raceDate: settings.race_date,
    trainingStartDate: settings.training_start_date,
  });

  const { error } = await supabase
    .from("plan_sessions")
    .upsert(
      sessions.map((s) => ({ user_id: userId, ...s })),
      { onConflict: "user_id,date", ignoreDuplicates: true },
    );

  if (error) throw error;
  return sessions.length;
}
