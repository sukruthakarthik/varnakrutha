-- Artworks can belong to several categories at once (e.g. a digital, abstract painting).
-- Replaces the single `category` column with a `categories` array.
-- Deploy the app straight after running this: older app code still reads `category`.
-- Safe to run more than once: each step skips itself if it has already been done.

-- New categories. (Postgres can't use a new enum value in the same transaction it was added,
-- which is fine here: nothing below uses them.)
alter type public.artwork_category add value if not exists 'digital' before 'other';
alter type public.artwork_category add value if not exists 'abstract' before 'other';

alter table public.artworks
  add column if not exists categories public.artwork_category[] not null default '{other}';

do $$
begin
  -- Carry every artwork's existing category over, so nothing loses its place in the gallery.
  -- Only while the old column still exists; once it's gone the copy has already happened.
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'artworks' and column_name = 'category'
  ) then
    update public.artworks set categories = array[category];
    drop index if exists public.artworks_category_idx;
    alter table public.artworks drop column category;
  end if;

  -- Every artwork needs 1 to 5 categories (the app enforces the same limit).
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.artworks'::regclass and conname = 'artworks_categories_check'
  ) then
    alter table public.artworks
      add constraint artworks_categories_check check (cardinality(categories) between 1 and 5);
  end if;
end $$;

-- GIN lets "artworks that include category X" lookups use an index.
create index if not exists artworks_categories_idx on public.artworks using gin (categories);
