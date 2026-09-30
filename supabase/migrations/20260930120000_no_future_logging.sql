-- Stop sessions being logged before they happen.
--
-- Safe to run more than once.


-- ------------------------------------------- no logging the future, ever --
-- The UI hides the controls, but a hand-typed URL shouldn't be able to mark
-- race day complete in September either. The cutoff is UTC + 1 day so that
-- every timezone's "today" is allowed and nothing beyond it is.

create or replace function public.latest_loggable_date()
returns date
language sql
stable
as $$
  select ((now() at time zone 'utc')::date + 1);
$$;

create or replace function public.reject_future_exercise_log()
returns trigger
language plpgsql
as $$
declare
  session_date date;
begin
  select date into session_date
  from public.plan_sessions
  where id = new.session_id;

  if session_date is not null and session_date > public.latest_loggable_date() then
    raise exception 'Cannot log sets for %, which has not happened yet.', session_date
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists exercise_logs_reject_future on public.exercise_logs;
create trigger exercise_logs_reject_future
  before insert or update on public.exercise_logs
  for each row execute function public.reject_future_exercise_log();

create or replace function public.reject_future_session_status()
returns trigger
language plpgsql
as $$
begin
  if new.status in ('in_progress', 'completed')
     and old.status is distinct from new.status
     and new.date > public.latest_loggable_date() then
    raise exception 'Cannot start or complete %, which has not happened yet.', new.date
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists plan_sessions_reject_future_status on public.plan_sessions;
create trigger plan_sessions_reject_future_status
  before update on public.plan_sessions
  for each row execute function public.reject_future_session_status();
