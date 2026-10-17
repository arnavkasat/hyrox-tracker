import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";

import { createAdminClient } from "@/lib/supabase/admin";
import { addDays, today as todayIn, type ISODate } from "@/lib/date";
import { collectWeekStats } from "@/lib/review/stats";
import { buildProposals, upcomingWindow, type ProposedChange } from "@/lib/review/rules";
import { writeReview } from "@/lib/review/claude";
import { validatePatches } from "@/lib/plan/patch";
import type { PlanSession, Settings } from "@/lib/supabase/types";

/**
 * The weekly review job.
 *
 * Vercel's Hobby plan fires crons once a day and doesn't promise a minute,
 * so this runs daily and does nothing unless it's Sunday evening in the
 * athlete's own timezone. That also makes it safe to fire twice: the week
 * is keyed on its Monday, and the row is upserted.
 *
 * Order matters. The rules decide what changes, the model writes about
 * them, and `validatePatches` gets the last word — so a rule with a bug
 * or a model that ignores its instructions still can't push a change past
 * the volume cap or leave a week with no rest day.
 */

export const maxDuration = 120;

/** Hour, in the athlete's timezone, at or after which Sunday's review runs. */
const RUN_AFTER_HOUR = 18;

function authorize(request: NextRequest): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;

  const header = request.headers.get("authorization")?.trim() ?? "";
  const scheme = /^bearer\s+(.+)$/i.exec(header);
  const provided = scheme ? scheme[1].trim() : "";
  if (!provided) return false;

  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Local weekday (1 = Monday) and hour for a timezone. */
function localNow(timeZone: string): { weekday: number; hour: number } {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    weekday: "short",
    hour: "numeric",
    hour12: false,
  }).formatToParts(new Date());

  const names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const weekday = names.indexOf(parts.find((p) => p.type === "weekday")?.value ?? "") + 1;
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  return { weekday, hour };
}

export async function GET(request: NextRequest) {
  if (!authorize(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const force = request.nextUrl.searchParams.get("force") === "1";
  const supabase = createAdminClient();

  const { data: settingsRow, error: settingsError } = await supabase
    .from("settings")
    .select("*")
    .limit(1)
    .maybeSingle();

  if (settingsError) {
    return NextResponse.json({ error: settingsError.message }, { status: 500 });
  }
  if (!settingsRow) {
    return NextResponse.json({ skipped: "No settings row yet." });
  }

  const settings = settingsRow as Settings;
  const userId = settings.user_id;
  const { weekday, hour } = localNow(settings.timezone);

  if (!force && !(weekday === 7 && hour >= RUN_AFTER_HOUR)) {
    return NextResponse.json({
      skipped: "Not Sunday evening where you are.",
      localWeekday: weekday,
      localHour: hour,
    });
  }

  // The week just finished: Monday through the Sunday we're standing on.
  const today = todayIn(settings.timezone);
  const weekEnd: ISODate = weekday === 7 ? today : addDays(today, -((weekday % 7) || 7));

  const stats = await collectWeekStats(supabase, userId, settings, weekEnd);
  if (!stats) {
    return NextResponse.json({ skipped: "No plan sessions in that week." });
  }

  const previous = await collectWeekStats(
    supabase,
    userId,
    settings,
    addDays(stats.weekStart, -1),
  );

  // --------------------------------------------------- what may change --
  const { from, to } = upcomingWindow(stats.weekEnd);
  const { data: upcomingRows, error: upcomingError } = await supabase
    .from("plan_sessions")
    .select("*")
    .eq("user_id", userId)
    .gte("date", from)
    .lte("date", to)
    .order("date");

  if (upcomingError) {
    return NextResponse.json({ error: upcomingError.message }, { status: 500 });
  }
  const upcoming = (upcomingRows ?? []) as PlanSession[];

  const proposals = buildProposals({ stats, previousWeek: previous, upcoming, settings });

  // ------------------------------------------- guardrails, before the model --
  // Dropping an invalid proposal here means the model is never asked to
  // justify a change that could never be applied.
  const accepted: ProposedChange[] = [];
  const rejected: { id: string; reason: string }[] = [];

  for (const proposal of proposals) {
    if (proposal.patches.length === 0) {
      accepted.push(proposal);
      continue;
    }
    const result = validatePatches(proposal.patches, upcoming, "review", settings.race_date);
    if (result.ok) accepted.push(proposal);
    else rejected.push({ id: proposal.id, reason: result.issues[0]?.message ?? "invalid" });
  }

  // ------------------------------------------------------------ writing --
  let text;
  try {
    text = await writeReview(stats, accepted);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not write the review." },
      { status: 502 },
    );
  }

  const notes = new Map(text.change_notes.map((n) => [n.id, n.note]));

  const { error: writeError } = await supabase.from("weekly_reviews").upsert(
    {
      user_id: userId,
      week_start: stats.weekStart,
      week: stats.week,
      summary: `${text.headline}\n\n${text.summary}`,
      stats: stats as unknown as Record<string, unknown>,
      proposed_changes: accepted.map((c) => ({
        id: c.id,
        kind: c.kind,
        title: c.title,
        reason: c.reason,
        note: notes.get(c.id) ?? null,
        patches: c.patches,
        settings: c.settings ?? null,
      })),
      decisions: [],
      status: "pending",
    },
    { onConflict: "user_id,week_start" },
  );

  if (writeError) {
    return NextResponse.json({ error: writeError.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    week: stats.week,
    weekStart: stats.weekStart,
    proposed: accepted.length,
    rejectedByGuardrails: rejected,
  });
}
