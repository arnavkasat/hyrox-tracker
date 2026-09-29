"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function requireUserId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");
  return { supabase, userId: user.id };
}

export type SetLogInput = {
  session_id: string;
  exercise: string;
  exercise_order: number;
  set_number: number;
  weight_kg: number | null;
  reps: number | null;
  completed: boolean;
};

export async function upsertSetLog(input: SetLogInput) {
  const { supabase, userId } = await requireUserId();

  const { error } = await supabase.from("exercise_logs").upsert(
    {
      user_id: userId,
      ...input,
      completed_at: input.completed ? new Date().toISOString() : null,
    },
    { onConflict: "session_id,exercise,set_number" },
  );

  if (error) throw new Error(error.message);
}

export async function startSession(sessionId: string) {
  const { supabase } = await requireUserId();

  const { error } = await supabase
    .from("plan_sessions")
    .update({ status: "in_progress", started_at: new Date().toISOString() })
    .eq("id", sessionId)
    .eq("status", "planned");

  if (error) throw new Error(error.message);
  revalidatePath("/today");
  revalidatePath("/train");
}

export async function finishSession(sessionId: string) {
  const { supabase } = await requireUserId();

  const { error } = await supabase
    .from("plan_sessions")
    .update({ status: "completed", completed_at: new Date().toISOString() })
    .eq("id", sessionId);

  if (error) throw new Error(error.message);
  revalidatePath("/today");
  revalidatePath("/train");
  revalidatePath("/progress");
}

export async function setWithPartner(sessionId: string, withPartner: boolean) {
  const { supabase } = await requireUserId();

  const { error } = await supabase
    .from("plan_sessions")
    .update({ with_partner: withPartner })
    .eq("id", sessionId);

  if (error) throw new Error(error.message);
  revalidatePath("/today");
}
