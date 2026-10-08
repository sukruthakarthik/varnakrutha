import type { ArtistProfileInput } from "./schemas";

const FIELD_LABELS: Record<keyof ArtistProfileInput, string> = {
  name: "Name",
  tagline: "Tagline",
  bio: "Bio",
  profileImage: "Photo",
  instagram: "Instagram",
  youtube: "YouTube",
  facebook: "Facebook",
  pinterest: "Pinterest",
  website: "Website",
  journey: "Journey",
  inspiration: "Inspiration",
  skills: "Skills",
  techniques: "Techniques",
};

export interface ProfileChange {
  label: string;
  /** The live value, as plain text, for the reviewer to compare against. */
  live: string;
}

function asText(value: ArtistProfileInput[keyof ArtistProfileInput]): string {
  if (value === null || value === "") return "—";
  if (typeof value === "string") return value;
  if (value.length === 0) return "—";
  return value.map((v) => (typeof v === "string" ? v : `${v.name}: ${v.description}`)).join("\n");
}

/** Sections of a submission that differ from the live profile. */
export function changedProfileFields(live: ArtistProfileInput, submitted: ArtistProfileInput): ProfileChange[] {
  return (Object.keys(FIELD_LABELS) as (keyof ArtistProfileInput)[])
    .filter((key) => JSON.stringify(live[key]) !== JSON.stringify(submitted[key]))
    .map((key) => ({ label: FIELD_LABELS[key], live: asText(live[key]) }));
}
