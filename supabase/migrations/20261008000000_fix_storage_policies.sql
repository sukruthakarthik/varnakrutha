-- Fix storage upload/delete policies.
-- Inside the artists subquery, an unqualified `name` resolved to artists.name
-- (e.g. "Sukrutha Karthik") instead of storage.objects.name (the file path),
-- so the folder check never matched and every upload failed RLS.

drop policy if exists "admins upload to own artist folder" on storage.objects;
drop policy if exists "admins delete from own artist folder" on storage.objects;

create policy "admins upload to own artist folder" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'artworks'
    and exists (
      select 1 from public.artists ar
      where ar.slug = (storage.foldername(objects.name))[1] and public.is_artist_admin(ar.id)
    )
  );

create policy "admins delete from own artist folder" on storage.objects
  for delete to authenticated using (
    bucket_id = 'artworks'
    and exists (
      select 1 from public.artists ar
      where ar.slug = (storage.foldername(objects.name))[1] and public.is_artist_admin(ar.id)
    )
  );
