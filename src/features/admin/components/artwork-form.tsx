"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createArtwork, updateArtwork } from "@/features/artworks/actions";
import { artworkInputSchema, type ArtworkFormValues, type ArtworkInput } from "@/features/artworks/schemas";
import { AVAILABILITY_META, CATEGORY_META } from "@/lib/constants";
import { AVAILABILITY, CATEGORIES, type Artwork } from "@/types";
import { slugify } from "@/utils/format";
import { adminKeys } from "../hooks";
import { ImageManager } from "./image-manager";

function toFormValues(a?: Artwork): ArtworkFormValues {
  return {
    title: a?.title ?? "",
    slug: a?.slug ?? "",
    description: a?.description ?? "",
    story: a?.story ?? "",
    year: a?.year ?? new Date().getFullYear(),
    medium: a?.medium ?? "",
    category: a?.category ?? "heritage",
    width: a?.width ?? null,
    height: a?.height ?? null,
    price: a?.price ?? null,
    availability: a?.availability ?? "available",
    featured: a?.featured ?? false,
    coverImage: a?.coverImage ?? null,
    images: a?.images.map((i) => i.imageUrl) ?? [],
  };
}

export function ArtworkForm({ artwork }: { artwork?: Artwork }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [slugTouched, setSlugTouched] = useState(Boolean(artwork));

  const {
    register,
    handleSubmit,
    getValues,
    setValue,
    setError,
    watch,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ArtworkFormValues, unknown, ArtworkInput>({
    resolver: zodResolver(artworkInputSchema),
    defaultValues: toFormValues(artwork),
  });

  const [images, coverImage, category, slug] = watch(["images", "coverImage", "category", "slug"]);
  const titleField = register("title", {
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!slugTouched) setValue("slug", slugify(e.target.value), { shouldValidate: true });
    },
  });

  async function onSubmit() {
    const values = getValues();
    const res = artwork ? await updateArtwork(artwork.id, values) : await createArtwork(values);
    if (!res.ok) {
      toast.error(res.error);
      for (const [field, messages] of Object.entries(res.fieldErrors ?? {})) {
        if (messages?.[0]) setError(field as keyof ArtworkFormValues, { message: messages[0] });
      }
      return;
    }
    toast.success(artwork ? "Artwork updated" : "Artwork created");
    await queryClient.invalidateQueries({ queryKey: adminKeys.artworks });
    router.push("/admin/artworks");
    router.refresh();
  }

  const err = (name: keyof ArtworkFormValues) => errors[name]?.message as string | undefined;

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-6 xl:grid-cols-[2fr_1fr]">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5 sm:grid-cols-2">
            <Field id="title" label="Title" error={err("title")} className="sm:col-span-2">
              <Input id="title" aria-invalid={!!errors.title} {...titleField} />
            </Field>
            <Field id="slug" label="URL slug" error={err("slug")} hint={`/artworks/${slug || "…"}`} className="sm:col-span-2">
              <Input id="slug" aria-invalid={!!errors.slug} {...register("slug", { onChange: () => setSlugTouched(true) })} />
            </Field>
            <Field id="category" label="Category" error={err("category")}>
              <NativeSelect id="category" {...register("category")}>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_META[c].label}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field id="medium" label="Medium" error={err("medium")}>
              <Input id="medium" placeholder="Watercolor on paper" {...register("medium")} />
            </Field>
            <Field id="year" label="Year" error={err("year")}>
              <Input id="year" type="number" inputMode="numeric" {...register("year", { valueAsNumber: true })} />
            </Field>
            <Field id="price" label="Price (INR, optional)" error={err("price")}>
              <Input id="price" type="number" min={0} step="any" {...register("price", { valueAsNumber: true })} />
            </Field>
            <Field id="width" label="Width (cm)" error={err("width")}>
              <Input id="width" type="number" min={0} step="any" {...register("width", { valueAsNumber: true })} />
            </Field>
            <Field id="height" label="Height (cm)" error={err("height")}>
              <Input id="height" type="number" min={0} step="any" {...register("height", { valueAsNumber: true })} />
            </Field>
            <Field id="description" label="Short description" error={err("description")} className="sm:col-span-2">
              <Textarea id="description" rows={3} {...register("description")} />
            </Field>
            <Field id="story" label="Story behind the artwork" error={err("story")} className="sm:col-span-2">
              <Textarea id="story" rows={8} {...register("story")} />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Images</CardTitle>
          </CardHeader>
          <CardContent>
            <ImageManager
              images={images}
              cover={coverImage}
              category={category}
              slug={slug}
              onChange={(next, cover) => {
                setValue("images", next, { shouldDirty: true });
                setValue("coverImage", cover, { shouldDirty: true });
              }}
            />
            {err("images") && <p className="mt-2 text-sm text-destructive">{err("images")}</p>}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <Field id="availability" label="Availability" error={err("availability")}>
              <NativeSelect id="availability" {...register("availability")}>
                {AVAILABILITY.map((v) => (
                  <option key={v} value={v}>
                    {AVAILABILITY_META[v].label}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <div className="flex items-center gap-3">
              <input id="featured" type="checkbox" className="size-4 accent-primary" {...register("featured")} />
              <Label htmlFor="featured">Feature on the home page</Label>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3 xl:flex-col">
          <Button type="submit" size="lg" disabled={isSubmitting || (!!artwork && !isDirty)} className="flex-1">
            {isSubmitting && <Loader2 className="animate-spin" aria-hidden />}
            {artwork ? "Save changes" : "Create artwork"}
          </Button>
          <Button type="button" size="lg" variant="outline" onClick={() => router.push("/admin/artworks")} className="flex-1">
            Cancel
          </Button>
        </div>
      </div>
    </form>
  );
}

function Field({
  id,
  label,
  error,
  hint,
  className,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`space-y-2 ${className ?? ""}`}>
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
