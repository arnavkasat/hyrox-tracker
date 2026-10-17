import {
  ConsistencyChart,
  HrvChart,
  PaceChart,
  ReadinessChart,
  RestingHrChart,
  SleepChart,
  StepsChart,
  VolumeChart,
  WeightChart,
} from "./charts";
import { ChartCard } from "./card";
import { StatRow } from "../today/stat-row";
import { Screen } from "@/components/ios/screen";
import { getAppContext } from "@/lib/data/queries";
import { getProgressData } from "@/lib/data/progress";
import { BENCHMARK_TARGETS } from "@/lib/plan/defaults";
import { formatPace } from "@/lib/date";
import { cn } from "@/lib/utils";

export default async function ProgressPage() {
  const { supabase, user, settings, today } = await getAppContext();
  const data = await getProgressData(supabase, user.id, today);

  const weightPoints = data.weight.filter((p) => p.weight != null);

  // Each health chart only earns its place once there's something to draw.
  const has = (key: "restingHr" | "hrv" | "sleepHours" | "steps") =>
    data.health.filter((h) => h[key] != null).length;
  const completionRate =
    data.totalPlannedToDate > 0
      ? Math.round((data.totalCompleted / data.totalPlannedToDate) * 100)
      : null;

  // The most recent value recorded for each benchmark.
  const latest = new Map<string, number>();
  for (const b of data.benchmarks) latest.set(b.name, Number(b.value));

  return (
    <Screen title="Progress" subtitle="Last twelve weeks">
      <StatRow
        stats={[
          {
            label: "Weight",
            value:
              data.latestAverageWeight != null
                ? data.latestAverageWeight.toFixed(1)
                : "—",
            sub: "kg, 7-day avg",
          },
          {
            label: "Sessions",
            value: String(data.totalCompleted),
            sub: completionRate != null ? `${completionRate}% of planned` : "none yet",
            accent: true,
          },
          {
            label: "Readiness",
            value: data.averageReadiness != null ? String(data.averageReadiness) : "—",
            sub: "14-day avg",
          },
        ]}
      />

      <ChartCard
        title="Body weight"
        caption="Dots are daily check-ins; the line is the 7-day average."
        empty={
          weightPoints.length < 2
            ? "Check in on a couple of mornings and the trend starts here."
            : undefined
        }
      >
        <WeightChart data={data.weight} />
      </ChartCard>

      <ChartCard
        title="Training volume"
        caption="Completed sets per week."
        empty={
          data.weeks.every((w) => w.sets === 0)
            ? "Log a session and your weekly volume shows up here."
            : undefined
        }
      >
        <VolumeChart data={data.weeks} />
      </ChartCard>

      <ChartCard
        title="Consistency"
        caption="Share of each week's planned sessions you finished. Rest days aren't counted."
        empty={data.weeks.length === 0 ? "Nothing planned has come due yet." : undefined}
      >
        <ConsistencyChart data={data.weeks} />
      </ChartCard>

      <ChartCard
        title="Readiness"
        caption={
          data.hrvBaseline != null
            ? "Blends your check-in with last night's sleep and HRV. Higher is fresher."
            : "From your energy and soreness each morning. Sleep and HRV join in once there's enough history."
        }
        empty={
          data.readiness.filter((r) => r.score != null).length < 2
            ? "Two mornings of check-ins and this fills in."
            : undefined
        }
      >
        <ReadinessChart data={data.readiness} />
      </ChartCard>

      {/* ------------------------------------------------------- health -- */}
      <ChartCard
        title="Sleep"
        caption="Time asleep, not time in bed."
        empty={has("sleepHours") === 0 ? "Wear your watch overnight and this fills in." : undefined}
      >
        <SleepChart data={data.health} />
      </ChartCard>

      <ChartCard
        title="Resting heart rate"
        caption="Axis is flipped so up is better. A climb over several days usually means fatigue."
        empty={
          has("restingHr") < 2
            ? "Needs a couple of days of watch data."
            : undefined
        }
      >
        <RestingHrChart data={data.health} />
      </ChartCard>

      <ChartCard
        title="Heart rate variability"
        caption={
          data.hrvBaseline != null
            ? `Your baseline is ${Math.round(data.hrvBaseline)} ms. Higher than that is a good sign.`
            : "Higher is generally better. A personal baseline needs about five readings."
        }
        empty={has("hrv") < 2 ? "Needs a couple of days of watch data." : undefined}
      >
        <HrvChart data={data.health} />
      </ChartCard>

      <ChartCard
        title="Steps"
        caption="Everything you do outside training still costs you something."
        empty={has("steps") === 0 ? "Arrives with the Apple Health sync." : undefined}
      >
        <StepsChart data={data.health} />
      </ChartCard>

      <ChartCard
        title="Run pace"
        caption="Every recorded run. Higher is faster."
        empty={
          data.paces.length === 0
            ? "No runs yet. Workouts need their own Health Auto Export automation — Data Type set to Workouts, not Health Metrics."
            : undefined
        }
      >
        <PaceChart data={data.paces} />
      </ChartCard>

      {/* Targets are a list of single numbers, so they're bars, not a chart. */}
      <section className="surface rounded-2xl p-4">
        <h2 className="text-[17px] font-semibold">Race-week targets</h2>
        <p className="mt-0.5 text-[13px] text-muted-foreground">
          Where you need to be by {settings.race_date.slice(0, 7)}.
        </p>

        <ul className="mt-4 space-y-3.5">
          {BENCHMARK_TARGETS.map((target) => {
            const value = latest.get(target.name) ?? null;
            const progress = progressToward(value, target.target_min, target.lowerIsBetter);

            return (
              <li key={target.name}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-[15px]">{target.label}</span>
                  <span className="text-[13px] text-muted-foreground">
                    {value == null
                      ? "—"
                      : target.unit === "s"
                        ? formatPace(value)
                        : `${value} ${target.unit}`}
                    <span className="opacity-60">
                      {" / "}
                      {target.unit === "s"
                        ? formatPace(target.target_min)
                        : `${target.target_min}-${target.target_max} ${target.unit}`}
                    </span>
                  </span>
                </div>

                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/8">
                  <div
                    className={cn(
                      "h-full rounded-full",
                      progress >= 100 ? "bg-[var(--chart-4)]" : "brand-fill",
                    )}
                    style={{ width: `${Math.min(100, progress)}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>

        {data.benchmarks.length === 0 ? (
          <p className="mt-4 text-[13px] text-muted-foreground">
            No benchmarks logged yet, so these bars are empty.
          </p>
        ) : null}
      </section>
    </Screen>
  );
}

/** Percentage of the way to the target. Times count down, loads count up. */
function progressToward(
  value: number | null,
  target: number,
  lowerIsBetter?: boolean,
): number {
  if (value == null || target <= 0) return 0;
  if (!lowerIsBetter) return Math.max(0, (value / target) * 100);

  // For a time, treat 1.5x the target as the zero point so the bar has range.
  const start = target * 1.5;
  if (value >= start) return 0;
  return Math.max(0, ((start - value) / (start - target)) * 100);
}
