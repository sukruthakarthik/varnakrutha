-- Artist profile content for the About page, editable by the artist from /admin/profile.
-- Previously this lived in code (src/features/artists/content.ts).

alter table public.artists
  add column journey     text[] not null default '{}',
  add column inspiration text[] not null default '{}',
  add column skills      text[] not null default '{}',
  -- [{ "name": "Watercolor", "description": "..." }, ...]
  add column techniques  jsonb  not null default '[]'::jsonb
    check (jsonb_typeof(techniques) = 'array');

alter table public.artists
  add constraint artists_bio_length check (char_length(bio) <= 2000);

-- Artists may edit their own profile, but not their id or slug: the slug names their
-- storage folder and URLs. RLS picks the row; column grants limit what can change in it.
revoke update on public.artists from anon, authenticated;
grant update (
  name, bio, profile_image, instagram, youtube, facebook, pinterest, website,
  journey, inspiration, skills, techniques
) on public.artists to authenticated;

-- Carry over the About content that was previously hard-coded.
update public.artists
set
  journey = array[
    'Sukrutha''s relationship with art began in childhood, sketching the temple towers and village streets she saw on family journeys across South India.',
    'Alongside a professional career, she kept returning to paper and canvas — first as a quiet hobby, then as a serious practice of on-location studies, workshops and long studio sessions.',
    'Today her work focuses on India''s architectural heritage and the landscapes that frame it, painted with a patient attention to light, texture and time.'
  ],
  inspiration = array[
    'Ancient temples and ruins, where every carved surface holds a story.',
    'Monsoon skies, river valleys and the changing light of the Western Ghats.',
    'Traditional Indian art forms — kolam, murals and temple sculpture.'
  ],
  skills = array[
    'Architectural drawing',
    'Watercolor washes & glazing',
    'Acrylic layering',
    'On-location sketching',
    'Composition & perspective',
    'Colour theory'
  ],
  techniques = '[
    {"name": "Watercolor", "description": "Wet-on-wet skies and layered glazes that let light pass through the paper."},
    {"name": "Acrylic", "description": "Rich, opaque colour built up in textured layers for depth and warmth."},
    {"name": "Graphite & Ink", "description": "Quick on-site studies that capture structure, proportion and mood."}
  ]'::jsonb
where slug = 'sukrutha' and cardinality(journey) = 0;
