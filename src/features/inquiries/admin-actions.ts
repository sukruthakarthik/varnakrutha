"use server";

import { z } from "zod";
import { actionError, type ActionResult } from "@/lib/action-result";
import { requirePlatformAdminAction } from "@/lib/auth";
import { INQUIRY_STATUS, type InquiryStatus, type InquiryWithArtwork } from "@/types";

const idSchema = z.string().uuid();

// Inquiries are handled by admins only, for every artist on the site.
async function assertExists(id: string) {
  const admin = await requirePlatformAdminAction();
  const inquiries = await admin.dataSource.inquiries.list();
  if (!inquiries.some((i) => i.id === idSchema.parse(id))) throw new Error("Inquiry not found");
  return admin;
}

export async function listInquiries(): Promise<InquiryWithArtwork[]> {
  const admin = await requirePlatformAdminAction();
  return admin.dataSource.inquiries.list();
}

export async function setInquiryStatus(id: string, status: InquiryStatus): Promise<ActionResult> {
  try {
    const admin = await assertExists(id);
    await admin.dataSource.inquiries.setStatus(id, z.enum(INQUIRY_STATUS).parse(status));
    return { ok: true, data: undefined };
  } catch (error) {
    return actionError(error);
  }
}

export async function deleteInquiry(id: string): Promise<ActionResult> {
  try {
    const admin = await assertExists(id);
    await admin.dataSource.inquiries.delete(id);
    return { ok: true, data: undefined };
  } catch (error) {
    return actionError(error);
  }
}
