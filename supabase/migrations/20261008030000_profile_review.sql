-- Profile review: artists submit profile changes, a platform admin verifies,
-- edits if needed and approves them before they appear on the public site.

-- ─── Platform admins (review and approve artists) ───────────────────
create table public.platform_admins (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.platform_admins enable row level security;

create policy "read own platform admin row" on public.platform_admins
  for select using (user_id = auth.uid());

create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.platform_admins where user_id = auth.uid());
$$;

-- The site owner's existing admins become platform admins.
insert into public.platform_admins (user_id)
select aa.user_id
from public.artist_admins aa
join public.artists ar on ar.id = aa.artist_id
where ar.slug = 'sukrutha'
on conflict do nothing;

-- ─── Approval state ─────────────────────────────────────────────────
-- Null until a platform admin first approves the profile; unapproved artists are hidden.
alter table public.artists add column approved_at timestamptz;

-- Artists already on the site are live.
update public.artists set approved_at = created_at where approved_at is null;

drop policy if exists "artists are public" on public.artists;
create policy "approved artists are public" on public.artists
  for select using (
    approved_at is not null or public.is_artist_admin(id) or public.is_platform_admin()
  );

-- Artists no longer edit their live profile directly; they submit it for review.
drop policy if exists "admins update own artist" on public.artists;
create policy "platform admins update artists" on public.artists
  for update using (public.is_platform_admin()) with check (public.is_platform_admin());

grant update (approved_at) on public.artists to authenticated;

-- ─── Pending submissions (one per artist; resubmitting replaces it) ─
create table public.artist_profile_reviews (
  artist_id    uuid primary key references public.artists (id) on delete cascade,
  profile      jsonb not null check (jsonb_typeof(profile) = 'object'),
  submitted_by uuid default auth.uid() references auth.users (id) on delete set null,
  submitted_at timestamptz not null default now()
);

alter table public.artist_profile_reviews enable row level security;

create policy "artists manage own submission" on public.artist_profile_reviews
  for all
  using (public.is_artist_admin(artist_id))
  with check (public.is_artist_admin(artist_id));

create policy "platform admins manage submissions" on public.artist_profile_reviews
  for all
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

-- ─── Storage: platform admins may replace any artist's profile photo ─
create policy "platform admins upload artwork files" on storage.objects
  for insert to authenticated with check (bucket_id = 'artworks' and public.is_platform_admin());

create policy "platform admins delete artwork files" on storage.objects
  for delete to authenticated using (bucket_id = 'artworks' and public.is_platform_admin());
