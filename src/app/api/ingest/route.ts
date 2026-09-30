import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";

import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeIngest, type MetricFields } from "@/lib/health/parse";
import type { ISODate } from "@/lib/date";

/**
 * Health Auto Export posts here on a schedule from the iPhone.
 *
 * Authenticated by a bearer token rather than a session, because there's no
 * browser involved — which is why it writes with the service-role client
 * and why proxy.ts lets this path through unauthenticated.
 *
 * Idempotent by construction: metrics key on (user, date) and workouts on
 * (user, start, type), so re-sending the same window changes nothing. The
 * app re-sends overlapping windows constantly, so this matters.
 */

/** Health Auto Export will happily post a month of samples at once. */
export const maxDuration = 60;

const METRIC_COLUMNS = [
  "resting_hr",
  "hrv_ms",
  "sleep_hours",
  "calories",
  "protein_g",
  "steps",
] as const satisfies readonly (keyof MetricFields)[];

type AuthResult = { ok: true } | { ok: false; status: number; error: string };

function authorize(request: NextRequest): AuthResult {
  const expected = process.env.INGEST_TOKEN;
  if (!expected) {
    return { ok: false, status: 503, error: "INGEST_TOKEN is not configured on the server." };
  }

  const header = request.headers.get("authorization") ?? "";
  const provided = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!provided) return { ok: false, status: 401, error: "Missing bearer token." };

  // Constant-time compare; the length check short-circuits, which only
  // reveals the length, not the contents.
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  const match = a.length === b.length && timingSafeEqual(a, b);

  return match ? { ok: true } : { ok: false, status: 401, error: "Invalid token." };
}

/** The single owner of this install, resolved from ALLOWED_EMAIL. */
async function resolveUserId(
  supabase: ReturnType<typeof createAdminClient>,
): Promise<string | null> {
  const allowed = process.env.ALLOWED_EMAIL?.trim().toLowerCase();
  if (!allowed) return null;

  const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (error) throw new Error(error.message);

  return data.users.find((u) => u.email?.toLowerCase() === allowed)?.id ?? null;
}

export async function POST(request: NextRequest) {
  const auth = authorize(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body was not valid JSON." }, { status: 400 });
  }

  const { metrics, workouts, ignored } = normalizeIngest(body);

  const supabase = createAdminClient();

  let userId: string | null;
  try {
    userId = await resolveUserId(supabase);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not resolve the user." },
      { status: 500 },
    );
  }

  if (!userId) {
    return NextResponse.json(
      { error: "No account matches ALLOWED_EMAIL. Sign in once before syncing." },
      { status: 409 },
    );
  }

  // ------------------------------------------------------------ metrics --
  // Each sync carries only the metrics you enabled, so a partial payload
  // must not blank the columns it doesn't mention. Read what's there,
  // merge on top, write the whole row back.
  let metricsWritten = 0;

  if (metrics.size > 0) {
    const dates = [...metrics.keys()].sort();

    const { data: existingRows, error: readError } = await supabase
      .from("health_metrics")
      .select("date, resting_hr, hrv_ms, sleep_hours, calories, protein_g, steps")
      .eq("user_id", userId)
      .in("date", dates);

    if (readError) {
      return NextResponse.json({ error: readError.message }, { status: 500 });
    }

    const existing = new Map((existingRows ?? []).map((row) => [row.date as ISODate, row]));

    const rows = dates.map((date) => {
      const previous = existing.get(date);
      const incoming = metrics.get(date) ?? {};

      const row: Record<string, unknown> = { user_id: userId, date };
      for (const column of METRIC_COLUMNS) {
        row[column] = incoming[column] ?? previous?.[column] ?? null;
      }
      return row;
    });

    const { error: writeError } = await supabase
      .from("health_metrics")
      .upsert(rows, { onConflict: "user_id,date" });

    if (writeError) {
      return NextResponse.json({ error: writeError.message }, { status: 500 });
    }
    metricsWritten = rows.length;
  }

  // ----------------------------------------------------------- workouts --
  let workoutsWritten = 0;

  if (workouts.length > 0) {
    // The same workout can appear twice in one payload; last one wins.
    const deduped = new Map(
      workouts.map((w) => [
        `${w.started_at}|${w.type}`,
        { user_id: userId, ...w, source: "health" },
      ]),
    );

    const { error } = await supabase
      .from("workouts")
      .upsert([...deduped.values()], { onConflict: "user_id,started_at,type" });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    workoutsWritten = deduped.size;
  }

  // -------------------------------------------------------- bookkeeping --
  const syncedAt = new Date().toISOString();
  await supabase.from("settings").update({ last_sync_at: syncedAt }).eq("user_id", userId);

  return NextResponse.json({
    ok: true,
    synced_at: syncedAt,
    days: metricsWritten,
    workouts: workoutsWritten,
    // Surfaced so you can see what you enabled that we don't store yet.
    ignored_metrics: ignored,
  });
}

/** A GET with the same token, so the setup can be checked from a browser. */
export async function GET(request: NextRequest) {
  const auth = authorize(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const supabase = createAdminClient();
  const userId = await resolveUserId(supabase);
  if (!userId) {
    return NextResponse.json(
      { ok: false, error: "No account matches ALLOWED_EMAIL." },
      { status: 409 },
    );
  }

  const { data } = await supabase
    .from("settings")
    .select("last_sync_at")
    .eq("user_id", userId)
    .maybeSingle();

  return NextResponse.json({ ok: true, last_sync_at: data?.last_sync_at ?? null });
}
