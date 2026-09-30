import Link from "next/link";

import { WorkoutView } from "./workout-view";
import { Button } from "@/components/ui/button";
import { InsetGroup, InsetRow } from "@/components/ios/inset-list";
import { Screen } from "@/components/ios/screen";
import {
  getAppContext,
  getLastPerformances,
  getLogsForSession,
  getSessionForDate,
} from "@/lib/data/queries";
import { formatLongDate } from "@/lib/date";
import { buildSetRows } from "@/lib/plan/sets";

export default async function TrainPage(props: PageProps<"/train">) {
  const { supabase, user, today } = await getAppContext();

  // ?date=YYYY-MM-DD lets you back-fill a session you forgot to log.
  const { date } = await props.searchParams;
  const targetDate = typeof date === "string" ? date : today;

  // You can log today or any day behind you, never one in front. The
  // database enforces this too, so a hand-typed URL can't get around it.
  if (targetDate > today) {
    return (
      <Screen title="Train" subtitle={formatLongDate(targetDate)}>
        <InsetGroup footer="Come back on the day and it'll be waiting.">
          <InsetRow
            label="Not yet"
            sublabel="You can't log a session before it happens."
          />
        </InsetGroup>
        <Button asChild variant="glass" size="ios" className="w-full">
          <Link href="/plan">Back to the plan</Link>
        </Button>
      </Screen>
    );
  }

  const session = await getSessionForDate(supabase, user.id, targetDate);

  if (!session) {
    return (
      <Screen title="Train" subtitle={formatLongDate(targetDate)}>
        <InsetGroup>
          <InsetRow label="Nothing planned" sublabel="No session exists for this date." />
        </InsetGroup>
        <Button asChild variant="glass" size="ios" className="w-full">
          <Link href="/today">Back to today</Link>
        </Button>
      </Screen>
    );
  }

  if (session.planned.length === 0) {
    return (
      <Screen title={session.title} subtitle={formatLongDate(targetDate)}>
        <div className="surface rounded-2xl p-5">
          <p className="text-[17px]">
            {session.notes ?? "Nothing to log today. Rest is part of the plan."}
          </p>
        </div>
        <Button asChild variant="glass" size="ios" className="w-full">
          <Link href="/today">Back to today</Link>
        </Button>
      </Screen>
    );
  }

  const logs = await getLogsForSession(supabase, session.id);
  const lastPerformances = await getLastPerformances(
    supabase,
    user.id,
    session.planned.map((p) => p.exercise),
    session.id,
  );

  const rows = buildSetRows(session.planned, logs, lastPerformances);

  return (
    <Screen
      title={session.title}
      subtitle={`Week ${session.week} · ${formatLongDate(targetDate)}`}
    >
      <WorkoutView session={session} initialRows={rows} />
    </Screen>
  );
}
