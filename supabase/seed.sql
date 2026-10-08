-- Sample seed data (mirrors src/data/seed.ts). Replace with your real artworks.
-- Image paths are relative and served from the Next.js /public folder until
-- you upload real images to the Supabase "artworks" bucket via /admin.

insert into public.artists (id, name, slug, tagline, hero_layout, bio, profile_image, instagram, youtube, facebook, pinterest, journey, inspiration, skills, techniques, approved_at, created_at)
values (
  '00000000-0000-4000-8000-000000000001',
  'Sukrutha Karthik',
  'sukrutha',
  'Original Paintings, Heritage Art, Landscapes and Creative Expressions',
  'wide',
  'Sukrutha Karthik is an Indian artist who paints heritage monuments, temple architecture and the landscapes that surround them. Working mainly in watercolor and acrylic, she is drawn to the quiet dialogue between stone, light and time.',
  '/artists/sukrutha/profile.svg',
  'https://www.instagram.com/',
  'https://www.youtube.com/',
  'https://www.facebook.com/',
  'https://www.pinterest.com/',
  array[
    'Sukrutha''s relationship with art began in childhood, sketching the temple towers and village streets she saw on family journeys across South India.',
    'Alongside a professional career, she kept returning to paper and canvas — first as a quiet hobby, then as a serious practice of on-location studies, workshops and long studio sessions.',
    'Today her work focuses on India''s architectural heritage and the landscapes that frame it, painted with a patient attention to light, texture and time.'
  ],
  array[
    'Ancient temples and ruins, where every carved surface holds a story.',
    'Monsoon skies, river valleys and the changing light of the Western Ghats.',
    'Traditional Indian art forms — kolam, murals and temple sculpture.'
  ],
  array[
    'Architectural drawing',
    'Watercolor washes & glazing',
    'Acrylic layering',
    'On-location sketching',
    'Composition & perspective',
    'Colour theory'
  ],
  '[
    {"name": "Watercolor", "description": "Wet-on-wet skies and layered glazes that let light pass through the paper."},
    {"name": "Acrylic", "description": "Rich, opaque colour built up in textured layers for depth and warmth."},
    {"name": "Graphite & Ink", "description": "Quick on-site studies that capture structure, proportion and mood."}
  ]'::jsonb,
  '2026-01-01T00:00:00Z',
  '2026-01-01T00:00:00Z'
)
on conflict (id) do nothing;

insert into public.artworks
  (id, artist_id, title, slug, description, story, year, medium, category, width, height, price, availability, featured, cover_image, created_at)
values
  ('10000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001', 'Lepakshi Temple', 'lepakshi-temple-watercolor',
   'The Veerabhadra temple at Lepakshi in soft morning light, its carved pillars glowing against a pale sky.',
   'I first visited Lepakshi on a winter morning when the stone was still cool to the touch. The famous hanging pillar, the monolithic Nandi and the faded ceiling murals stayed with me for weeks. This painting began as a quick sketch on site and was completed in the studio over many layered washes, trying to hold on to that first impression of light moving across granite.',
   2024, 'Watercolor on paper', 'heritage', 56, 38, 18000, 'available', true,
   '/artworks/sukrutha/heritage/heritage-lepakshi-temple-watercolor-main.svg', '2024-01-01T00:00:00Z'),
  ('10000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000001', 'Hampi Stone Chariot', 'hampi-stone-chariot',
   'The iconic stone chariot of the Vittala temple complex, painted in warm late-afternoon tones.',
   'Hampi feels like a city that is still breathing. I wanted the chariot to feel less like a monument and more like something that could roll forward at any moment, so I kept the edges loose and let the sunset colours bleed into the stone.',
   2023, 'Acrylic on canvas', 'heritage', 60, 45, 24000, 'sold', true,
   '/artworks/sukrutha/heritage/heritage-hampi-stone-chariot-main.svg', '2023-02-01T00:00:00Z'),
  ('10000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000001', 'Meenakshi Temple Gopuram', 'meenakshi-temple-gopuram',
   'A towering, colour-rich study of the southern gopuram of the Meenakshi Amman temple in Madurai.',
   'Thousands of sculpted figures crowd each tier of the gopuram. Rather than painting every one, I tried to capture the rhythm they create together — a vertical song of colour rising into the sky.',
   2024, 'Acrylic on canvas', 'temple-art', 45, 75, 32000, 'available', true,
   '/artworks/sukrutha/temple-art/temple-art-meenakshi-temple-gopuram-main.svg', '2024-03-01T00:00:00Z'),
  ('10000000-0000-4000-8000-000000000004', '00000000-0000-4000-8000-000000000001', 'Monsoon over the Western Ghats', 'western-ghats-monsoon',
   'Rolling mist and deep greens over the Sahyadri hills during the first rains.',
   'Painted wet-on-wet to let the clouds form on their own. Watercolor behaves a little like the monsoon itself — you guide it, but you never fully control it.',
   2025, 'Watercolor on paper', 'landscape', 50, 35, 15000, 'available', true,
   '/artworks/sukrutha/landscapes/landscape-western-ghats-monsoon-main.svg', '2025-04-01T00:00:00Z'),
  ('10000000-0000-4000-8000-000000000005', '00000000-0000-4000-8000-000000000001', 'Backwaters at Dusk', 'kerala-backwaters-dusk',
   'A lone boat drifting through the Kerala backwaters as the sky turns amber.',
   'A small, quiet piece painted in a single sitting. I wanted to keep it simple: water, sky, and the silhouette of palms.',
   2025, 'Watercolor on paper', 'watercolor', 38, 28, 12000, 'reserved', false,
   '/artworks/sukrutha/watercolor/watercolor-kerala-backwaters-dusk-main.svg', '2025-05-01T00:00:00Z'),
  ('10000000-0000-4000-8000-000000000006', '00000000-0000-4000-8000-000000000001', 'Lotus Pond', 'lotus-pond-acrylic',
   'Pink lotuses rising from a still temple tank, rendered in layered acrylic.',
   'Temple tanks are often overlooked in favour of the temples themselves. This painting is a small tribute to the stillness they hold.',
   2023, 'Acrylic on canvas', 'acrylic', 40, 40, 16000, 'available', false,
   '/artworks/sukrutha/acrylic/acrylic-lotus-pond-acrylic-main.svg', '2023-06-01T00:00:00Z'),
  ('10000000-0000-4000-8000-000000000007', '00000000-0000-4000-8000-000000000001', 'Mysore Palace Study', 'mysore-palace-study',
   'An on-location graphite study of the domes and arches of the Mysore Palace.',
   'Drawn over two hours while sitting on the palace lawns. Sketches like this are where most of my paintings begin.',
   2022, 'Graphite on paper', 'sketches', 42, 30, null, 'available', false,
   '/artworks/sukrutha/sketches/sketches-mysore-palace-study-main.svg', '2022-07-01T00:00:00Z'),
  ('10000000-0000-4000-8000-000000000008', '00000000-0000-4000-8000-000000000001', 'Rhythms of Kolam', 'rhythms-of-kolam',
   'An abstract piece inspired by the geometry of kolam patterns drawn at doorsteps.',
   'Every morning, kolam patterns appear and disappear on doorsteps across South India. This piece explores that cycle of making and letting go.',
   2025, 'Mixed media on board', 'other', 30, 30, 9000, 'available', false,
   '/artworks/sukrutha/other/other-rhythms-of-kolam-main.svg', '2025-08-01T00:00:00Z')
