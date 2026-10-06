"use client";

import { useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Loader2, Star, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { uploadArtworkImage } from "@/features/artworks/actions";
import { ArtworkImage } from "@/features/artworks/components/artwork-image";
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_BYTES, MAX_IMAGE_LABEL } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { Category } from "@/types";

interface ImageManagerProps {
  images: string[];
  cover: string | null;
  category: Category;
  slug: string;
  onChange: (images: string[], cover: string | null) => void;
}

export function ImageManager({ images, cover, category, slug, onChange }: ImageManagerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(0);

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    if (!slug) {
      toast.error("Add a title first so images can be named correctly.");
      return;
    }
    const accepted = Array.from(files).filter((f) => {
      const ok = (ALLOWED_IMAGE_TYPES as readonly string[]).includes(f.type) && f.size <= MAX_IMAGE_BYTES;
      if (!ok) toast.error(`${f.name}: use JPEG, PNG or WebP under ${MAX_IMAGE_LABEL}`);
      return ok;
    });

    setUploading((n) => n + accepted.length);
    let next = [...images];
    let nextCover = cover;
    for (const file of accepted) {
      const fd = new FormData();
      fd.set("file", file);
      fd.set("category", category);
      fd.set("slug", slug);
      const res = await uploadArtworkImage(fd);
      setUploading((n) => n - 1);
      if (!res.ok) {
        toast.error(`${file.name}: ${res.error}`);
        continue;
      }
      next = [...next, res.data.url];
      nextCover ??= res.data.url;
      onChange(next, nextCover);
    }
    if (inputRef.current) inputRef.current.value = "";
  }

  function move(index: number, delta: -1 | 1) {
    const target = index + delta;
    if (target < 0 || target >= images.length) return;
    const next = [...images];
    [next[index], next[target]] = [next[target]!, next[index]!];
    onChange(next, cover);
  }

  function remove(url: string) {
    const next = images.filter((i) => i !== url);
    onChange(next, cover === url ? (next[0] ?? null) : cover);
  }

  return (
    <div className="space-y-4">
      {images.length > 0 && (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {images.map((url, i) => (
            <li key={url} className={cn("overflow-hidden rounded-sm border bg-background", cover === url ? "border-primary ring-2 ring-primary/40" : "border-border")}>
              <div className="relative aspect-square bg-secondary">
                <ArtworkImage src={url} alt={`Image ${i + 1}`} sizes="200px" />
                {cover === url && (
                  <span className="absolute left-2 top-2 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">Cover</span>
                )}
              </div>
              <div className="flex items-center justify-between p-1">
                <Button type="button" variant="ghost" size="icon" className="size-8" aria-label="Move left" disabled={i === 0} onClick={() => move(i, -1)}>
                  <ArrowLeft />
                </Button>
                <Button type="button" variant="ghost" size="icon" className="size-8" aria-label="Set as cover" disabled={cover === url} onClick={() => onChange(images, url)}>
                  <Star />
                </Button>
                <Button type="button" variant="ghost" size="icon" className="size-8 text-destructive" aria-label="Remove image" onClick={() => remove(url)}>
                  <Trash2 />
                </Button>
                <Button type="button" variant="ghost" size="icon" className="size-8" aria-label="Move right" disabled={i === images.length - 1} onClick={() => move(i, 1)}>
                  <ArrowRight />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED_IMAGE_TYPES.join(",")}
        multiple
        className="sr-only"
        id="artwork-images"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <Button type="button" variant="outline" onClick={() => inputRef.current?.click()} disabled={uploading > 0}>
        {uploading > 0 ? <Loader2 className="animate-spin" aria-hidden /> : <Upload aria-hidden />}
        {uploading > 0 ? `Uploading ${uploading}…` : "Upload images"}
      </Button>
      <p className="text-xs text-muted-foreground">JPEG, PNG or WebP, up to {MAX_IMAGE_LABEL} each. The starred image is used as the cover.</p>
    </div>
  );
}
