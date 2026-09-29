"use server";

import { createClient } from "@/lib/supabase/server";

export type LoginState = {
  status: "idle" | "sent" | "error";
  message?: string;
};

/**
 * Sends the magic link, but only ever to ALLOWED_EMAIL. Row-level security
 * is the real lock; this just stops the mailbox being used as a signup form.
 */
export async function requestMagicLink(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const allowed = process.env.ALLOWED_EMAIL?.trim().toLowerCase();

  if (!allowed) {
    return { status: "error", message: "ALLOWED_EMAIL is not set on the server." };
  }
  if (email !== allowed) {
    return { status: "error", message: "That address can't sign in to this app." };
  }

  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${origin}/auth/callback` },
  });

  if (error) return { status: "error", message: error.message };
  return { status: "sent" };
}
