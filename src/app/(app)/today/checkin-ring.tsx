"use client";

import type { ComponentProps } from "react";
import { Sunrise } from "lucide-react";

import { ENERGY_SCALE, SORENESS_SCALE, scaleLabel } from "@/lib/scales";
import type { DailyCheckin } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

const SIZE = 184;
const STROKE = 9;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * The morning check-in, as a single big target on the Today tab.
 * The ring fills with however much of the check-in is done, so a half
 * answer still looks like progress rather than nothing.
 */
export function CheckinRing({
  checkin,
  needsPhoto,
  hasPhoto,
  className,
  ...props
}: ComponentProps<"button"> & {
  checkin: DailyCheckin | null;
  needsPhoto: boolean;
  hasPhoto: boolean;
}) {
  const steps = [
    checkin?.weight_kg != null,
    checkin?.energy != null,
    checkin?.soreness != null,
    ...(needsPhoto ? [hasPhoto] : []),
  ];

  const done = steps.filter(Boolean).length;
  const progress = done / steps.length;
  const complete = done === steps.length;

  return (
    <button
      type="button"
      aria-label={complete ? "Edit morning check-in" : "Start morning check-in"}
      className={cn(
        "press-lg mx-auto flex flex-col items-center gap-3 rounded-full",
        className,
      )}
      {...props}
    >
      <span className="relative block" style={{ width: SIZE, height: SIZE }}>
        <svg
          width={SIZE}
          height={SIZE}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className="-rotate-90"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="checkin-ring" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="var(--primary-soft)" />
              <stop offset="100%" stopColor="var(--primary)" />
            </linearGradient>
          </defs>

          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke="var(--material-thick)"
            strokeWidth={STROKE}
          />

          {progress > 0 ? (
            <circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              fill="none"
              stroke="url(#checkin-ring)"
              strokeWidth={STROKE}
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={CIRCUMFERENCE * (1 - progress)}
              className="transition-[stroke-dashoffset] duration-700 ease-out"
            />
          ) : null}
        </svg>

        <span className="absolute inset-0 flex flex-col items-center justify-center px-6">
          {complete || done > 0 ? (
            <>
              <span className="text-[34px] leading-none font-bold tracking-tight">
                {checkin?.weight_kg != null ? `${checkin.weight_kg}` : "—"}
                {checkin?.weight_kg != null ? (
                  <span className="ml-1 text-[15px] font-normal text-muted-foreground">kg</span>
                ) : null}
              </span>
              <span className="mt-1.5 text-[13px] text-muted-foreground">
                {scaleLabel(ENERGY_SCALE, checkin?.energy ?? null)} ·{" "}
                {scaleLabel(SORENESS_SCALE, checkin?.soreness ?? null)}
              </span>
            </>
          ) : (
            <>
              <Sunrise className="size-8 text-primary" strokeWidth={1.6} />
              <span className="mt-2 text-[17px] font-semibold">Check in</span>
              <span className="mt-0.5 text-[13px] text-muted-foreground">
                Takes 15 seconds
              </span>
            </>
          )}
        </span>
      </span>

      <span className="text-[13px] text-muted-foreground">
        {complete
          ? "Checked in — tap to edit"
          : done > 0
            ? `${done} of ${steps.length} done — tap to finish`
            : needsPhoto
              ? "Weight, energy, soreness, photo"
              : "Weight, energy, soreness"}
      </span>
    </button>
  );
}
