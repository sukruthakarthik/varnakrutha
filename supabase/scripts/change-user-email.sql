-- Changes the email a user signs in with. Run by hand in the Supabase SQL Editor when someone asks for it.
-- This is not a migration: don't move it into supabase/migrations.
--
-- 1. Replace the two addresses below. Don't save real addresses back into this file.
-- 2. Run it. Everything happens in one statement, so if any part fails, nothing changes.
-- 3. Check the result: logins_updated should be 1, and the other two normally 1.
--      logins_updated = 0      The old address didn't match anyone. Check Authentication -> Users.
--      "duplicate key" error   The new address already belongs to another login.
--
-- The password stays the same. No verification email is sent, so check the new address carefully, then send
-- a set-password link to confirm it works (Authentication -> Users -> Send password recovery).

with v as (
  select lower('old-address@example.com') as old_email, lower('new-address@example.com') as new_email
),
-- The address used to sign in.
u as (
  update auth.users a
  set email = v.new_email, updated_at = now()
  from v
  where lower(a.email) = v.old_email
  returning a.id, a.email
),
-- Supabase keeps a second copy of it here.
i as (
  update auth.identities d
  set identity_data = d.identity_data || jsonb_build_object('email', u.email), updated_at = now()
  from u
  where d.user_id = u.id and d.provider = 'email'
  returning d.user_id
),
-- Admin -> Applications -> "Send set-password email" reads the address from the application.
p as (
  update public.artist_applications x
  set email = v.new_email
  from v
  where lower(x.email) = v.old_email
  returning x.id
)
select (select count(*) from u) as logins_updated,
       (select count(*) from i) as identities_updated,
       (select count(*) from p) as applications_updated;
