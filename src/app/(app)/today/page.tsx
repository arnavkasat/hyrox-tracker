import Link from "next/link";
import { AlertTriangle, ChevronRight } from "lucide-react";

import { CheckinRing } from "./checkin-ring";
import { CheckinSheet } from "./checkin-sheet";
import { Button } from "@/components/ui/button";
import { InsetGroup, InsetRow } from "@/components/ios/inset-list";
import { QuoteCard } from "@/components/ios/quote-card";
import { Screen } from "@/components/ios/screen";
import {
  getAppContext,
  getCheckinForDate,
  getPhotoForDate,
  getSessionForDate,
  hoursSinceSync,
} from "@/lib/data/queries";
import { diffDays, formatLongDate, isoWeekday } from "@/lib/date";
import { TOTAL_WEEKS } from "@/lib/plan/template";

const PHASE_LABEL: Record<string, string> = {
  base: "Base",
  build: "Build",
  peak: "Peak",
  taper: "Taper",
  race: "Race week",
};

/** Flag a stale Apple Health sync at this many hours. */
const SYNC_WARNING_HOURS = 36;

export default async function TodayPage() {
  const { supabase, user, settings, today } = await getAppContext();

  // The weekly photo rides along with Sunday's check-in.
  const isSunday = isoWeekday(today) === 7;

  const [session, checkin, photo] = await Promise.all([
    getSessionForDate(supabase, user.id, today),
    getCheckinForDate(supabase, user.id, today),
    isSunday ? getPhotoForDate(supabase, user.id, today) : Promise.resolve(null),
  ]);

  const daysToRace = diffDays(today, settings.race_date);
  const totalDays = diffDays(settings.training_start_date, settings.race_date);
  const elapsed = Math.max(0, totalDays - Math.max(daysToRace, 0));
  const progress = totalDays > 0 ? Math.min(100, (elapsed / totalDays) * 100) : 0;

  const sinceSync = hoursSinceSync(settings.last_sync_at);
  const syncStale = sinceSync === null || sinceSync > SYNC_WARNING_HOURS;

  return (
    <Screen title="Today" subtitle={formatLongDate(today)}>
      {/* ------------------------------------------------ race countdown -- */}
      <div className="surface rounded-2xl p-5">
        <div className="flex items-baseline gap-2">
          <span className="brand-text text-[60px] leading-none font-bold tracking-tight">
            {Math.max(daysToRace, 0)}
          </span>
          <span className="text-[17px] text-muted-foreground">
            {daysToRace === 1 ? "day to race" : "days to race"}
          </span>
        </div>

        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/10">
          <div className="brand-fill h-full rounded-full" style={{ width: `${progress}%` }} />
        </div>

        <div className="mt-2.5 flex items-center justify-between text-[13px] text-muted-foreground">
          <span>
            {session ? `Week ${session.week} of ${TOTAL_WEEKS}` : "Not started"}
            {session ? ` · ${PHASE_LABEL[session.phase] ?? session.phase}` : ""}
          </span>
          <span>{formatLongDate(settings.race_date)}</span>
        </div>
      </div>

      <QuoteCard date={today} />

      {/* --------------------------------------------- morning check-in -- */}
      <CheckinSheet
        date={today}
        existing={checkin}
        defaultWeight={Number(settings.body_weight_kg ?? 73)}
        photo={
          isSunday
            ? {
                userId: user.id,
                week: session?.week ?? null,
                existingPath: photo?.storage_path ?? null,
              }
            : undefined
        }
        trigger={
          <CheckinRing
            checkin={checkin}
            needsPhoto={isSunday}
            hasPhoto={Boolean(photo)}
            className="py-2"
          />
        }
      />

      {/* --------------------------------------------- today's session -- */}
      {session ? (
        <div className="surface rounded-2xl p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[13px] font-medium tracking-wide text-muted-foreground uppercase">
                Today&rsquo;s session
              </p>
              <h2 className="mt-1 text-[22px] font-semibold">{session.title}</h2>
            </div>
            {session.with_partner ? (
              <span className="shrink-0 rounded-full bg-primary/15 px-2.5 py-1 text-[11px] font-semibold text-primary">
                PARTNER
              </span>
            ) : null}
          </div>

          {session.planned.length > 0 ? (
            <ul className="mt-3 space-y-1.5">
              {session.planned.map((p, i) => (
                <li key={i} className="flex justify-between gap-3 text-[15px]">
                  <span className="min-w-0 truncate">{p.exercise}</span>
                  <span className="shrink-0 text-muted-foreground">
                    {p.kind === "run" ? p.reps : `${p.sets} × ${p.reps}`}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-[15px] text-muted-foreground">
              {session.notes ?? "Nothing scheduled. Rest up."}
            </p>
          )}

          {session.status === "completed" ? (
            <p className="mt-4 text-center text-[15px] font-medium text-primary">
              Completed
            </p>
          ) : session.type !== "rest" ? (
            <Button asChild variant="brand" size="ios" className="mt-4 w-full">
              <Link href="/train">
                {session.status === "in_progress" ? "Resume session" : "Start session"}
              </Link>
            </Button>
          ) : null}
        </div>
      ) : (
        <InsetGroup title="Today's session">
          <InsetRow
            label="Nothing planned"
            sublabel={`Training starts ${formatLongDate(settings.training_start_date)}.`}
          />
        </InsetGroup>
      )}

      {/* ------------------------------------------------- sync warning -- */}
      {syncStale ? (
        <div className="surface flex items-start gap-3 rounded-2xl p-4">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-alt" />
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-medium">
              {sinceSync === null
                ? "Health data has never synced"
                : `Last health sync ${Math.round(sinceSync)}h ago`}
            </p>
            <p className="mt-0.5 text-[13px] text-muted-foreground">
              Open Health Auto Export on your iPhone and run the automation.
            </p>
          </div>
        </div>
      ) : null}

      {/* ------------------------------------------------------- footer -- */}
      <InsetGroup>
        <form action="/auth/signout" method="post">
          <button
            type="submit"
            className="press flex min-h-[44px] w-full items-center justify-between px-4 py-2.5 text-[17px]"
          >
            <span>Sign out</span>
            <ChevronRight className="size-5 text-muted-foreground" />
          </button>
        </form>
      </InsetGroup>
    </Screen>
  );
}
