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
import { minLongSidePx, PRINT_MATERIAL_META, PRINT_MATERIALS, PRINT_SIZES, printOptions } from "@/lib/prints";
import { absoluteUrl, artworkPath } from "@/lib/site";
import { formatPrice } from "@/utils/format";
import { AVAILABILITY, CATEGORIES, MAX_CATEGORIES, type Artwork, type Category } from "@/types";
import { cn } from "@/lib/utils";
import { slugify } from "@/utils/format";
import { adminKeys } from "../hooks";
import { Field } from "./form-field";
import { ImageManager } from "./image-manager";

function toFormValues(a?: Artwork): ArtworkFormValues {
  return {
    title: a?.title ?? "",
    slug: a?.slug ?? "",
    description: a?.description ?? "",
    story: a?.story ?? "",
    year: a?.year ?? new Date().getFullYear(),
    medium: a?.medium ?? "",
    categories: a?.categories ?? [],
    width: a?.width ?? null,
    height: a?.height ?? null,
    pixelWidth: a?.pixelWidth ?? null,
    pixelHeight: a?.pixelHeight ?? null,
    price: a?.price ?? null,
    shippingFee: a?.shippingFee ?? null,
    availability: a?.availability ?? "available",
    featured: a?.featured ?? false,
    coverImage: a?.coverImage ?? null,
    images: a?.images.map((i) => i.imageUrl) ?? [],
  };
}

