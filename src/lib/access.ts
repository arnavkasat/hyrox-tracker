/**
 * Who can get in, and whose data the automation is about.
 *
 * These started as one idea and had to be separated once a second person
 * needed to sign in. They are genuinely different questions:
 *
 *   ALLOWED_EMAILS  who may request a magic link and hold a session.
 *                   Everyone on this list gets their own account — row-level
 *                   security means they see their own plan and their own
 *                   data, never anyone else's.
 *
 *   OWNER_EMAIL     whose data the health sync writes to and whose week the
 *                   review job reads. There can only be one answer to that,
 *                   and it shouldn't change just because someone else was
 *                   added to the allow list.
 *
 * OWNER_EMAIL falls back to the first allowed address, so an install with
 * one person needs no extra configuration.
 */

function parseList(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}

/** Every address permitted to sign in. */
export function allowedEmails(): string[] {
  // ALLOWED_EMAIL (singular) is still read, so existing installs keep working.
  const list = parseList(process.env.ALLOWED_EMAILS);
  if (list.length > 0) return list;
  return parseList(process.env.ALLOWED_EMAIL);
}

export function isAllowed(email: string | null | undefined): boolean {
  if (!email) return false;
  return allowedEmails().includes(email.trim().toLowerCase());
}

/** The account the health sync and the weekly review belong to. */
export function ownerEmail(): string | null {
  const explicit = parseList(process.env.OWNER_EMAIL)[0];
  if (explicit) return explicit;
  return allowedEmails()[0] ?? null;
}
