"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import type { SaveProfileResult } from "@/features/artists/actions";
import {
  artistProfileSchema,
  type ArtistProfileFormValues,
  type ArtistProfileInput,
} from "@/features/artists/schemas";
import { ArtworkImage } from "@/features/artworks/components/artwork-image";
import type { ActionResult } from "@/lib/action-result";
import { TAGLINE_MAX_LENGTH } from "@/lib/constants";
import { PROFILE_COMPRESSION, compressImage } from "@/lib/image-compression";
import { formatBytes } from "@/utils/format";
import { Field } from "./form-field";

function toFormValues(a: ArtistProfileInput): ArtistProfileFormValues {
  return {
    name: a.name,
    tagline: a.tagline ?? "",
    bio: a.bio ?? "",
    profileImage: a.profileImage,
    instagram: a.instagram ?? "",
    youtube: a.youtube ?? "",
    facebook: a.facebook ?? "",
    pinterest: a.pinterest ?? "",
    website: a.website ?? "",
    journey: a.journey.join("\n\n"),
    inspiration: a.inspiration.join("\n"),
    skills: a.skills.join("\n"),
    techniques: a.techniques,
  };
}

const SOCIAL_FIELDS = [
  { name: "instagram", label: "Instagram", placeholder: "https://www.instagram.com/yourname" },
  { name: "youtube", label: "YouTube", placeholder: "https://www.youtube.com/@yourname" },
  { name: "facebook", label: "Facebook", placeholder: "https://www.facebook.com/yourname" },
  { name: "pinterest", label: "Pinterest", placeholder: "https://www.pinterest.com/yourname" },
  { name: "website", label: "Website", placeholder: "https://…" },
] as const;

interface ProfileFormProps {
  /** The live profile, or a pending submission to continue from. */
  profile: ArtistProfileInput;
  save: (values: ArtistProfileFormValues) => Promise<SaveProfileResult>;
  upload: (formData: FormData) => Promise<ActionResult<{ url: string }>>;
  submitLabel: string;
  /** Shown under the save button, e.g. that changes are reviewed first. */
  note?: string;
  /** Lets the form be submitted without edits, e.g. approving a submission as is. */
  allowUnchanged?: boolean;
  /** Where to go after saving; stays on the page when omitted. */
  redirectTo?: string;
  /** Extra controls under the save button, e.g. discarding a submission. */
  actions?: React.ReactNode;
}

