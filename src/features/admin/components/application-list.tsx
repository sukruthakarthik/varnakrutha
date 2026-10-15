"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, ExternalLink, KeyRound, Mail, Phone, Star, Trash2, UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/common/empty-state";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { acceptApplication, deleteApplication, updateApplication } from "@/features/applications/actions";
import { APPLICATION_REPLY_DAYS } from "@/lib/constants";
import { siteConfig } from "@/lib/site";
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

const EMAIL_SUBJECT = `Your application to ${siteConfig.name}`;

/** A starting point for the reply; the admin edits it in their mail app before sending. */
function replyBody(a: ArtistApplication): string {
  switch (a.status) {
    case "accepted":
      return `Hi ${a.name},\n\nThank you for applying to be featured on ${siteConfig.name}. I loved your work and would be happy to feature you.\n\nI've created your artist account. You'll receive a separate email with a link to set your password. Then sign in at ${siteConfig.url}/admin, add your artworks and complete your profile. Your page goes live once I've reviewed it.\n\nWarm regards,\nSukrutha\n${siteConfig.name}`;
    case "declined":
      return `Hi ${a.name},\n\nThank you for applying to be featured on ${siteConfig.name} and for sharing your work with me.\n\nI'm not able to feature it at the moment, but I wish you all the best and hope you keep painting.\n\nWarm regards,\nSukrutha\n${siteConfig.name}`;
    default:
      return `Hi ${a.name},\n\nThank you for applying to be featured on ${siteConfig.name}.\n\n`;
  }
}

/** New and shortlisted applicants haven't had a decision yet; accepting or declining is the reply. */
const AWAITING_REPLY: ApplicationStatus[] = ["new", "shortlisted"];
/** Warn a couple of days before the promised reply time runs out. */
const DUE_SOON_DAYS = APPLICATION_REPLY_DAYS - 2;

function daysWaiting(a: ArtistApplication): number | null {
  if (!AWAITING_REPLY.includes(a.status)) return null;
  return Math.floor((Date.now() - new Date(a.createdAt).getTime()) / 86_400_000);
}

export function ApplicationList({ applications }: { applications: ArtistApplication[] }) {
  const [filter, setFilter] = useState<ApplicationStatus | "all">("all");
  const visible = filter === "all" ? applications : applications.filter((a) => a.status === filter);
  const waiting = applications.map(daysWaiting).filter((d): d is number => d !== null);
  const overdue = waiting.filter((d) => d >= APPLICATION_REPLY_DAYS).length;
  const dueSoon = waiting.filter((d) => d >= DUE_SOON_DAYS && d < APPLICATION_REPLY_DAYS).length;

  return (
    <div className="space-y-6">
      {(overdue > 0 || dueSoon > 0) && (
        <p
          role="status"
          className={cn(
            "rounded-sm border p-4 text-sm",
            overdue > 0
              ? "border-destructive/30 bg-destructive/5 text-destructive"
              : "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-200",
          )}
        >
          Applicants are promised a reply within {APPLICATION_REPLY_DAYS} days.{" "}
          {overdue > 0 && `${overdue} ${overdue === 1 ? "is" : "are"} overdue. `}
          {dueSoon > 0 && `${dueSoon} ${dueSoon === 1 ? "is" : "are"} due in the next two days. `}
          Accept or decline, or send a short &ldquo;still reviewing&rdquo; note with Email.
        </p>
      )}
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
  // Mock mode only: shown once after accepting, since it isn't stored anywhere readable.
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null);
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

  async function handleAccept() {
    const res = await acceptApplication(a.id);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    const { artist, access, temporaryPassword } = res.data;
    if (access === "temporary-password" && temporaryPassword) setTemporaryPassword(temporaryPassword);
    toast.success(
      access === "invited"
        ? `Account created. ${a.email} has been emailed a link to set a password.`
        : access === "existing-account"
          ? `${a.email} already had an account; it now manages ${artist.name}.`
          : "Account created. Copy the temporary password below and send it to the artist.",
    );
    router.refresh();
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
          <p className="flex flex-wrap items-center gap-2 font-medium">
            {a.name} <Badge variant={STATUS_META[a.status].variant}>{STATUS_META[a.status].label}</Badge>
            <WaitingBadge days={daysWaiting(a)} />
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

      {temporaryPassword && (
        <div role="status" className="mt-4 space-y-2 rounded-sm border border-primary/30 bg-secondary/60 p-4 text-sm">
          <p className="flex items-center gap-2 font-medium">
            <KeyRound className="size-4" aria-hidden /> Temporary password (shown once)
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <code className="rounded-sm bg-background px-2 py-1 font-mono">{temporaryPassword}</code>
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigator.clipboard.writeText(temporaryPassword).then(() => toast.success("Copied"))}
            >
              <Copy aria-hidden /> Copy
            </Button>
          </div>
          <p className="text-muted-foreground">The artist signs in at /admin/login with {a.email} and this password.</p>
        </div>
      )}

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
        {/* Also offered for applications accepted before accepting created accounts, which have no artist yet. */}
        {!a.artistId && (
          <ConfirmDialog
            title={a.status === "accepted" ? `Create ${a.name}'s account?` : `Accept ${a.name}?`}
            description={`This creates an artist account for ${a.email}. They can add and edit only their own artworks, and their page goes live once you approve their profile.`}
            confirmLabel={a.status === "accepted" ? "Create account" : "Accept and create account"}
            confirmVariant="default"
            onConfirm={handleAccept}
            trigger={
              <Button size="sm" variant="ghost" disabled={pending}>
                <Check aria-hidden /> {a.status === "accepted" ? "Create account" : "Accept"}
              </Button>
            }
          />
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

function WaitingBadge({ days }: { days: number | null }) {
  if (days === null || days < DUE_SOON_DAYS) return null;
  const overdue = days >= APPLICATION_REPLY_DAYS;
  return (
    <span
      className={cn(
        "rounded-full px-2.5 py-0.5 text-xs font-medium",
        overdue
          ? "bg-destructive/10 text-destructive"
          : "bg-amber-50 text-amber-800 ring-1 ring-amber-200 dark:bg-amber-950/60 dark:text-amber-200 dark:ring-amber-800",
      )}
    >
      {overdue ? `Reply overdue · ${days} days` : `Reply due · ${days} days`}
    </span>
  );
}
