"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getSessionsInWeeks } from "@/lib/data/queries";
import { validatePatches, type SessionPatch } from "@/lib/plan/patch";
import type { PlanSession, Settings, WeeklyReview } from "@/lib/supabase/types";

export type StoredChange = {
  id: string;
  kind: string;
  title: string;
  reason: string;
  note: string | null;
  patches: SessionPatch[];
  settings: Record<string, number> | null;
};

export type Decision = { id: string; decision: "accepted" | "rejected"; at: string };

export type DecideResult = { ok: true } | { ok: false; message: string };

/**
 * Accept or reject one proposed change.
 *
 * Accepting re-validates before writing. The cron already checked, but the
 * plan may have moved since — you might have edited one of those days
 * yourself — and the check is cheap.
 */
export async function decide(
  weekStart: string,
  changeId: string,
  decision: "accepted" | "rejected",
): Promise<DecideResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Not signed in." };

  const [{ data: reviewRow, error: reviewError }, { data: settingsRow }] = await Promise.all([
    supabase
      .from("weekly_reviews")
      .select("*")
      .eq("user_id", user.id)
      .eq("week_start", weekStart)
      .maybeSingle(),
    supabase.from("settings").select("*").eq("user_id", user.id).single(),
  ]);

  if (reviewError) return { ok: false, message: reviewError.message };
  if (!reviewRow) return { ok: false, message: "That review no longer exists." };

  const review = reviewRow as WeeklyReview;
  const settings = settingsRow as Settings;
  const changes = review.proposed_changes as unknown as StoredChange[];
  const change = changes.find((c) => c.id === changeId);
  if (!change) return { ok: false, message: "That change is not part of this review." };

  const decisions = (review.decisions as unknown as Decision[]).filter(
    (d) => d.id !== changeId,
  );

  if (decision === "accepted") {
    if (change.patches.length > 0) {
      const dates = change.patches.map((p) => p.date);

      const { data: targeted } = await supabase
        .from("plan_sessions")
        .select("week")
        .eq("user_id", user.id)
        .in("date", dates);

      const weeks = [...new Set((targeted ?? []).map((r) => r.week as number))];
      const existing: PlanSession[] = await getSessionsInWeeks(supabase, user.id, weeks);

      const result = validatePatches(change.patches, existing, "review", settings.race_date);
      if (!result.ok) {
        return { ok: false, message: result.issues[0]?.message ?? "No longer valid." };
      }

      for (const patch of result.patches) {
        const { date, ...fields } = patch;
        const { error } = await supabase
          .from("plan_sessions")
          .update({ ...fields, origin: "review" })
          .eq("user_id", user.id)
          .eq("date", date);

        if (error) return { ok: false, message: error.message };
      }
    }

    if (change.settings) {
      const { error } = await supabase
        .from("settings")
        .update(change.settings)
        .eq("user_id", user.id);
      if (error) return { ok: false, message: error.message };
    }
  }

  decisions.push({ id: changeId, decision, at: new Date().toISOString() });

  const allDecided = changes.every((c) => decisions.some((d) => d.id === c.id));
  const anyAccepted = decisions.some((d) => d.decision === "accepted");

  const { error } = await supabase
    .from("weekly_reviews")
    .update({
      decisions,
      status: !allDecided ? "partial" : anyAccepted ? "applied" : "rejected",
      applied_at: anyAccepted ? new Date().toISOString() : null,
    })
    .eq("user_id", user.id)
    .eq("week_start", weekStart);

  if (error) return { ok: false, message: error.message };

  revalidatePath("/review");
  revalidatePath("/plan");
  revalidatePath("/today");
  return { ok: true };
}