export function ProfileForm({
  profile,
  save,
  upload,
  submitLabel,
  note,
  allowUnchanged,
  redirectTo,
  actions,
}: ProfileFormProps) {
  const router = useRouter();

  const {
    register,
    control,
    handleSubmit,
    getValues,
    setValue,
    setError,
    reset,
    watch,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ArtistProfileFormValues, unknown, ArtistProfileInput>({
    resolver: zodResolver(artistProfileSchema),
    defaultValues: toFormValues(profile),
  });
  const techniques = useFieldArray({ control, name: "techniques" });
  const [profileImage, tagline] = watch(["profileImage", "tagline"]);
  const taglineLength = tagline?.trim().length ?? 0;

  async function onSubmit() {
    const values = getValues();
    const res = await save(values);
    if (!res.ok) {
      toast.error(res.error);
      for (const [field, messages] of Object.entries(res.fieldErrors ?? {})) {
        if (messages?.[0]) setError(field as keyof ArtistProfileFormValues, { message: messages[0] });
      }
      return;
    }
    toast.success(res.data.message);
    reset(values);
    if (redirectTo) router.push(redirectTo);
    router.refresh();
  }

  const err = (name: keyof ArtistProfileFormValues) => errors[name]?.message as string | undefined;

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-6 xl:grid-cols-[2fr_1fr]">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>About you</CardTitle>
            <CardDescription>Shown on the About page and the home page.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <Field id="name" label="Name" error={err("name")}>
              <Input id="name" aria-invalid={!!errors.name} {...register("name")} />
            </Field>
            <Field
              id="tagline"
              label="Tagline"
              error={err("tagline")}
              hint={`Shown under your name on the home page. ${taglineLength}/${TAGLINE_MAX_LENGTH} characters.`}
            >
              <Input
                id="tagline"
                maxLength={TAGLINE_MAX_LENGTH}
                placeholder="Original paintings inspired by heritage and nature"
                aria-invalid={!!errors.tagline}
                {...register("tagline")}
              />
            </Field>
            <Field id="bio" label="Short bio" error={err("bio")} hint="Two or three sentences introducing you and your work.">
              <Textarea id="bio" rows={4} aria-invalid={!!errors.bio} {...register("bio")} />
            </Field>
            <Field
              id="journey"
              label="Artistic journey"
              error={err("journey")}
              hint="Leave a blank line between paragraphs."
            >
              <Textarea id="journey" rows={10} aria-invalid={!!errors.journey} {...register("journey")} />
            </Field>
            <Field id="inspiration" label="Inspiration" error={err("inspiration")} hint="One per line.">
              <Textarea id="inspiration" rows={5} aria-invalid={!!errors.inspiration} {...register("inspiration")} />
            </Field>
            <Field id="skills" label="Skills" error={err("skills")} hint="One per line. Each one is shown as a tag.">
              <Textarea id="skills" rows={6} aria-invalid={!!errors.skills} {...register("skills")} />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Techniques</CardTitle>
            <CardDescription>The mediums and methods you work with.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {techniques.fields.map((field, i) => {
              const fieldErrors = errors.techniques?.[i];
              return (
                <div key={field.id} className="grid gap-3 rounded-sm border border-border p-4 sm:grid-cols-[1fr_2fr_auto] sm:items-start">
                  <Field id={`technique-${i}-name`} label="Name" error={fieldErrors?.name?.message}>
                    <Input
                      id={`technique-${i}-name`}
                      placeholder="Watercolor"
                      aria-invalid={!!fieldErrors?.name}
                      {...register(`techniques.${i}.name`)}
                    />
                  </Field>
                  <Field id={`technique-${i}-description`} label="Description" error={fieldErrors?.description?.message}>
                    <Textarea
                      id={`technique-${i}-description`}
                      rows={2}
                      className="min-h-10"
                      aria-invalid={!!fieldErrors?.description}
                      {...register(`techniques.${i}.description`)}
                    />
                  </Field>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-destructive sm:mt-7"
                    aria-label="Remove technique"
                    onClick={() => techniques.remove(i)}
                  >
                    <Trash2 />
                  </Button>
                </div>
              );
            })}
            {errors.techniques?.message && <p className="text-sm text-destructive">{errors.techniques.message}</p>}
            <Button type="button" variant="outline" onClick={() => techniques.append({ name: "", description: "" })}>
              <Plus aria-hidden /> Add technique
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Profile photo</CardTitle>
          </CardHeader>
          <CardContent>
            <ProfilePhoto
              name={profile.name}
              url={profileImage}
              upload={upload}
              onChange={(url) => setValue("profileImage", url, { shouldDirty: true })}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Social links</CardTitle>
            <CardDescription>Leave blank to hide.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {SOCIAL_FIELDS.map(({ name, label, placeholder }) => (
              <Field key={name} id={name} label={label} error={err(name)}>
                <Input id={name} type="url" inputMode="url" placeholder={placeholder} aria-invalid={!!errors[name]} {...register(name)} />
              </Field>
            ))}
          </CardContent>
        </Card>

        <div className="flex gap-3 xl:flex-col">
          <Button type="submit" size="lg" disabled={isSubmitting || (!isDirty && !allowUnchanged)} className="flex-1">
            {isSubmitting && <Loader2 className="animate-spin" aria-hidden />}
            {submitLabel}
          </Button>
          <Button type="button" size="lg" variant="outline" disabled={isSubmitting || !isDirty} onClick={() => reset()} className="flex-1">
            Undo edits
          </Button>
        </div>
        {note && <p className="text-sm text-muted-foreground">{note}</p>}
        {actions}
      </div>
    </form>
  );
}

function ProfilePhoto({
  name,
  url,
  upload,
  onChange,
}: {
  name: string;
  url: string | null;
  upload: ProfileFormProps["upload"];
  onChange: (url: string | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<string | null>(null);

  async function handleFile(original: File | undefined) {
    if (!original) return;
    try {
      setStatus("Compressing…");
      let file: File;
      try {
        ({ file } = await compressImage(original, PROFILE_COMPRESSION));
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Couldn't compress this image.");
        return;
      }
      setStatus("Uploading…");
      const fd = new FormData();
      fd.set("file", file);
      const res = await upload(fd);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      onChange(res.data.url);
      toast.success(`Photo uploaded · ${formatBytes(original.size)} → ${formatBytes(file.size)}. Save to keep it.`);
    } finally {
      setStatus(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-4">
      <div className="relative aspect-[4/5] w-full overflow-hidden rounded-sm bg-secondary">
        <ArtworkImage src={url} alt={`Portrait of ${name}`} sizes="(min-width: 1280px) 25vw, 90vw" />
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,.heic,.heif"
        className="sr-only"
        id="profile-photo"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={() => inputRef.current?.click()} disabled={status !== null}>
          {status ? <Loader2 className="animate-spin" aria-hidden /> : <Upload aria-hidden />}
          {status ?? (url ? "Replace photo" : "Upload photo")}
        </Button>
        {url && (
          <Button type="button" variant="ghost" className="text-destructive" onClick={() => onChange(null)} disabled={status !== null}>
            <Trash2 aria-hidden /> Remove
          </Button>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        A portrait-shaped photo works best; it is cropped to fill the frame, so keep your face near the centre. It is
        resized to {PROFILE_COMPRESSION.maxDimension}px, and location data is removed.
      </p>
    </div>
  );
}
