-- Digital artworks are sold as prints. Store the print file's size in pixels, which decides
-- which print sizes (A5–A2) will look sharp. Physical works leave these empty.
-- Safe to run more than once.
alter table public.artworks
  add column if not exists pixel_width int check (pixel_width between 1 and 100000),
  add column if not exists pixel_height int check (pixel_height between 1 and 100000);
