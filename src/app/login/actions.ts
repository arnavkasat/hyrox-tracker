"use server";

import { createClient } from "@/lib/supabase/server";
import { getSiteOrigin } from "@/lib/site-url";
import { allowedEmails, isAllowed } from "@/lib/access";

export type LoginState = {
  status: "idle" | "sent" | "error";
  message?: string;
};

/**
 * Sends the magic link, but only to an address on the allow list. Row-level
 * security is the real lock; this just stops the mailbox being used as a
 * signup form.
 */
export async function requestMagicLink(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (allowedEmails().length === 0) {
    return { status: "error", message: "ALLOWED_EMAILS is not set on the server." };
  }
  if (!isAllowed(email)) {
    return { status: "error", message: "That address can't sign in to this app." };
  }

  const origin = await getSiteOrigin();
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${origin}/auth/callback` },
  });

  if (error) return { status: "error", message: error.message };
  return { status: "sent" };
}