on conflict (id) do nothing;

insert into public.artwork_images (id, artwork_id, image_url, display_order)
values
  ('20000000-0000-4000-8000-000000000100', '10000000-0000-4000-8000-000000000001', '/artworks/sukrutha/heritage/heritage-lepakshi-temple-watercolor-main.svg', 0),
  ('20000000-0000-4000-8000-000000000101', '10000000-0000-4000-8000-000000000001', '/artworks/sukrutha/heritage/heritage-lepakshi-temple-watercolor-detail-1.svg', 1),
  ('20000000-0000-4000-8000-000000000102', '10000000-0000-4000-8000-000000000001', '/artworks/sukrutha/heritage/heritage-lepakshi-temple-watercolor-detail-2.svg', 2),
  ('20000000-0000-4000-8000-000000000200', '10000000-0000-4000-8000-000000000002', '/artworks/sukrutha/heritage/heritage-hampi-stone-chariot-main.svg', 0),
  ('20000000-0000-4000-8000-000000000201', '10000000-0000-4000-8000-000000000002', '/artworks/sukrutha/heritage/heritage-hampi-stone-chariot-detail-1.svg', 1),
  ('20000000-0000-4000-8000-000000000300', '10000000-0000-4000-8000-000000000003', '/artworks/sukrutha/temple-art/temple-art-meenakshi-temple-gopuram-main.svg', 0),
  ('20000000-0000-4000-8000-000000000301', '10000000-0000-4000-8000-000000000003', '/artworks/sukrutha/temple-art/temple-art-meenakshi-temple-gopuram-detail-1.svg', 1),
  ('20000000-0000-4000-8000-000000000302', '10000000-0000-4000-8000-000000000003', '/artworks/sukrutha/temple-art/temple-art-meenakshi-temple-gopuram-detail-2.svg', 2),
  ('20000000-0000-4000-8000-000000000400', '10000000-0000-4000-8000-000000000004', '/artworks/sukrutha/landscapes/landscape-western-ghats-monsoon-main.svg', 0),
  ('20000000-0000-4000-8000-000000000500', '10000000-0000-4000-8000-000000000005', '/artworks/sukrutha/watercolor/watercolor-kerala-backwaters-dusk-main.svg', 0),
  ('20000000-0000-4000-8000-000000000600', '10000000-0000-4000-8000-000000000006', '/artworks/sukrutha/acrylic/acrylic-lotus-pond-acrylic-main.svg', 0),
  ('20000000-0000-4000-8000-000000000601', '10000000-0000-4000-8000-000000000006', '/artworks/sukrutha/acrylic/acrylic-lotus-pond-acrylic-detail-1.svg', 1),
  ('20000000-0000-4000-8000-000000000700', '10000000-0000-4000-8000-000000000007', '/artworks/sukrutha/sketches/sketches-mysore-palace-study-main.svg', 0),
  ('20000000-0000-4000-8000-000000000800', '10000000-0000-4000-8000-000000000008', '/artworks/sukrutha/other/other-rhythms-of-kolam-main.svg', 0)
on conflict (id) do nothing;

-- Grant admin access (run after creating your user in Supabase Auth):
-- insert into public.artist_admins (artist_id, user_id)
-- select '00000000-0000-4000-8000-000000000001', id from auth.users where email = 'you@example.com';
