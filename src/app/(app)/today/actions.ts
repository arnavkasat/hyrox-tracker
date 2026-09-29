"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type CheckinInput = {
  date: string;
  weight_kg: number | null;
  energy: number | null;
  soreness: number | null;
  note: string | null;
};

export async function saveCheckin(input: CheckinInput) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  const { error } = await supabase
    .from("daily_checkins")
    .upsert({ user_id: user.id, ...input }, { onConflict: "user_id,date" });
  if (error) throw new Error(error.message);

  // Keep the profile weight current so targets and charts agree.
  if (input.weight_kg !== null) {
    await supabase
      .from("settings")
      .update({ body_weight_kg: input.weight_kg })
      .eq("user_id", user.id);
  }

  revalidatePath("/today");
  revalidatePath("/progress");
}

/** Corrects the seeded timezone once we can see the device's own. */
export async function syncTimezone(timezone: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("settings").update({ timezone }).eq("user_id", user.id);
  revalidatePath("/today");
}
