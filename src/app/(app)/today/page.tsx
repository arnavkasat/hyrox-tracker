import Link from "next/link";
import { AlertTriangle, ChevronRight } from "lucide-react";

import { CheckinSheet } from "./checkin-sheet";
import { Button } from "@/components/ui/button";
import { InsetGroup, InsetRow } from "@/components/ios/inset-list";
import { Screen } from "@/components/ios/screen";
import {
  getAppContext,
  getCheckinForDate,
  getSessionForDate,
  hoursSinceSync,
} from "@/lib/data/queries";
import { diffDays, formatLongDate } from "@/lib/date";
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

  const [session, checkin] = await Promise.all([
    getSessionForDate(supabase, user.id, today),
    getCheckinForDate(supabase, user.id, today),
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
      <div className="rounded-2xl bg-card p-5">
        <div className="flex items-baseline gap-2">
          <span className="text-[56px] leading-none font-bold tracking-tight text-primary">
            {Math.max(daysToRace, 0)}
          </span>
          <span className="text-[17px] text-muted-foreground">
            {daysToRace === 1 ? "day to race" : "days to race"}
          </span>
        </div>

        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-secondary">
          <div className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} />
        </div>

        <div className="mt-2.5 flex items-center justify-between text-[13px] text-muted-foreground">
          <span>
            {session ? `Week ${session.week} of ${TOTAL_WEEKS}` : "Not started"}
            {session ? ` · ${PHASE_LABEL[session.phase] ?? session.phase}` : ""}
          </span>
          <span>{formatLongDate(settings.race_date)}</span>
        </div>
      </div>

      {/* --------------------------------------------- morning check-in -- */}
      {checkin ? (
        <InsetGroup title="Morning check-in">
          <InsetRow label="Weight" value={checkin.weight_kg ? `${checkin.weight_kg} kg` : "—"} />
          <InsetRow label="Energy" value={checkin.energy ? `${checkin.energy} / 5` : "—"} />
          <InsetRow label="Soreness" value={checkin.soreness ? `${checkin.soreness} / 5` : "—"} />
          {checkin.note ? <InsetRow label="Note" sublabel={checkin.note} /> : null}
          <InsetRow>
            <CheckinSheet
              date={today}
              existing={checkin}
              defaultWeight={Number(settings.body_weight_kg ?? 73)}
              trigger={
                <button className="text-[17px] text-primary active:opacity-60">Edit</button>
              }
            />
          </InsetRow>
        </InsetGroup>
      ) : (
        <div className="rounded-2xl bg-card p-5">
          <h2 className="text-[20px] font-semibold">Morning check-in</h2>
          <p className="mt-1 text-[15px] text-muted-foreground">
            Weight, energy and soreness. It feeds the weekly review.
          </p>
          <CheckinSheet
            date={today}
            existing={null}
            defaultWeight={Number(settings.body_weight_kg ?? 73)}
            trigger={
              <Button size="lg" className="mt-4 h-12 w-full text-[17px]">
                Check in
              </Button>
            }
          />
        </div>
      )}

      {/* --------------------------------------------- today's session -- */}
      {session ? (
        <div className="rounded-2xl bg-card p-5">
          <p className="text-[13px] font-medium tracking-wide text-muted-foreground uppercase">
            Today&rsquo;s session
          </p>
          <h2 className="mt-1 text-[22px] font-semibold">{session.title}</h2>

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

          {session.with_partner ? (
            <p className="mt-3 text-[13px] text-primary">With partner</p>
          ) : null}

          {session.type !== "rest" ? (
            <Button asChild size="lg" className="mt-4 h-12 w-full text-[17px]">
              <Link href="/train">
                {session.status === "in_progress" ? "Resume session" : "Start session"}
              </Link>
            </Button>
          ) : null}

          {session.status === "completed" ? (
            <p className="mt-3 text-center text-[15px] text-primary">Completed</p>
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
        <div className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-primary" />
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
            className="flex min-h-[44px] w-full items-center justify-between px-4 py-2.5 text-[17px] active:opacity-60"
          >
            <span>Sign out</span>
            <ChevronRight className="size-5 text-muted-foreground" />
          </button>
        </form>
      </InsetGroup>
    </Screen>
  );
}
