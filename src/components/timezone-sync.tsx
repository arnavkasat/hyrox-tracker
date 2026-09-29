"use client";

import { useEffect } from "react";
import { syncTimezone } from "@/app/(app)/today/actions";

/**
 * The settings row is seeded server-side, before we can know the device's
 * timezone. This corrects it once, on first load from a new device.
 */
export function TimezoneSync() {
  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!tz) return;

    const key = "hyrox:tz-synced";
    try {
      if (localStorage.getItem(key) === tz) return;
      localStorage.setItem(key, tz);
    } catch {
      // Private mode — syncing every load is harmless.
    }

    void syncTimezone(tz);
  }, []);

  return null;
}
