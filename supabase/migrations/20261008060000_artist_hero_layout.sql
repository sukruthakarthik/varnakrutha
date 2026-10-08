-- Which home page hero layout the artist prefers, chosen at /admin/profile:
--   split   — text and artwork side by side, half each
--   wide    — artwork takes about three quarters of the width
--   overlay — artwork fills the hero, text sits on a translucent panel in the centre
-- Existing artists get 'wide', the layout already live.

alter table public.artists
  add column hero_layout text not null default 'wide'
    check (hero_layout in ('split', 'wide', 'overlay'));

grant update (hero_layout) on public.artists to authenticated;
