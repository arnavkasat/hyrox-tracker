-- A user-defined weekly template.
--
-- Null means "use the built-in 20-week Hyrox block". Once you design your own
-- week in the builder it lands here, and the generator reads it instead.
--
-- Safe to run more than once.

alter table public.settings
  add column if not exists plan_template jsonb;

comment on column public.settings.plan_template is
  'WeeklyTemplate JSON: { days: { "1".."7": DayTemplate | null }, overrides: [...] }. Null = built-in plan.';
