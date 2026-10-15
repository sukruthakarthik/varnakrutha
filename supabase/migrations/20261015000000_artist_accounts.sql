-- Artist accounts: accepting an application creates the artist and invites them to sign in.
--
-- Roles:
--   admin  = a row in platform_admins (reviews artists, sees inquiries, accepts applications)
--   artist = a row in artist_admins (manages only their own artworks and submits their profile for review)
--   guest  = not signed in (reads approved artists' work only)
--
-- Accepting an application runs on the server with the service role key, which bypasses RLS,
-- so no insert policies are added for artists or artist_admins.

-- ─── Link an accepted application to the artist it created ──────────
alter table public.artist_applications
  add column artist_id uuid references public.artists (id) on delete set null;

-- ─── Artworks are public only once their artist is approved ─────────
-- Columns are qualified with the table name: inside the subquery an unqualified name
-- could resolve to the inner table (see 20261008000000_fix_storage_policies.sql).
drop policy if exists "artworks are public" on public.artworks;
create policy "approved artists' artworks are public" on public.artworks
  for select using (
    exists (
      select 1 from public.artists ar
      where ar.id = artworks.artist_id and ar.approved_at is not null
    )
    or public.is_artist_admin(artworks.artist_id)
    or public.is_platform_admin()
  );

-- Images follow their artwork: the artworks policy above applies inside this subquery.
drop policy if exists "artwork images are public" on public.artwork_images;
create policy "images of visible artworks are public" on public.artwork_images
  for select using (
    exists (select 1 from public.artworks a where a.id = artwork_images.artwork_id)
  );

-- ─── Inquiries are for platform admins only ─────────────────────────
-- Artists manage their art; buyer enquiries are handled by the site's admins.
drop policy if exists "admins read inquiries" on public.inquiries;
drop policy if exists "admins update inquiries" on public.inquiries;
drop policy if exists "admins delete inquiries" on public.inquiries;

create policy "platform admins read inquiries" on public.inquiries
  for select using (public.is_platform_admin());
create policy "platform admins update inquiries" on public.inquiries
  for update using (public.is_platform_admin()) with check (public.is_platform_admin());
create policy "platform admins delete inquiries" on public.inquiries
  for delete using (public.is_platform_admin());
