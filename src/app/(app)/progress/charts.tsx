"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from "recharts";

import { formatPace } from "@/lib/date";
import type { PacePoint, ReadinessPoint, WeekPoint, WeightPoint } from "@/lib/data/progress";

/* Recharts types `content` against its own default generics, which it does
   not re-export by name, so mirror them here rather than casting. */
type TipProps = TooltipContentProps<
  number | string | ReadonlyArray<number | string>,
  number | string
>;

/* Chart chrome is deliberately recessive: solid hairline grid, no dashes,
   axis text in the muted ink token rather than any series colour. */
const AXIS = {
  stroke: "var(--grid)",
  tick: { fill: "var(--muted-foreground)", fontSize: 11 },
  tickLine: false,
  axisLine: false,
} as const;

const GRID = { stroke: "var(--grid)", strokeDasharray: "0", vertical: false } as const;

function Panel({ label, rows }: { label: string; rows: { name: string; value: string }[] }) {
  return (
    <div className="surface-thick rounded-xl px-3 py-2 text-[12px] shadow-lg">
      <p className="font-medium">{label}</p>
      {rows.map((row) => (
        <p key={row.name} className="text-muted-foreground">
          {row.name}: <span className="text-foreground">{row.value}</span>
        </p>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------- weight -- */

export function WeightChart({ data }: { data: WeightPoint[] }) {
  const values = data.flatMap((d) => [d.weight, d.average]).filter((v): v is number => v != null);
  const min = Math.floor(Math.min(...values) - 1);
  const max = Math.ceil(Math.max(...values) + 1);

  const tip = ({ active, payload }: TipProps) => {
    if (!active || !payload?.length) return null;
    const point = payload[0].payload as WeightPoint;
    return (
      <Panel
        label={point.date}
        rows={[
          { name: "Weight", value: point.weight != null ? `${point.weight} kg` : "—" },
          {
            name: "7-day avg",
            value: point.average != null ? `${point.average.toFixed(1)} kg` : "—",
          },
        ]}
      />
    );
  };

  return (
    <ResponsiveContainer width="100%" height={180}>
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
        <CartesianGrid {...GRID} />
        <XAxis dataKey="date" {...AXIS} tickFormatter={(d: string) => d.slice(5)} minTickGap={28} />
        <YAxis domain={[min, max]} width={38} {...AXIS} />
        <Tooltip content={tip} cursor={{ stroke: "var(--grid)" }} />
        {/* Daily readings sit behind as faint dots; the 7-day mean is the
            line you're meant to read. Same measure, so one hue throughout. */}
        <Line
          dataKey="weight"
          stroke="var(--primary)"
          strokeOpacity={0.28}
          strokeWidth={0}
          dot={{ r: 2.5, fill: "var(--primary)", fillOpacity: 0.35, strokeWidth: 0 }}
          isAnimationActive={false}
        />
        <Line
          dataKey="average"
          stroke="var(--primary)"
          strokeWidth={2}
          dot={false}
          connectNulls
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

/* -------------------------------------------------------- weekly sets -- */

export function VolumeChart({ data }: { data: WeekPoint[] }) {
  const tip = ({ active, payload }: TipProps) => {
    if (!active || !payload?.length) return null;
    const point = payload[0].payload as WeekPoint;
    return (
      <Panel label={`Week ${point.week}`} rows={[{ name: "Sets", value: String(point.sets) }]} />
    );
  };

  return (
    <ResponsiveContainer width="100%" height={168}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
        <CartesianGrid {...GRID} />
        <XAxis dataKey="label" {...AXIS} minTickGap={8} />
        <YAxis width={34} allowDecimals={false} {...AXIS} />
        <Tooltip content={tip} cursor={{ fill: "rgb(255 255 255 / 4%)" }} />
        <Bar dataKey="sets" fill="var(--primary)" radius={[4, 4, 0, 0]} maxBarSize={22} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/* -------------------------------------------------------- consistency -- */

export function ConsistencyChart({ data }: { data: WeekPoint[] }) {
  const withRate = data.map((d) => ({
    ...d,
    rate: d.planned > 0 ? Math.round((d.completed / d.planned) * 100) : 0,
  }));

  const tip = ({ active, payload }: TipProps) => {
    if (!active || !payload?.length) return null;
    const point = payload[0].payload as WeekPoint & { rate: number };
    return (
      <Panel
        label={`Week ${point.week}`}
        rows={[
          { name: "Done", value: `${point.completed} of ${point.planned}` },
          { name: "Rate", value: `${point.rate}%` },
        ]}
      />
    );
  };

  return (
    <ResponsiveContainer width="100%" height={168}>
      <BarChart data={withRate} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
        <CartesianGrid {...GRID} />
        <XAxis dataKey="label" {...AXIS} minTickGap={8} />
        <YAxis width={34} domain={[0, 100]} unit="%" {...AXIS} />
        <Tooltip content={tip} cursor={{ fill: "rgb(255 255 255 / 4%)" }} />
        <Bar dataKey="rate" fill="var(--chart-4)" radius={[4, 4, 0, 0]} maxBarSize={22} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/* ---------------------------------------------------------- readiness -- */

export function ReadinessChart({ data }: { data: ReadinessPoint[] }) {
  const tip = ({ active, payload }: TipProps) => {
    if (!active || !payload?.length) return null;
    const point = payload[0].payload as ReadinessPoint;
    return (
      <Panel
        label={point.date}
        rows={[{ name: "Readiness", value: point.score != null ? String(point.score) : "—" }]}
      />
    );
  };

  return (
    <ResponsiveContainer width="100%" height={150}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
        <CartesianGrid {...GRID} />
        <XAxis dataKey="label" {...AXIS} minTickGap={4} />
        <YAxis width={34} domain={[0, 100]} {...AXIS} />
        <Tooltip content={tip} cursor={{ fill: "rgb(255 255 255 / 4%)" }} />
        <Bar dataKey="score" fill="var(--chart-2)" radius={[4, 4, 0, 0]} maxBarSize={18} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/* --------------------------------------------------------- run paces -- */

export function PaceChart({ data }: { data: PacePoint[] }) {
  const paces = data.map((d) => d.paceSec);
  const min = Math.floor(Math.min(...paces) - 15);
  const max = Math.ceil(Math.max(...paces) + 15);

  const tip = ({ active, payload }: TipProps) => {
    if (!active || !payload?.length) return null;
    const point = payload[0].payload as PacePoint;
    return (
      <Panel
        label={point.date}
        rows={[
          { name: "Pace", value: `${formatPace(point.paceSec)} / km` },
          { name: "Distance", value: `${point.km.toFixed(1)} km` },
        ]}
      />
    );
  };

  return (
    <ResponsiveContainer width="100%" height={168}>
      <ScatterChart margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
        <CartesianGrid {...GRID} />
        <XAxis
          dataKey="date"
          {...AXIS}
          tickFormatter={(d: string) => d.slice(5)}
          minTickGap={28}
        />
        {/* Faster is lower, so the axis is reversed: up means quicker. */}
        <YAxis
          dataKey="paceSec"
          domain={[min, max]}
          reversed
          width={48}
          {...AXIS}
          tickFormatter={(v: number) => formatPace(v)}
        />
        <Tooltip content={tip} cursor={{ stroke: "var(--grid)" }} />
        <Scatter data={data} fill="var(--chart-3)" shape="circle" />
      </ScatterChart>
    </ResponsiveContainer>
  );
}
