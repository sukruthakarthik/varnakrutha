-- Sample About content for newly added artists, so their About page is never empty.
-- Written without a name or pronouns; artists replace it from /admin/profile.
-- Only affects artists created from now on; existing rows keep their content.

alter table public.artists
  alter column bio set default
    'An artist inspired by heritage, nature and everyday life, working across watercolor, acrylic and sketching. Each piece is an attempt to capture a place, a mood or a moment worth remembering.',
  alter column journey set default array[
    'Art has been a constant companion since childhood, beginning with pencil sketches in school notebooks and drawings of familiar streets, temples and landscapes.',
    'Over the years, that early curiosity grew into a steady practice of studying light, colour and form through workshops, on-location sketching and long studio sessions.',
    'Today the work explores the places and stories that leave a lasting impression, painted with patience and close attention to detail.'
  ],
  alter column inspiration set default array[
    'Historic architecture and the stories carved into old stone.',
    'Changing skies, seasons and the quiet beauty of landscapes.',
    'Traditional art forms and the craftspeople who keep them alive.'
  ],
  alter column skills set default array[
    'Drawing & sketching',
    'Watercolor',
    'Acrylic painting',
    'Composition',
    'Colour theory'
  ],
  alter column techniques set default '[
    {"name": "Watercolor", "description": "Transparent washes and layered glazes that let light glow through the paper."},
    {"name": "Acrylic", "description": "Bold, opaque colour built up in layers for depth and texture."},
    {"name": "Pencil & Ink", "description": "Quick studies that capture structure, proportion and mood."}
  ]'::jsonb;
