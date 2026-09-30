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

/** Records a photo that the browser has already uploaded to the bucket. */
export async function savePhoto(input: {
  date: string;
  week: number | null;
  storage_path: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  // The path always starts with the user's id — the storage policies depend
  // on it, so refuse anything that claims otherwise.
  if (!input.storage_path.startsWith(`${user.id}/`)) {
    throw new Error("Refusing to record a photo outside your own folder.");
  }

  const { error } = await supabase
    .from("photos")
    .upsert({ user_id: user.id, ...input }, { onConflict: "storage_path" });
  if (error) throw new Error(error.message);

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
