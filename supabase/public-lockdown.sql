-- Closes the public read access to customer data.
-- Before: anyone with the public anon key could list every request (names, emails, Discord), question and update.
-- After:  the public can only look up ONE request/question by its secret code, through the two functions below,
--         and only sees the fields a customer needs. Everything else is admin-only.

-- 1) Lookup-by-code functions (SECURITY DEFINER so they can read what anon no longer may).
create or replace function public.get_request_status(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  r public.requests%rowtype;
  code text := upper(btrim(coalesce(p_code, '')));
begin
  if length(code) < 8 or length(code) > 40 then return null; end if;
  select * into r from public.requests where request_code = code limit 1;
  if not found then return null; end if;
  return jsonb_build_object(
    'id', r.id, 'request_code', r.request_code, 'status', r.status, 'type', r.type, 'size', r.size, 'created_at', r.created_at,
    'name', r.name, 'description', r.description,
    'images', coalesce((select jsonb_agg(jsonb_build_object('image_url', i.image_url) order by i.id)
                        from public.request_images i where i.request_id = r.id), '[]'::jsonb),
    'updates', coalesce((
      select jsonb_agg(jsonb_build_object(
        'message', u.message, 'author', u.author, 'created_at', u.created_at,
        'request_update_files', coalesce((select jsonb_agg(jsonb_build_object('file_name', f.file_name, 'file_url', f.file_url) order by f.id)
                           from public.request_update_files f where f.update_id = u.id), '[]'::jsonb)
      ) order by u.created_at)
      from public.request_updates u where u.request_id = r.id), '[]'::jsonb)
  );
end $$;

create or replace function public.get_question_status(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  q public.questions%rowtype;
  code text := upper(btrim(coalesce(p_code, '')));
begin
  if length(code) < 8 or length(code) > 40 then return null; end if;
  select * into q from public.questions where question_code = code limit 1;
  if not found then return null; end if;
  return jsonb_build_object('question_code', q.question_code, 'status', q.status, 'created_at', q.created_at,
                            'question', q.question, 'answer', q.answer, 'answered_at', q.answered_at);
end $$;

revoke all on function public.get_request_status(text), public.get_question_status(text) from public;
grant execute on function public.get_request_status(text), public.get_question_status(text) to anon, authenticated;

-- 2) Admin-only policies where "any logged-in user" or "anyone" used to be allowed.
drop policy if exists "Allow request confirmation" on public.requests;
drop policy if exists "Anyone can check questions" on public.questions;
drop policy if exists "Enable read access for all users" on public.request_updates;
drop policy if exists "Authenticated users can manage request updates" on public.request_updates;
drop policy if exists "Allow public read of update files" on public.request_update_files;
drop policy if exists "Authenticated users can manage update files" on public.request_update_files;
drop policy if exists "Authenticated users can manage request images" on public.request_images;
drop policy if exists "Authenticated users can manage examples" on public.examples;
drop policy if exists "Enable insert for authenticated users only" on public.site_content;

create policy "Admin manages request updates" on public.request_updates for all to authenticated
  using (lower(auth.jwt() ->> 'email') = 'haleannson@gmail.com') with check (lower(auth.jwt() ->> 'email') = 'haleannson@gmail.com');
create policy "Admin manages update files" on public.request_update_files for all to authenticated
  using (lower(auth.jwt() ->> 'email') = 'haleannson@gmail.com') with check (lower(auth.jwt() ->> 'email') = 'haleannson@gmail.com');
create policy "Admin manages request images" on public.request_images for all to authenticated
  using (lower(auth.jwt() ->> 'email') = 'haleannson@gmail.com') with check (lower(auth.jwt() ->> 'email') = 'haleannson@gmail.com');
create policy "Admin writes site content" on public.site_content for insert to authenticated
  with check (lower(auth.jwt() ->> 'email') = 'haleannson@gmail.com');
