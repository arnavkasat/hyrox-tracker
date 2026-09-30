"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { saveTemplate } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { BlockList } from "@/components/plan/block-list";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { PRESETS } from "@/lib/plan/blocks";
import {
  REST_DAY,
  templateRestDays,
  templateWeeklySets,
  type DayTemplate,
  type WeeklyTemplate,
} from "@/lib/plan/custom";
import { GROUP_DOT, groupOf } from "@/lib/plan/appearance";
import { cn } from "@/lib/utils";

const WEEKDAYS = [
  { key: "1", label: "Monday" },
  { key: "2", label: "Tuesday" },
  { key: "3", label: "Wednesday" },
  { key: "4", label: "Thursday" },
  { key: "5", label: "Friday" },
  { key: "6", label: "Saturday" },
  { key: "7", label: "Sunday" },
];

export function BuilderView({
  initial,
  usingBuiltIn,
}: {
  initial: WeeklyTemplate;
  usingBuiltIn: boolean;
}) {
  const router = useRouter();
  const [template, setTemplate] = useState(initial);
  const [editing, setEditing] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const day = editing ? (template.days[editing] ?? null) : null;
  const weeklySets = templateWeeklySets(template);
  const restDays = templateRestDays(template);

  function setDay(key: string, next: DayTemplate | null) {
    setTemplate((current) => ({ ...current, days: { ...current.days, [key]: next } }));
  }

  function apply() {
    startTransition(async () => {
      const result = await saveTemplate(template);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(
        result.replaced === 0
          ? "Saved. No future days were open to rebuild."
          : `Rebuilt ${result.replaced} upcoming sessions.`,
      );
      router.push("/plan");
    });
  }

  function revert() {
    startTransition(async () => {
      const result = await saveTemplate(null);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success("Back to the built-in Hyrox plan.");
      router.push("/plan");
    });
  }

  return (
    <>
      <p className="surface rounded-2xl px-4 py-3 text-[13px] leading-snug text-muted-foreground">
        Design one week. It repeats for every week of the block. Days you&rsquo;ve
        already trained or edited by hand are never overwritten.
      </p>

      {/* ---------------------------------------------------- the week -- */}
      <section>
        <h2 className="px-4 pb-2 text-[13px] font-medium tracking-wide text-muted-foreground uppercase">
          Your week
        </h2>

        <div className="surface overflow-hidden rounded-2xl [&>*+*]:relative [&>*+*]:before:absolute [&>*+*]:before:inset-x-0 [&>*+*]:before:top-0 [&>*+*]:before:ml-4 [&>*+*]:before:h-px [&>*+*]:before:bg-hairline">
          {WEEKDAYS.map(({ key, label }) => {
            const entry = template.days[key];
            return (
              <button
                key={key}
                type="button"
                onClick={() => setEditing(key)}
                className="press flex min-h-[56px] w-full items-center gap-3 px-4 py-2.5 text-left"
              >
                <span className="w-[4.5rem] shrink-0 text-[13px] text-muted-foreground">
                  {label}
                </span>
                <span
                  className={cn(
                    "size-2 shrink-0 rounded-full",
                    entry ? GROUP_DOT[groupOf(entry.type)] : "bg-white/25",
                  )}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[17px]">
                    {entry?.title ?? "Rest"}
                  </span>
                  {entry && entry.planned.length > 0 ? (
                    <span className="block text-[13px] text-muted-foreground">
                      {entry.planned.length}{" "}
                      {entry.planned.length === 1 ? "exercise" : "exercises"}
                      {entry.withPartner ? " · partner" : ""}
                    </span>
                  ) : null}
                </span>
                <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
              </button>
            );
          })}
        </div>
      </section>

      {/* ------------------------------------------------ week summary -- */}
      <div className="surface grid grid-cols-2 rounded-2xl">
        <div className="px-3 py-3.5 text-center">
          <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
            Sets per week
          </p>
          <p className="mt-1 text-[22px] leading-none font-semibold">{weeklySets}</p>
        </div>
        <div className="border-l border-hairline px-3 py-3.5 text-center">
          <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
            Rest days
          </p>
          <p
            className={cn(
              "mt-1 text-[22px] leading-none font-semibold",
              restDays === 0 && "text-destructive",
            )}
          >
            {restDays}
          </p>
        </div>
      </div>

      {restDays === 0 ? (
        <p className="-mt-3 px-1 text-center text-[13px] text-destructive">
          Every week needs at least one rest day.
        </p>
      ) : null}

      {/* ---------------------------------------------------- overrides -- */}
      <PhaseOverrides template={template} onChange={setTemplate} />

      {/* ------------------------------------------------------ actions -- */}
      <div className="space-y-2">
        <Button
          variant="brand"
          size="ios"
          className="w-full"
          onClick={apply}
          disabled={pending || restDays === 0}
        >
          {pending ? "Rebuilding…" : "Apply to my plan"}
        </Button>

        {!usingBuiltIn ? (
          <Button
            variant="glass"
            size="ios"
            className="w-full"
            onClick={revert}
            disabled={pending}
          >
            Go back to the built-in Hyrox plan
          </Button>
        ) : null}
      </div>

      {/* ----------------------------------------------------- day sheet -- */}
      <Drawer open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DrawerContent>
          <div className="mx-auto max-h-[85vh] w-full max-w-lg overflow-y-auto pb-safe">
            {editing ? (
              <>
                <DrawerHeader className="text-left">
                  <DrawerTitle className="text-[22px]">
                    {WEEKDAYS.find((d) => d.key === editing)?.label}
                  </DrawerTitle>
                  <DrawerDescription>Repeats every week.</DrawerDescription>
                </DrawerHeader>

                <div className="space-y-5 px-4 pb-6">
                  <Input
                    value={day?.title ?? ""}
                    placeholder="Rest"
                    aria-label="Session name"
                    onChange={(e) =>
                      setDay(editing, {
                        ...(day ?? REST_DAY),
                        title: e.target.value,
                      })
                    }
                    className="h-12 rounded-xl text-[17px] font-medium"
                  />

                  <div>
                    <p className="pb-2 text-[13px] font-medium tracking-wide text-muted-foreground uppercase">
                      Start from
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {PRESETS.map((preset) => (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() =>
                            setDay(
                              editing,
                              preset.id === "rest"
                                ? null
                                : {
                                    title: preset.title,
                                    type: preset.type,
                                    planned: preset.planned,
                                    withPartner: preset.withPartner ?? false,
                                  },
                            )
                          }
                          className="press surface rounded-full px-3.5 py-2 text-[13px] font-medium"
                        >
                          {preset.title}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="pb-2 text-[13px] font-medium tracking-wide text-muted-foreground uppercase">
                      Exercises
                    </p>
                    <BlockList
                      planned={day?.planned ?? []}
                      onChange={(planned) =>
                        setDay(
                          editing,
                          planned.length === 0 && !day
                            ? null
                            : { ...(day ?? REST_DAY), planned },
                        )
                      }
                    />
                  </div>

                  <div className="surface flex items-center justify-between gap-3 rounded-2xl px-4 py-3">
                    <span className="text-[17px]">With partner</span>
                    <Switch
                      checked={day?.withPartner ?? false}
                      onCheckedChange={(checked) =>
                        setDay(editing, { ...(day ?? REST_DAY), withPartner: checked })
                      }
                      aria-label="With partner"
                    />
                  </div>

                  <div className="space-y-2">
                    <Button
                      variant="brand"
                      size="ios"
                      className="w-full"
                      onClick={() => setEditing(null)}
                    >
                      Done
                    </Button>
                    {day ? (
                      <Button
                        variant="glass"
                        size="ios"
                        className="w-full"
                        onClick={() => {
                          setDay(editing, null);
                          setEditing(null);
                        }}
                      >
                        <Trash2 className="size-4" />
                        Make this a rest day
                      </Button>
                    ) : null}
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}

/** "From week N, this weekday changes" — how a base block becomes a build block. */
function PhaseOverrides({
  template,
  onChange,
}: {
  template: WeeklyTemplate;
  onChange: (next: WeeklyTemplate) => void;
}) {
  return (
    <section>
      <h2 className="px-4 pb-2 text-[13px] font-medium tracking-wide text-muted-foreground uppercase">
        Changes later in the block
      </h2>

      {template.overrides.length === 0 ? (
        <p className="surface rounded-2xl px-4 py-4 text-[13px] leading-snug text-muted-foreground">
          Nothing yet. Add one to swap a weekday from a given week onward — how
          easy Tuesdays become interval Tuesdays once you&rsquo;re fit enough.
        </p>
      ) : (
        <ul className="space-y-2">
          {template.overrides.map((override, index) => (
            <li
              key={index}
              className="surface flex items-center gap-3 rounded-2xl px-4 py-3"
            >
              <span className="min-w-0 flex-1 text-[15px]">
                From week {override.fromWeek},{" "}
                {WEEKDAYS.find((d) => d.key === String(override.weekday))?.label} becomes{" "}
                <span className="font-medium">{override.day.title}</span>
              </span>
              <button
                type="button"
                aria-label="Remove this change"
                onClick={() =>
                  onChange({
                    ...template,
                    overrides: template.overrides.filter((_, i) => i !== index),
                  })
                }
                className="press flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground"
              >
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <AddOverride template={template} onChange={onChange} />
    </section>
  );
}

function AddOverride({
  template,
  onChange,
}: {
  template: WeeklyTemplate;
  onChange: (next: WeeklyTemplate) => void;
}) {
  const [open, setOpen] = useState(false);
  const [fromWeek, setFromWeek] = useState(9);
  const [weekday, setWeekday] = useState(2);
  const [presetId, setPresetId] = useState(PRESETS[0].id);

  function add() {
    const preset = PRESETS.find((p) => p.id === presetId);
    if (!preset) return;

    onChange({
      ...template,
      overrides: [
        ...template.overrides,
        {
          fromWeek,
          weekday,
          day: {
            title: preset.title,
            type: preset.type,
            planned: preset.planned,
            withPartner: preset.withPartner ?? false,
          },
        },
      ],
    });
    setOpen(false);
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="press surface mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-[15px] font-medium text-primary"
      >
        <Plus className="size-4" />
        Add a change
      </button>
    );
  }

  return (
    <div className="surface mt-2 space-y-3 rounded-2xl p-4">
      <label className="flex items-center justify-between gap-3">
        <span className="text-[15px]">From week</span>
        <select
          value={fromWeek}
          onChange={(e) => setFromWeek(Number(e.target.value))}
          className="surface h-11 rounded-xl px-3 text-[15px]"
        >
          {Array.from({ length: 19 }, (_, i) => i + 2).map((w) => (
            <option key={w} value={w}>
              {w}
            </option>
          ))}
        </select>
      </label>

      <label className="flex items-center justify-between gap-3">
        <span className="text-[15px]">Weekday</span>
        <select
          value={weekday}
          onChange={(e) => setWeekday(Number(e.target.value))}
          className="surface h-11 rounded-xl px-3 text-[15px]"
        >
          {WEEKDAYS.map((d) => (
            <option key={d.key} value={Number(d.key)}>
              {d.label}
            </option>
          ))}
        </select>
      </label>

      <label className="flex items-center justify-between gap-3">
        <span className="text-[15px]">Becomes</span>
        <select
          value={presetId}
          onChange={(e) => setPresetId(e.target.value)}
          className="surface h-11 max-w-[55%] rounded-xl px-3 text-[15px]"
        >
          {PRESETS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </select>
      </label>

      <div className="flex gap-2">
        <Button variant="brand" size="ios" className="flex-1" onClick={add}>
          Add
        </Button>
        <Button variant="glass" size="ios" className="flex-1" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
