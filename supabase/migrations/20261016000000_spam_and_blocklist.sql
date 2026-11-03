-- Spam handling without deleting: admins mark enquiries and applications as spam (kept, hidden, restorable),
-- and the sender's email goes on a block list. Anything new from a blocked email is filed as spam
-- automatically. The sender still sees the usual "thank you", so they aren't prompted to switch address.
--
-- New enum values can't be used in the same transaction that adds them, so below they are only
-- referenced as text (status::text) or inside function bodies, which run later.

alter type public.inquiry_status add value if not exists 'spam';
alter type public.application_status add value if not exists 'spam';

-- ─── Block list ─────────────────────────────────────────────────────
create table public.blocked_emails (
  email      text primary key check (email = lower(email) and char_length(email) between 3 and 200),
  -- Private to admins, e.g. "Advertising in applications".
  reason     text check (char_length(reason) <= 500),
  blocked_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.blocked_emails enable row level security;

create policy "platform admins manage blocked emails" on public.blocked_emails
  for all using (public.is_platform_admin()) with check (public.is_platform_admin());

-- ─── File submissions from blocked emails as spam ───────────────────
-- security definer: visitors can't read the block list, but the check must still see it.
create or replace function public.file_blocked_submission_as_spam()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (select 1 from public.blocked_emails where email = lower(trim(new.email))) then
    new.status := 'spam';
  end if;
  return new;
end;
$$;

create trigger inquiries_file_blocked_as_spam
before insert on public.inquiries
for each row execute function public.file_blocked_submission_as_spam();

create trigger artist_applications_file_blocked_as_spam
before insert on public.artist_applications
for each row execute function public.file_blocked_submission_as_spam();

-- Insert policies are checked after the trigger above, so they must allow the 'spam' it may set.
drop policy if exists "anyone can submit inquiries" on public.inquiries;
create policy "anyone can submit inquiries" on public.inquiries
  for insert to anon, authenticated with check (status::text in ('new', 'spam'));

drop policy if exists "anyone can apply" on public.artist_applications;
create policy "anyone can apply" on public.artist_applications
  for insert to anon, authenticated with check (status::text in ('new', 'spam') and admin_note is null);
