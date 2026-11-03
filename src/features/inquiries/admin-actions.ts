"use server";

import { z } from "zod";
import { actionError, type ActionResult } from "@/lib/action-result";
import { requirePlatformAdminAction } from "@/lib/auth";
import { INQUIRY_STATUS, type InquiryStatus, type InquiryWithArtwork } from "@/types";

const idSchema = z.string().uuid();

// Inquiries are handled by admins only, for every artist on the site.
async function getInquiry(id: string) {
  const admin = await requirePlatformAdminAction();
  const inquiry = (await admin.dataSource.inquiries.list()).find((i) => i.id === idSchema.parse(id));
  if (!inquiry) throw new Error("Inquiry not found");
  return { admin, inquiry };
}

export async function listInquiries(): Promise<InquiryWithArtwork[]> {
  const admin = await requirePlatformAdminAction();
  return admin.dataSource.inquiries.list();
}

/** New / read / archived. Spam is set and cleared with markInquirySpam / markInquiryNotSpam. */
export async function setInquiryStatus(id: string, status: InquiryStatus): Promise<ActionResult> {
  try {
    const { admin, inquiry } = await getInquiry(id);
    const next = z.enum(INQUIRY_STATUS).parse(status);
    if (next === "spam" || inquiry.status === "spam") return { ok: false, error: "Use Mark as spam or Not spam for this." };
    await admin.dataSource.inquiries.setStatus(inquiry.id, next);
    return { ok: true, data: undefined };
  } catch (error) {
    return actionError(error);
  }
}

/** Moves the enquiry to Spam (kept, hidden, restorable) and blocks the sender's email for future messages. */
export async function markInquirySpam(id: string): Promise<ActionResult> {
  try {
    const { admin, inquiry } = await getInquiry(id);
    await admin.dataSource.inquiries.setStatus(inquiry.id, "spam");
    await admin.dataSource.blocklist.block(inquiry.email, `Spam enquiry from ${inquiry.name}`);
    return { ok: true, data: undefined };
  } catch (error) {
    return actionError(error);
  }
}

/** Restores a spam enquiry to the inbox and unblocks the sender. */
export async function markInquiryNotSpam(id: string): Promise<ActionResult> {
  try {
    const { admin, inquiry } = await getInquiry(id);
    await admin.dataSource.inquiries.setStatus(inquiry.id, "new");
    await admin.dataSource.blocklist.unblock(inquiry.email);
    return { ok: true, data: undefined };
  } catch (error) {
    return actionError(error);
  }
}

/** Permanent; only for spam or archived enquiries (e.g. clearing old spam, or a deletion request). */
export async function deleteInquiry(id: string): Promise<ActionResult> {
  try {
    const { admin, inquiry } = await getInquiry(id);
    if (inquiry.status !== "spam" && inquiry.status !== "archived") {
      return { ok: false, error: "Only spam or archived enquiries can be deleted. Archive it or mark it as spam first." };
    }
    await admin.dataSource.inquiries.delete(inquiry.id);
    return { ok: true, data: undefined };
  } catch (error) {
    return actionError(error);
  }
}
