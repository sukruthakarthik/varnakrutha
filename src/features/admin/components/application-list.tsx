"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ExternalLink, Mail, Phone, Star, Trash2, UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/common/empty-state";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { deleteApplication, updateApplication } from "@/features/applications/actions";
import { cn } from "@/lib/utils";
import { APPLICATION_STATUS, type ApplicationStatus, type ArtistApplication } from "@/types";
import { formatDate } from "@/utils/format";
import { ConfirmDialog } from "./confirm-dialog";

const STATUS_META: Record<ApplicationStatus, { label: string; variant: BadgeProps["variant"] }> = {
  new: { label: "New", variant: "default" },
  shortlisted: { label: "Shortlisted", variant: "warning" },
  accepted: { label: "Accepted", variant: "success" },
  declined: { label: "Declined", variant: "muted" },
};

const EMAIL_SUBJECT = "Your application to Art By Sukrutha";

/** A starting point for the reply; the admin edits it in their mail app before sending. */
function replyBody(a: ArtistApplication): string {
  switch (a.status) {
    case "accepted":
      return `Hi ${a.name},\n\nThank you for applying to be featured on Art By Sukrutha. I loved your work and would be happy to feature you.\n\nI'll be in touch shortly with the next steps for setting up your profile.\n\nWarm regards,\nSukrutha`;
    case "declined":
      return `Hi ${a.name},\n\nThank you for applying to be featured on Art By Sukrutha and for sharing your work with me.\n\nI'm not able to feature it at the moment, but I wish you all the best and hope you keep painting.\n\nWarm regards,\nSukrutha`;
    default:
      return `Hi ${a.name},\n\nThank you for applying to be featured on Art By Sukrutha.\n\n`;
  }
}

export function ApplicationList({ applications }: { applications: ArtistApplication[] }) {
  const [filter, setFilter] = useState<ApplicationStatus | "all">("all");
  const visible = filter === "all" ? applications : applications.filter((a) => a.status === filter);

  return (
    <div className="space-y-6">
      <div role="group" aria-label="Filter applications" className="flex flex-wrap gap-2">
        {(["all", ...APPLICATION_STATUS] as const).map((s) => (
          <Button
            key={s}
            size="sm"
            variant={filter === s ? "default" : "outline"}
            aria-pressed={filter === s}
            onClick={() => setFilter(s)}
          >
            {s === "all" ? "All" : STATUS_META[s].label} (
            {s === "all" ? applications.length : applications.filter((a) => a.status === s).length})
          </Button>
        ))}
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={UserPlus}
          title="No applications"
          description="Applications from artists who apply at /join will appear here."
        />
      ) : (
        <ul className="space-y-4">
          {visible.map((a) => (
            <ApplicationCard key={a.id} application={a} />
          ))}
        </ul>
      )}
    </div>
  );
}

function ApplicationCard({ application: a }: { application: ArtistApplication }) {
  const router = useRouter();
  const [note, setNote] = useState(a.adminNote ?? "");
  const [pending, startTransition] = useTransition();
  const noteChanged = note.trim() !== (a.adminNote ?? "");

  function save(status: ApplicationStatus, message: string) {
    startTransition(async () => {
      const res = await updateApplication({ id: a.id, status, adminNote: note });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(message);
      router.refresh();
    });
  }

  async function handleDelete() {
    const res = await deleteApplication(a.id);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Application deleted");
    router.refresh();
  }

  const mailto = `mailto:${a.email}?subject=${encodeURIComponent(EMAIL_SUBJECT)}&body=${encodeURIComponent(replyBody(a))}`;

  return (
    <li className={cn("rounded-sm border border-border bg-background p-5", a.status === "new" && "border-l-4 border-l-primary")}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="flex items-center gap-2 font-medium">
            {a.name} <Badge variant={STATUS_META[a.status].variant}>{STATUS_META[a.status].label}</Badge>
          </p>
          <p className="text-sm text-muted-foreground">
            {a.city} ·{" "}
            <a href={`mailto:${a.email}`} className="hover:text-primary">
              {a.email}
            </a>
            {a.phone && (
              <>
                {" · "}
                <a href={`tel:${a.phone}`} className="inline-flex items-center gap-1 hover:text-primary">
                  <Phone className="size-3" aria-hidden />
                  {a.phone}
                </a>
              </>
            )}
          </p>
          {a.mediums && <p className="text-sm">{a.mediums}</p>}
        </div>
        <time dateTime={a.createdAt} className="text-xs text-muted-foreground">
          {formatDate(a.createdAt)}
        </time>
      </div>

      <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-foreground/85">{a.statement}</p>

      <ul className="mt-4 space-y-1 text-sm">
        {[a.portfolioUrl, ...a.sampleLinks].map((url, i) => (
          <li key={i}>
            <a href={url} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1 break-all text-primary hover:underline">
              {i === 0 ? "Portfolio: " : `Sample ${i}: `}
              {url.replace(/^https?:\/\/(www\.)?/, "")}
              <ExternalLink className="size-3 shrink-0" aria-hidden />
            </a>
          </li>
        ))}
      </ul>

      <div className="mt-4 space-y-2">
        <label htmlFor={`note-${a.id}`} className="text-xs font-medium text-muted-foreground">
          Private note (only admins see this)
        </label>
        <Textarea id={`note-${a.id}`} rows={2} className="min-h-16" value={note} onChange={(e) => setNote(e.target.value)} />
        {noteChanged && (
          <Button size="sm" variant="outline" disabled={pending} onClick={() => save(a.status, "Note saved")}>
            Save note
          </Button>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button asChild size="sm" variant="outline">
          <a href={mailto}>
            <Mail aria-hidden /> Email
          </a>
        </Button>
        {a.status !== "shortlisted" && a.status !== "accepted" && (
          <Button size="sm" variant="ghost" disabled={pending} onClick={() => save("shortlisted", "Shortlisted")}>
            <Star aria-hidden /> Shortlist
          </Button>
        )}
        {a.status !== "accepted" && (
          <Button size="sm" variant="ghost" disabled={pending} onClick={() => save("accepted", "Accepted. Email them the next steps.")}>
            <Check aria-hidden /> Accept
          </Button>
        )}
        {a.status !== "declined" && (
          <Button size="sm" variant="ghost" disabled={pending} onClick={() => save("declined", "Declined. Remember to let them know.")}>
            <X aria-hidden /> Decline
          </Button>
        )}
        <ConfirmDialog
          title="Delete application?"
          description={`The application from ${a.name} will be permanently deleted.`}
          onConfirm={handleDelete}
          trigger={
            <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive">
              <Trash2 aria-hidden /> Delete
            </Button>
          }
        />
      </div>
    </li>
  );
}
