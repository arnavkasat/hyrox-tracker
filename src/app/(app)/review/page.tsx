import { Sparkles } from "lucide-react";

import { ChangeCard } from "./change-card";
import type { Decision, StoredChange } from "./actions";
import { InsetGroup, InsetRow } from "@/components/ios/inset-list";
import { Screen } from "@/components/ios/screen";
import { StatRow } from "../today/stat-row";
import { getAppContext } from "@/lib/data/queries";
import { formatDayMonth } from "@/lib/date";
import type { WeeklyReview } from "@/lib/supabase/types";
import type { WeekStats } from "@/lib/review/stats";

export default async function ReviewPage() {
  const { supabase, user } = await getAppContext();

  const { data, error } = await supabase
    .from("weekly_reviews")
    .select("*")
    .eq("user_id", user.id)
    .order("week_start", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;

  const review = data as WeeklyReview | null;

  if (!review) {
    return (
      <Screen title="Review" subtitle="Weekly summary and plan changes">
        <div className="surface rounded-2xl p-6 text-center">
          <Sparkles className="mx-auto size-7 text-primary" />
          <p className="mt-3 text-[17px] font-medium">Nothing to review yet</p>
          <p className="mt-1.5 text-[15px] leading-snug text-muted-foreground">
            A review is written on Sunday evening, covering the week you just
            finished. It reads your sessions, check-ins and health data, then
            proposes changes you can accept or skip.
          </p>
        </div>
      </Screen>
    );
  }

  const changes = review.proposed_changes as unknown as StoredChange[];
  const decisions = review.decisions as unknown as Decision[];
  const stats = review.stats as unknown as Partial<WeekStats>;

  const [headline, ...rest] = (review.summary ?? "").split("\n\n");
  const undecided = changes.filter((c) => !decisions.some((d) => d.id === c.id));

  return (
    <Screen
      title="Review"
      subtitle={`Week ${review.week} · ${formatDayMonth(review.week_start)}`}
    >
      {/* ------------------------------------------------------ summary -- */}
      <div className="surface rounded-2xl p-5">
        <p className="text-[19px] leading-snug font-semibold text-balance">{headline}</p>
        {rest.length > 0 ? (
          <div className="mt-3 space-y-2.5">
            {rest.map((paragraph, i) => (
              <p key={i} className="text-[15px] leading-relaxed text-muted-foreground">
                {paragraph}
              </p>
            ))}
          </div>
        ) : null}
      </div>

      {/* -------------------------------------------------------- stats -- */}
      {stats.sessionsPlanned != null ? (
        <StatRow
          stats={[
            {
              label: "Sessions",
              value: `${stats.sessionsCompleted ?? 0}/${stats.sessionsPlanned}`,
              sub: "completed",
              accent: true,
            },
            {
              label: "Sets",
              value: String(stats.setsCompleted ?? 0),
              sub: "logged",
            },
            {
              label: "Readiness",
              value: stats.averageReadiness != null ? String(stats.averageReadiness) : "—",
              sub: "average",
            },
          ]}
        />
      ) : null}

      {/* ------------------------------------------------------ changes -- */}
      <section className="space-y-3">
        <h2 className="px-4 text-[13px] font-medium tracking-wide text-muted-foreground uppercase">
          {changes.length === 0
            ? "Proposed changes"
            : undecided.length > 0
              ? `${undecided.length} to decide`
              : "All decided"}
        </h2>

        {changes.length === 0 ? (
          <InsetGroup footer="Nothing in the week's numbers triggered a rule. Carry on as planned.">
            <InsetRow label="No changes proposed" />
          </InsetGroup>
        ) : (
          changes.map((change) => (
            <ChangeCard
              key={change.id}
              weekStart={review.week_start}
              change={change}
              decision={decisions.find((d) => d.id === change.id)}
            />
          ))
        )}
      </section>

      <p className="px-4 pb-2 text-center text-[12px] leading-snug text-muted-foreground/70">
        Changes are decided by fixed rules from your own numbers, then checked
        against guardrails before they can touch your plan: the race date never
        moves, every week keeps a rest day, and no week&rsquo;s volume shifts by
        more than 15%.
      </p>
    </Screen>
  );
}
