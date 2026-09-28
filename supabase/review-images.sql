-- Run this in the Supabase SQL Editor before enabling review photos.
-- The bucket must be public because review photos are shown on the public site.

alter table public.reviews
  add column if not exists image_url text;

insert into storage.buckets (id, name, public)
values ('review-images', 'review-images', true)
on conflict (id) do update set public = true;

-- Allow visitors to upload photos and read their public URLs.
-- Keep the 5 MB client-side limit in js/reviews.js; apply stricter policies here if needed.
create policy "Anyone can upload review images"
  on storage.objects for insert to anon
  with check (bucket_id = 'review-images');

create policy "Anyone can view review images"
  on storage.objects for select to anon
  using (bucket_id = 'review-images');
