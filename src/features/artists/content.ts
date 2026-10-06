export interface ArtistProfileContent {
  journey: string[];
  inspiration: string[];
  skills: string[];
  techniques: { name: string; description: string }[];
}

// Long-form About content lives in code for now; move to a table when artists self-manage profiles.
const profiles: Record<string, ArtistProfileContent> = {
  sukrutha: {
    journey: [
      "Sukrutha's relationship with art began in childhood, sketching the temple towers and village streets she saw on family journeys across South India.",
      "Alongside a professional career, she kept returning to paper and canvas — first as a quiet hobby, then as a serious practice of on-location studies, workshops and long studio sessions.",
      "Today her work focuses on India's architectural heritage and the landscapes that frame it, painted with a patient attention to light, texture and time.",
    ],
    inspiration: [
      "Ancient temples and ruins, where every carved surface holds a story.",
      "Monsoon skies, river valleys and the changing light of the Western Ghats.",
      "Traditional Indian art forms — kolam, murals and temple sculpture.",
    ],
    skills: [
      "Architectural drawing",
      "Watercolor washes & glazing",
      "Acrylic layering",
      "On-location sketching",
      "Composition & perspective",
      "Colour theory",
    ],
    techniques: [
      {
        name: "Watercolor",
        description: "Wet-on-wet skies and layered glazes that let light pass through the paper.",
      },
      {
        name: "Acrylic",
        description: "Rich, opaque colour built up in textured layers for depth and warmth.",
      },
      {
        name: "Graphite & Ink",
        description: "Quick on-site studies that capture structure, proportion and mood.",
      },
    ],
  },
};

export function getArtistProfileContent(slug: string): ArtistProfileContent | null {
  return profiles[slug] ?? null;
}
