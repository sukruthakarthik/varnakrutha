"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Archive, Inbox, Mail, MailOpen, Phone, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/common/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { deleteInquiry, setInquiryStatus } from "@/features/inquiries/admin-actions";
import { cn } from "@/lib/utils";
import { INQUIRY_STATUS, type InquiryStatus, type InquiryWithArtwork } from "@/types";
import { formatDate } from "@/utils/format";
import { adminKeys, useAdminInquiries } from "../hooks";
import { ConfirmDialog } from "./confirm-dialog";

const STATUS_LABEL: Record<InquiryStatus, string> = { new: "New", read: "Read", archived: "Archived" };

export function InquiryList({ initialData }: { initialData: InquiryWithArtwork[] }) {
  const queryClient = useQueryClient();
  const { data: inquiries } = useAdminInquiries(initialData);
  const [filter, setFilter] = useState<InquiryStatus | "all">("all");

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: InquiryStatus }) => {
      const res = await setInquiryStatus(id, status);
      if (!res.ok) throw new Error(res.error);
    },
    onError: (error) => toast.error(error.message),
    onSettled: () => queryClient.invalidateQueries({ queryKey: adminKeys.inquiries }),
  });

  async function handleDelete(id: string) {
    const res = await deleteInquiry(id);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Inquiry deleted");
    await queryClient.invalidateQueries({ queryKey: adminKeys.inquiries });
  }

  const visible = filter === "all" ? inquiries : inquiries.filter((i) => i.status === filter);

  return (
    <div className="space-y-6">
      <div role="group" aria-label="Filter inquiries" className="flex flex-wrap gap-2">
        {(["all", ...INQUIRY_STATUS] as const).map((s) => (
          <Button
            key={s}
            size="sm"
            variant={filter === s ? "default" : "outline"}
            aria-pressed={filter === s}
            onClick={() => setFilter(s)}
          >
            {s === "all" ? "All" : STATUS_LABEL[s]} (
            {s === "all" ? inquiries.length : inquiries.filter((i) => i.status === s).length})
          </Button>
        ))}
      </div>

      {visible.length === 0 ? (
        <EmptyState icon={Inbox} title="No inquiries" description="Messages from the contact form will appear here." />
      ) : (
        <ul className="space-y-4">
          {visible.map((i) => (
            <li key={i.id} className={cn("rounded-sm border border-border bg-background p-5", i.status === "new" && "border-l-4 border-l-primary")}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="font-medium">
                    {i.subject} {i.status === "new" && <Badge className="ml-2">New</Badge>}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {i.name} ·{" "}
                    <a href={`mailto:${i.email}`} className="hover:text-primary">
                      {i.email}
                    </a>
                    {i.phone && (
                      <>
                        {" · "}
                        <a href={`tel:${i.phone}`} className="inline-flex items-center gap-1 hover:text-primary">
                          <Phone className="size-3" aria-hidden />
                          {i.phone}
                        </a>
                      </>
                    )}
                  </p>
                  {i.artwork && (
                    <p className="text-xs">
                      Re:{" "}
                      <Link href={`/artworks/${i.artwork.slug}`} target="_blank" className="text-primary hover:underline">
                        {i.artwork.title}
                      </Link>
                    </p>
                  )}
                </div>
                <time dateTime={i.createdAt} className="text-xs text-muted-foreground">
                  {formatDate(i.createdAt)}
                </time>
              </div>
              <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-foreground/85">{i.message}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button asChild size="sm" variant="outline">
                  <a href={`mailto:${i.email}?subject=${encodeURIComponent(`Re: ${i.subject}`)}`}>
                    <Mail aria-hidden /> Reply
                  </a>
                </Button>
                {i.status !== "read" && (
                  <Button size="sm" variant="ghost" onClick={() => statusMutation.mutate({ id: i.id, status: "read" })}>
                    <MailOpen aria-hidden /> Mark read
                  </Button>
                )}
                {i.status !== "archived" && (
                  <Button size="sm" variant="ghost" onClick={() => statusMutation.mutate({ id: i.id, status: "archived" })}>
                    <Archive aria-hidden /> Archive
                  </Button>
                )}
                <ConfirmDialog
                  title="Delete inquiry?"
                  description={`The message from ${i.name} will be permanently deleted.`}
                  onConfirm={() => handleDelete(i.id)}
                  trigger={
                    <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive">
                      <Trash2 aria-hidden /> Delete
                    </Button>
                  }
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
