"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, FileText, FlaskConical, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConfirmDialog } from "@/features/admin/components/confirm-dialog";
import type { LabFile } from "@/services/lab";
import { formatDate } from "@/utils/format";
import { deleteLabResource, uploadLabResource } from "../actions";

const MAX_BYTES = 4 * 1024 * 1024; // keep in step with LAB_MAX_UPLOAD_BYTES in services/lab

function formatSize(bytes: number | null): string {
  if (bytes === null) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const titleCase = (folder: string) => folder.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export function LabManager({ files, storage }: { files: LabFile[]; storage: "supabase" | "local" }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [subject, setSubject] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  const subjects = [...new Set(files.map((f) => f.subject))].sort();
  const bySubject = subjects.map((s) => ({ subject: s, files: files.filter((f) => f.subject === s) }));

  function onUpload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const chosen = Array.from(fileInput.current?.files ?? []);
    if (chosen.length === 0) {
      toast.error("Choose at least one file to upload.");
      return;
    }
    if (chosen.reduce((sum, f) => sum + f.size, 0) > MAX_BYTES) {
      toast.error("That's over 4 MB in total. Upload in smaller batches, or use the Supabase dashboard (see the note below).");
      return;
    }
    const data = new FormData();
    data.set("subject", subject);
    for (const file of chosen) data.append("file", file);
    startTransition(async () => {
      const res = await uploadLabResource(data);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(`Uploaded ${res.data.count} ${res.data.count === 1 ? "file" : "files"} to ${titleCase(res.data.folder)}`);
      form.reset();
      router.refresh();
    });
  }

  async function onDelete(path: string) {
    const res = await deleteLabResource(path);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Deleted");
    router.refresh();
  }

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Add a resource</CardTitle>
          <CardDescription>
            Interactive HTML pages, worksheets, PDFs, images… up to 4 MB per upload. For an HTML page that uses its
            own CSS, script or image files, select them all together so they share the subject folder.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onUpload} className="grid gap-4 sm:grid-cols-[1fr_1.4fr_auto] sm:items-end">
            <div className="space-y-1.5">
              <Label htmlFor="lab-subject">Subject</Label>
              <Input
                id="lab-subject"
                list="lab-subjects"
                placeholder="e.g. Science, Maths, Phonics"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                maxLength={60}
              />
              <datalist id="lab-subjects">
                {subjects.map((s) => (
                  <option key={s} value={titleCase(s)} />
                ))}
              </datalist>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lab-file">Files</Label>
              <Input id="lab-file" ref={fileInput} type="file" multiple required />
            </div>
            <Button type="submit" disabled={pending}>
              <Upload aria-hidden /> {pending ? "Uploading…" : "Upload"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {bySubject.length === 0 ? (
        <EmptyState icon={FlaskConical} title="The Lab is empty" description="Upload your first resource above." />
      ) : (
        bySubject.map(({ subject: s, files: list }) => (
          <section key={s} className="space-y-3">
            <h2 className="font-serif text-2xl">{titleCase(s)}</h2>
            <ul className="divide-y divide-border rounded-sm border border-border bg-background">
              {list.map((f) => (
                <li key={f.path} className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
                  <div className="flex min-w-0 items-center gap-3">
                    <FileText className="size-5 shrink-0 text-muted-foreground" aria-hidden />
                    <div className="min-w-0">
                      <p className="truncate font-medium">{f.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {[formatSize(f.size), f.updatedAt ? formatDate(f.updatedAt) : null].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button asChild size="sm" variant="outline">
                      <a href={`/admin/lab/file?path=${encodeURIComponent(f.path)}`} target="_blank" rel="noopener noreferrer">
                        <ExternalLink aria-hidden /> Open
                      </a>
                    </Button>
                    <ConfirmDialog
                      title="Delete this file?"
                      description={`${f.name} will be deleted permanently.`}
                      onConfirm={() => onDelete(f.path)}
                      trigger={
                        <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" aria-label={`Delete ${f.name}`}>
                          <Trash2 aria-hidden />
                        </Button>
                      }
                    />
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}

      <p className="text-xs text-muted-foreground">
        {storage === "supabase"
          ? "Stored privately in Supabase (bucket “lab”). For bigger files (up to 50 MB): Supabase → Storage → lab → open or create a subject folder → Upload; they appear here too. Open gives a private link that works for 2 hours. HTML pages run sealed off from the site, so they can’t save progress in the browser."
          : "Local testing: files are saved in .data/lab on this computer (not committed or deployed). Open gives a private link that works for 2 hours."}
      </p>
    </div>
  );
}
