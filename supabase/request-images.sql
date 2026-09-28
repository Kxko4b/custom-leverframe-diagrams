-- Run this in the Supabase SQL Editor to enable reference-image uploads on requests.
-- The public site needs anonymous inserts because customers submit the request form.

insert into storage.buckets (id, name, public)
values ('diagram-files', 'diagram-files', true)
on conflict (id) do update set public = true;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'Anyone can upload request images'
  ) then
    create policy "Anyone can upload request images"
      on storage.objects for insert to anon
      with check (bucket_id = 'diagram-files' and name like 'requests/%');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'Anyone can view request images'
  ) then
    create policy "Anyone can view request images"
      on storage.objects for select to anon
      using (bucket_id = 'diagram-files' and name like 'requests/%');
  end if;
end $$;
