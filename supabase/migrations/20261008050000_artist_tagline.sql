-- A short per-artist tagline shown in the home page hero and the footer.
-- Kept short (80 characters) because it sits beside the hero artwork.

-- Added without a default first: adding a column with a default would fill every existing row with it.
alter table public.artists
  add column tagline text check (char_length(tagline) <= 80);

update public.artists
set tagline = 'Original Paintings, Heritage Art, Landscapes and Creative Expressions'
where slug = 'sukrutha' and tagline is null;

-- Sample tagline for newly added artists, like the other profile defaults.
alter table public.artists
  alter column tagline set default 'Original paintings inspired by heritage, nature and everyday life';

grant update (tagline) on public.artists to authenticated;
