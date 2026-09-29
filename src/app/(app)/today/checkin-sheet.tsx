"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { saveCheckin } from "./actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Rating } from "@/components/ios/rating";
import { Stepper } from "@/components/ios/stepper";
import type { DailyCheckin } from "@/lib/supabase/types";

export function CheckinSheet({
  date,
  existing,
  defaultWeight,
  trigger,
}: {
  date: string;
  existing: DailyCheckin | null;
  defaultWeight: number;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const [weight, setWeight] = useState(existing?.weight_kg ?? defaultWeight);
  const [energy, setEnergy] = useState<number | null>(existing?.energy ?? null);
  const [soreness, setSoreness] = useState<number | null>(existing?.soreness ?? null);
  const [note, setNote] = useState(existing?.note ?? "");

  function submit() {
    startTransition(async () => {
      try {
        await saveCheckin({
          date,
          weight_kg: weight,
          energy,
          soreness,
          note: note.trim() || null,
        });
        setOpen(false);
        toast.success("Checked in");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not save");
      }
    });
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>{trigger}</DrawerTrigger>
      <DrawerContent>
        <div className="mx-auto w-full max-w-lg pb-safe">
          <DrawerHeader className="text-left">
            <DrawerTitle className="text-[22px]">Morning check-in</DrawerTitle>
            <DrawerDescription>Takes about fifteen seconds.</DrawerDescription>
          </DrawerHeader>

          <div className="space-y-6 px-4 pb-6">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[17px]">Weight</span>
              <Stepper
                value={weight}
                onChange={setWeight}
                step={0.1}
                decimals={1}
                min={30}
                max={200}
                suffix="kg"
                label="weight"
              />
            </div>

            <Rating
              label="Energy"
              value={energy}
              onChange={setEnergy}
              lowLabel="flat"
              highLabel="buzzing"
            />
            <Rating
              label="Soreness"
              value={soreness}
              onChange={setSoreness}
              lowLabel="fresh"
              highLabel="wrecked"
            />

            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Anything worth noting? (optional)"
              rows={2}
              className="resize-none text-[17px]"
            />

            <Button
              onClick={submit}
              disabled={pending}
              size="lg"
              className="h-12 w-full text-[17px]"
            >
              {pending ? "Saving…" : "Save check-in"}
            </Button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
