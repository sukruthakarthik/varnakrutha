-- Applications from artists who would like to be featured, submitted at /join
-- and reviewed by platform admins at /admin/applications.

create type public.application_status as enum ('new', 'shortlisted', 'accepted', 'declined');

create table public.artist_applications (
  id            uuid primary key default gen_random_uuid(),
  name          text not null check (char_length(name) between 2 and 100),
  email         text not null check (char_length(email) <= 200 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  phone         text check (char_length(phone) <= 30),
  city          text not null check (char_length(city) between 2 and 100),
  portfolio_url text not null check (char_length(portfolio_url) <= 500 and portfolio_url ~* '^https?://'),
  -- Links to individual sample paintings (Instagram posts, Google Drive/Photos, etc.).
  sample_links  text[] not null default '{}' check (cardinality(sample_links) <= 5),
  mediums       text check (char_length(mediums) <= 200),
  statement     text not null check (char_length(statement) between 30 and 2000),
  status        public.application_status not null default 'new',
  -- Private to platform admins; never shown to the applicant.
  admin_note    text check (char_length(admin_note) <= 2000),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index artist_applications_status_created_idx on public.artist_applications (status, created_at desc);

create trigger artist_applications_set_updated_at
before update on public.artist_applications
for each row execute function public.set_updated_at();

alter table public.artist_applications enable row level security;

-- Anyone may apply, but only as a fresh application; they cannot read applications back.
create policy "anyone can apply" on public.artist_applications
  for insert to anon, authenticated with check (status = 'new' and admin_note is null);

create policy "platform admins read applications" on public.artist_applications
  for select using (public.is_platform_admin());
create policy "platform admins update applications" on public.artist_applications
  for update using (public.is_platform_admin()) with check (public.is_platform_admin());
create policy "platform admins delete applications" on public.artist_applications
  for delete using (public.is_platform_admin());