/** `artistSlug` is the signed-in artist's, for showing the artwork's public URL. */
export function ArtworkForm({ artwork, artistSlug }: { artwork?: Artwork; artistSlug: string }) {
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

  const [images, coverImage, categories, slug, price, pixelWidth, pixelHeight] = watch([
    "images",
    "coverImage",
    "categories",
    "slug",
    "price",
    "pixelWidth",
    "pixelHeight",
  ]);
  // Digital works are printed to order, so they get pixel sizes and print prices instead of centimetres.
  const digital = categories.includes("digital");
  const toNumber = (v: unknown) => (typeof v === "number" && !Number.isNaN(v) ? v : null);
  const prints = digital
    ? printOptions({ categories, price: toNumber(price), pixelWidth: toNumber(pixelWidth), pixelHeight: toNumber(pixelHeight) })
    : [];

  // Tags work like on/off switches: click to add a category, click again to remove it.
  function toggleCategory(c: Category) {
    const next = categories.includes(c) ? categories.filter((x) => x !== c) : [...categories, c];
    setValue("categories", next, { shouldDirty: true, shouldValidate: true });
  }
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
            <Field
              id="slug"
              label="Web address (URL slug)"
              error={err("slug")}
              hint={
                // Plain-language help: most artists have never heard the word "slug".
                <>
                  {artwork
                    ? "The last part of this painting's web link. Changing it breaks links you have already shared."
                    : "Filled in for you from the title, so you can usually leave it. It's the last part of the painting's web link."}{" "}
                  Use small letters, numbers and hyphens (-) only.
                  <br />
                  Link: <span className="break-all font-medium text-foreground/80">{absoluteUrl(artworkPath(slug || "…", artistSlug))}</span>
                </>
              }
              className="sm:col-span-2"
            >
              <Input
                id="slug"
                placeholder="my-painting-title"
                aria-invalid={!!errors.slug}
                {...register("slug", { onChange: () => setSlugTouched(true) })}
              />
            </Field>
            <fieldset className="space-y-2 sm:col-span-2">
              <legend className="text-sm font-medium leading-none">Categories</legend>
              <div className="flex flex-wrap gap-2 pt-1">
                {CATEGORIES.map((c) => {
                  const selected = categories.includes(c);
                  return (
                    <button
                      key={c}
                      type="button"
                      aria-pressed={selected}
                      disabled={!selected && categories.length >= MAX_CATEGORIES}
                      onClick={() => toggleCategory(c)}
                      className={cn(
                        "rounded-full border px-3.5 py-1.5 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40",
                        selected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-foreground/20 hover:border-foreground/50",
                      )}
                    >
                      {CATEGORY_META[c].label}
                    </button>
                  );
                })}
              </div>
              {err("categories") ? (
                <p className="text-sm text-destructive">{err("categories")}</p>
              ) : (
                <p className="text-xs text-muted-foreground">Pick all that fit, up to {MAX_CATEGORIES}. A painting can be both Digital and Abstract.</p>
              )}
            </fieldset>
            <Field id="medium" label="Medium" error={err("medium")}>
              <Input id="medium" placeholder={digital ? "Digital painting (Procreate)" : "Watercolor on paper"} {...register("medium")} />
            </Field>
            <Field id="year" label="Year" error={err("year")}>
              <Input id="year" type="number" inputMode="numeric" {...register("year", { valueAsNumber: true })} />
            </Field>
            <Field
              id="price"
              label={digital ? "Your price per print (INR)" : "Price (INR, optional)"}
              hint={digital ? "What you earn before commission. Printing is added on top." : undefined}
              error={err("price")}
            >
              <Input id="price" type="number" min={0} step="any" {...register("price", { valueAsNumber: true })} />
            </Field>
            <Field id="shippingFee" label="Shipping fee (INR, blank = free)" error={err("shippingFee")}>
              <Input id="shippingFee" type="number" min={0} step="any" {...register("shippingFee", { valueAsNumber: true })} />
            </Field>
            {digital ? (
              <>
                <Field id="pixelWidth" label="Image width (pixels)" error={err("pixelWidth")} hint="From your file's properties, e.g. 6000">
                  <Input id="pixelWidth" type="number" min={1} step={1} inputMode="numeric" {...register("pixelWidth", { valueAsNumber: true })} />
                </Field>
                <Field id="pixelHeight" label="Image height (pixels)" error={err("pixelHeight")} hint="e.g. 4000">
                  <Input id="pixelHeight" type="number" min={1} step={1} inputMode="numeric" {...register("pixelHeight", { valueAsNumber: true })} />
                </Field>
                <PrintPreview options={prints} hasPrice={Boolean(toNumber(price))} hasPixels={Boolean(toNumber(pixelWidth) && toNumber(pixelHeight))} />
              </>
            ) : (
              <>
                <Field id="width" label="Width (cm)" error={err("width")}>
                  <Input id="width" type="number" min={0} step="any" {...register("width", { valueAsNumber: true })} />
                </Field>
                <Field id="height" label="Height (cm)" error={err("height")}>
                  <Input id="height" type="number" min={0} step="any" {...register("height", { valueAsNumber: true })} />
                </Field>
              </>
            )}
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
              // Uploads are filed under the first chosen category's folder.
              category={CATEGORIES.find((c) => categories.includes(c)) ?? null}
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

/** Live preview of the prints buyers will be offered, so the artist sees the effect of file size and price. */
function PrintPreview({
  options,
  hasPrice,
  hasPixels,
}: {
  options: ReturnType<typeof printOptions>;
  hasPrice: boolean;
  hasPixels: boolean;
}) {
  const sizes = [...new Set(options.map((o) => o.size))];
  return (
    <div className="space-y-3 rounded-sm border border-border bg-secondary/40 p-4 text-sm sm:col-span-2">
      <p className="font-medium">Prints buyers can order</p>
      {!hasPixels || !hasPrice ? (
        <p className="text-muted-foreground">Enter your price and the image size in pixels to see the print sizes and prices.</p>
      ) : sizes.length === 0 ? (
        <p className="text-destructive">
          This file is too small to print sharply. The longer side needs at least {minLongSidePx(PRINT_SIZES[0]).toLocaleString("en-IN")} px.
        </p>
      ) : (
        <>
          <table className="w-full text-left">
            <thead className="text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th scope="col" className="py-1 font-medium">Size</th>
                {PRINT_MATERIALS.map((m) => (
                  <th key={m} scope="col" className="py-1 font-medium">
                    {PRINT_MATERIAL_META[m].label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sizes.map((size) => (
                <tr key={size} className="border-t border-border/60">
                  <td className="py-1.5">{size}</td>
                  {PRINT_MATERIALS.map((m) => {
                    const o = options.find((x) => x.size === size && x.material === m);
                    return (
                      <td key={m} className="py-1.5">
                        {o ? formatPrice(o.total) : "—"}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-muted-foreground">
            Buyer pays your price + printing (set by Varnakrutha), plus shipping. Bigger sizes appear when the file has enough pixels
            {sizes.length < PRINT_SIZES.length && ` (${PRINT_SIZES[sizes.length]} needs about ${minLongSidePx(PRINT_SIZES[sizes.length]!).toLocaleString("en-IN")} px on the longer side)`}.
          </p>
        </>
      )}
    </div>
  );
}
