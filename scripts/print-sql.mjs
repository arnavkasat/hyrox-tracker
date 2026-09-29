/**
 * Prints every migration, in order, as one script.
 *
 * For when you'd rather paste into the Supabase SQL editor than link the CLI:
 *   npm run db:sql | pbcopy
 */

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const dir = "supabase/migrations";
const files = readdirSync(dir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

if (files.length === 0) {
  console.error("No migrations found in", dir);
  process.exit(1);
}

for (const file of files) {
  process.stdout.write(`-- ============ ${file} ============\n`);
  process.stdout.write(readFileSync(join(dir, file), "utf8").trimEnd());
  process.stdout.write("\n\n");
}
