-- Two things: stop sessions being logged before they happen, and create the
-- private bucket weekly photos go into.
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


-- -------------------------------------------------- private photos bucket --
-- Files are stored as "<user_id>/<filename>", and the policies below are what
-- make that path prefix meaningful rather than a convention.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', false, 5242880, array['image/jpeg', 'image/webp'])
on conflict (id) do update
  set file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

do $$
declare
  policy_name text;
  action text;
begin
  foreach action in array array['select', 'insert', 'update', 'delete']
  loop
    policy_name := 'photos_own_files_' || action;
    execute format('drop policy if exists %I on storage.objects', policy_name);
  end loop;

  execute $p$
    create policy photos_own_files_select on storage.objects for select to authenticated
      using (bucket_id = 'photos'
             and (select auth.uid())::text = (storage.foldername(name))[1])
  $p$;

  execute $p$
    create policy photos_own_files_insert on storage.objects for insert to authenticated
      with check (bucket_id = 'photos'
                  and (select auth.uid())::text = (storage.foldername(name))[1])
  $p$;

  execute $p$
    create policy photos_own_files_update on storage.objects for update to authenticated
      using (bucket_id = 'photos'
             and (select auth.uid())::text = (storage.foldername(name))[1])
  $p$;

  execute $p$
    create policy photos_own_files_delete on storage.objects for delete to authenticated
      using (bucket_id = 'photos'
             and (select auth.uid())::text = (storage.foldername(name))[1])
  $p$;
end;
$$;
