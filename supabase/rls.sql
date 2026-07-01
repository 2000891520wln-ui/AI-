-- Run this in the Supabase SQL editor after creating the private bucket.
-- Bucket name expected by the app: journal-images

alter table public.inspiration_images enable row level security;

drop policy if exists "Users can read own journal images" on public.inspiration_images;
create policy "Users can read own journal images"
on public.inspiration_images
for select
to authenticated
using (user_id = (select auth.uid())::text);

drop policy if exists "Users can insert own journal images" on public.inspiration_images;
create policy "Users can insert own journal images"
on public.inspiration_images
for insert
to authenticated
with check (user_id = (select auth.uid())::text);

drop policy if exists "Users can update own journal images" on public.inspiration_images;
create policy "Users can update own journal images"
on public.inspiration_images
for update
to authenticated
using (user_id = (select auth.uid())::text)
with check (user_id = (select auth.uid())::text);

drop policy if exists "Users can delete own journal images" on public.inspiration_images;
create policy "Users can delete own journal images"
on public.inspiration_images
for delete
to authenticated
using (user_id = (select auth.uid())::text);

drop policy if exists "Users can read own storage objects" on storage.objects;
create policy "Users can read own storage objects"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'journal-images'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "Users can upload own storage objects" on storage.objects;
create policy "Users can upload own storage objects"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'journal-images'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "Users can update own storage objects" on storage.objects;
create policy "Users can update own storage objects"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'journal-images'
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'journal-images'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "Users can delete own storage objects" on storage.objects;
create policy "Users can delete own storage objects"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'journal-images'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
