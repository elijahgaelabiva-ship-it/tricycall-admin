-- Approved drivers can take a new photo, but it only replaces their live photo
-- after an admin approves it in the admin app. Run once in the Supabase SQL Editor.

alter table public.profiles add column if not exists pending_avatar_at timestamptz;

-- Replace the earlier "cannot upload / replace" rules: approved drivers may now
-- write ONLY a file called pending.jpg in their own folder.
drop policy if exists "approved drivers cannot upload avatar" on storage.objects;
drop policy if exists "approved drivers cannot replace avatar" on storage.objects;
drop policy if exists "approved drivers upload pending photo only" on storage.objects;
drop policy if exists "approved drivers replace pending photo only" on storage.objects;

create policy "approved drivers upload pending photo only"
on storage.objects as restrictive for insert to authenticated
with check (
  bucket_id <> 'avatars'
  or storage.filename(name) = 'pending.jpg'
  or not exists (select 1 from public.drivers d where d.id = auth.uid() and d.is_approved)
);

create policy "approved drivers replace pending photo only"
on storage.objects as restrictive for update to authenticated
using (
  bucket_id <> 'avatars'
  or storage.filename(name) = 'pending.jpg'
  or not exists (select 1 from public.drivers d where d.id = auth.uid() and d.is_approved)
);
