-- Artworks can belong to several categories at once (e.g. a digital, abstract painting).
-- Replaces the single `category` column with a `categories` array.
-- Deploy the app straight after running this: older app code still reads `category`.

-- New categories. (Postgres can't use a new enum value in the same transaction it was added,
-- which is fine here: nothing below uses them.)
alter type public.artwork_category add value if not exists 'digital' before 'other';
alter type public.artwork_category add value if not exists 'abstract' before 'other';

alter table public.artworks
  add column categories public.artwork_category[] not null default '{other}'
  check (cardinality(categories) between 1 and 5);

-- Carry every artwork's existing category over, so nothing loses its place in the gallery.
update public.artworks set categories = array[category];

drop index if exists public.artworks_category_idx;
alter table public.artworks drop column category;

-- GIN lets "artworks that include category X" lookups use an index.
create index artworks_categories_idx on public.artworks using gin (categories);
