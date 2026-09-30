-- Who owns each planned session.
--
-- Three writers now touch plan_sessions: the generator, you (calendar and
-- builder), and the weekly review. `origin` records which one last wrote a
-- row so regeneration can replace its own output without ever clobbering an
-- edit you made or a change you accepted.
--
-- Safe to run more than once.

alter table public.plan_sessions
  add column if not exists origin text not null default 'generated';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'plan_sessions_origin_check'
  ) then
    alter table public.plan_sessions
      add constraint plan_sessions_origin_check
      check (origin in ('generated', 'user', 'review'));
  end if;
end;
$$;

create index if not exists plan_sessions_user_origin_idx
  on public.plan_sessions (user_id, origin);
