import { headers } from "next/headers";

/**
 * The origin magic links should come back to.
 *
 * Resolved rather than configured, so the first deploy doesn't need a URL it
 * can't know yet, and preview deployments work without extra setup:
 *
 *   1. NEXT_PUBLIC_SITE_URL, if you've pinned one
 *   2. Vercel's own production domain
 *   3. the origin of the request being served
 *   4. localhost, for `next dev`
 *
 * Step 3 trusts a request header, which is normally a redirect risk. It's
 * safe here only because Supabase checks the address against its own
 * redirect allowlist and refuses anything not on it.
 */
export async function getSiteOrigin(): Promise<string> {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");

  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercel) return `https://${vercel}`;

  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  if (host) {
    const protocol = headerList.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
    return `${protocol}://${host}`;
  }

  return "http://localhost:3000";
}
