-- Remove nutrition tracking.
--
-- The plan set calorie and protein targets, but logging food was never part
-- of how this gets used, so the columns only ever held nulls and the targets
-- only ever described an intention. Verified empty before writing this.
--
-- Everything needed to bring it back lives in git; adding the columns again
-- is a smaller job than carrying UI that can never populate.
--
-- Safe to run more than once.

alter table public.health_metrics drop column if exists calories;
alter table public.health_metrics drop column if exists protein_g;

alter table public.settings drop column if exists calorie_target_min;
alter table public.settings drop column if exists calorie_target_max;
alter table public.settings drop column if exists protein_target_min;
alter table public.settings drop column if exists protein_target_max;
