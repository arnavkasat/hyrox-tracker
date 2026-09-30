-- The private bucket weekly photos go into.
--
-- Files are stored as "<user_id>/<filename>", and the policies below are what
-- make that prefix meaningful rather than a convention.
--
-- On hosted Supabase, storage.objects is owned by supabase_storage_admin, so
-- the SQL editor's role may not be allowed to add policies to it. Rather than
-- abort — and take unrelated migrations down with it — each step reports what
-- to do by hand and carries on.
--
-- Safe to run more than once.

do $$
begin
  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('photos', 'photos', false, 5242880, array['image/jpeg', 'image/webp'])
  on conflict (id) do update
    set public = false,
        file_size_limit = excluded.file_size_limit,
        allowed_mime_types = excluded.allowed_mime_types;

  raise notice 'photos bucket ready';
exception
  when insufficient_privilege or undefined_table then
    raise warning 'Could not create the photos bucket from SQL (%). Create it by hand: Storage -> New bucket -> name "photos", Public OFF.', sqlerrm;
end;
$$;

do $$
declare
  action text;
begin
  foreach action in array array['select', 'insert', 'update', 'delete']
  loop
    execute format('drop policy if exists %I on storage.objects', 'photos_own_files_' || action);
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

  raise notice 'photos storage policies ready';
exception
  when insufficient_privilege then
    raise warning 'Could not add storage policies from SQL (%). Add them in Storage -> Policies on the photos bucket: allow authenticated select/insert/update/delete where (storage.foldername(name))[1] = auth.uid()::text.', sqlerrm;
end;
$$;
