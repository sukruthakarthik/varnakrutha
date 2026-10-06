"use client";

import { useQuery } from "@tanstack/react-query";
import { listAdminArtworks } from "@/features/artworks/actions";
import { listInquiries } from "@/features/inquiries/admin-actions";
import type { Artwork, InquiryWithArtwork } from "@/types";

export const adminKeys = {
  artworks: ["admin", "artworks"] as const,
  inquiries: ["admin", "inquiries"] as const,
};

export function useAdminArtworks(initialData: Artwork[]) {
  return useQuery({ queryKey: adminKeys.artworks, queryFn: () => listAdminArtworks(), initialData });
}

export function useAdminInquiries(initialData: InquiryWithArtwork[]) {
  return useQuery({ queryKey: adminKeys.inquiries, queryFn: () => listInquiries(), initialData });
}
