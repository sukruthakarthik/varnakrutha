-- Art By Sukrutha — initial schema
-- Multi-artist ready: every artwork and inquiry belongs to an artist,
-- and admin access is granted per artist via artist_admins.

create extension if not exists "pgcrypto";

-- ─── Enums ──────────────────────────────────────────────────────────
create type public.artwork_availability as enum ('available', 'sold', 'reserved');
create type public.artwork_category as enum (
  'heritage', 'temple-art', 'landscape', 'watercolor', 'acrylic', 'sketches', 'other'
);
create type public.inquiry_status as enum ('new', 'read', 'archived');

-- ─── Artists ────────────────────────────────────────────────────────
create table public.artists (
  id            uuid primary key default gen_random_uuid(),
  name          text not null check (char_length(name) between 1 and 120),
  slug          text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  bio           text,
  profile_image text,
  instagram     text,
  youtube       text,
  facebook      text,
  pinterest     text,
  website       text,
  created_at    timestamptz not null default now()
);

-- ─── Artist admins (who may manage which artist) ────────────────────
create table public.artist_admins (
  artist_id  uuid not null references public.artists (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (artist_id, user_id)
);

-- ─── Artworks ───────────────────────────────────────────────────────
create table public.artworks (
  id           uuid primary key default gen_random_uuid(),
  artist_id    uuid not null references public.artists (id) on delete cascade,
  title        text not null check (char_length(title) between 1 and 140),
  slug         text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description  text check (char_length(description) <= 600),
  story        text check (char_length(story) <= 5000),
  year         int check (year between 1900 and 2100),
  medium       text,
  category     public.artwork_category not null default 'other',
  width        numeric(8, 2) check (width > 0),
  height       numeric(8, 2) check (height > 0),
  price        numeric(12, 2) check (price >= 0),
  availability public.artwork_availability not null default 'available',
  featured     boolean not null default false,
  cover_image  text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (artist_id, slug)
);

create index artworks_artist_created_idx on public.artworks (artist_id, created_at desc);
create index artworks_category_idx on public.artworks (artist_id, category);
create index artworks_featured_idx on public.artworks (artist_id) where featured;

-- ─── Artwork images ─────────────────────────────────────────────────
create table public.artwork_images (
  id            uuid primary key default gen_random_uuid(),
  artwork_id    uuid not null references public.artworks (id) on delete cascade,
  image_url     text not null,
  display_order int not null default 0
);

create index artwork_images_artwork_idx on public.artwork_images (artwork_id, display_order);

-- ─── Inquiries ──────────────────────────────────────────────────────
create table public.inquiries (
  id         uuid primary key default gen_random_uuid(),
  artist_id  uuid not null references public.artists (id) on delete cascade,
  artwork_id uuid references public.artworks (id) on delete set null,
  name       text not null check (char_length(name) between 2 and 100),
  email      text not null check (char_length(email) <= 200 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  phone      text check (char_length(phone) <= 30),
  subject    text not null check (char_length(subject) between 2 and 150),
  message    text not null check (char_length(message) between 10 and 5000),
  status     public.inquiry_status not null default 'new',
  created_at timestamptz not null default now()
);

create index inquiries_artist_created_idx on public.inquiries (artist_id, created_at desc);

-- ─── updated_at trigger ─────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger artworks_set_updated_at
before update on public.artworks
for each row execute function public.set_updated_at();

-- ─── Helper: is the current user an admin of this artist? ───────────
create or replace function public.is_artist_admin(target_artist uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.artist_admins
    where artist_id = target_artist and user_id = auth.uid()
  );
$$;

-- ─── Row Level Security ─────────────────────────────────────────────
alter table public.artists        enable row level security;
alter table public.artist_admins  enable row level security;
alter table public.artworks       enable row level security;
alter table public.artwork_images enable row level security;
alter table public.inquiries      enable row level security;

-- Artists: public read, admins update their own profile.
create policy "artists are public" on public.artists
  for select using (true);
create policy "admins update own artist" on public.artists
  for update using (public.is_artist_admin(id)) with check (public.is_artist_admin(id));

-- Artist admins: users can see their own memberships.
create policy "read own memberships" on public.artist_admins
  for select using (user_id = auth.uid());

-- Artworks: public read, admins manage their artist's artworks.
create policy "artworks are public" on public.artworks
  for select using (true);
create policy "admins insert artworks" on public.artworks
  for insert with check (public.is_artist_admin(artist_id));
create policy "admins update artworks" on public.artworks
  for update using (public.is_artist_admin(artist_id)) with check (public.is_artist_admin(artist_id));
create policy "admins delete artworks" on public.artworks
  for delete using (public.is_artist_admin(artist_id));

-- Artwork images: public read, admins manage images of their artworks.
create policy "artwork images are public" on public.artwork_images
  for select using (true);
create policy "admins manage artwork images" on public.artwork_images
  for all
  using (exists (select 1 from public.artworks a where a.id = artwork_id and public.is_artist_admin(a.artist_id)))
  with check (exists (select 1 from public.artworks a where a.id = artwork_id and public.is_artist_admin(a.artist_id)));

-- Inquiries: anyone may submit (status forced to 'new'); only the artist's admins can read/manage.
create policy "anyone can submit inquiries" on public.inquiries
  for insert to anon, authenticated with check (status = 'new');
create policy "admins read inquiries" on public.inquiries
  for select using (public.is_artist_admin(artist_id));
create policy "admins update inquiries" on public.inquiries
  for update using (public.is_artist_admin(artist_id)) with check (public.is_artist_admin(artist_id));
create policy "admins delete inquiries" on public.inquiries
  for delete using (public.is_artist_admin(artist_id));

-- ─── Storage: public "artworks" bucket ──────────────────────────────
-- Objects live at <artist-slug>/<category-folder>/<file>; admins may only write under their artist's slug.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('artworks', 'artworks', true, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "artwork images are publicly readable" on storage.objects
  for select using (bucket_id = 'artworks');

create policy "admins upload to own artist folder" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'artworks'
    and exists (
      select 1 from public.artists ar
      where ar.slug = (storage.foldername(name))[1] and public.is_artist_admin(ar.id)
    )
  );

create policy "admins delete from own artist folder" on storage.objects
  for delete to authenticated using (
    bucket_id = 'artworks'
    and exists (
      select 1 from public.artists ar
      where ar.slug = (storage.foldername(name))[1] and public.is_artist_admin(ar.id)
    )
  );
