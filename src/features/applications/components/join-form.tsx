"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Field } from "@/features/inquiries/components/contact-form";
import { submitApplication } from "../actions";
import { applicationInputSchema, type ApplicationFormValues, type ApplicationInput } from "../schemas";

const EMPTY: ApplicationFormValues = {
  name: "",
  email: "",
  phone: "",
  city: "",
  portfolioUrl: "",
  sampleLinks: "",
  mediums: "",
  statement: "",
  // Unticked until the applicant confirms; the schema only accepts true.
  originalWork: false,
  company: "",
};

export function JoinForm() {
  const [sent, setSent] = useState(false);
  // Shown on the thank-you screen, so the applicant can check where we'll write.
  const [sentTo, setSentTo] = useState("");
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    getValues,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ApplicationFormValues, unknown, ApplicationInput>({
    resolver: zodResolver(applicationInputSchema),
    defaultValues: EMPTY,
  });

  async function onSubmit() {
    setServerError(null);
    // The server re-validates, so it receives the raw (pre-transform) values.
    const result = await submitApplication(getValues());
    if (result.ok) {
      setSentTo(getValues("email").trim());
      setSent(true);
      reset();
      return;
    }
    setServerError(result.error);
    for (const [field, messages] of Object.entries(result.fieldErrors ?? {})) {
      if (messages?.[0]) setError(field as keyof ApplicationFormValues, { message: messages[0] });
    }
  }

  if (sent) {
    return (
      <div role="status" className="flex flex-col items-start gap-4 rounded-sm bg-secondary/60 p-8">
        <CheckCircle2 className="size-8 text-primary" aria-hidden />
        <h2 className="font-serif text-3xl">Thank you for applying</h2>
        <p className="text-foreground/80">
          Your application has been received. This page is your confirmation; there&apos;s no need to apply again.
        </p>
        <div className="space-y-2">
          <p className="font-medium">What happens next</p>
          <ol className="list-decimal space-y-2 pl-5 text-sm text-foreground/80">
            <li>Every application is looked at personally.</li>
            <li>
              You&apos;ll hear back by email{sentTo && <> at <strong className="font-medium text-foreground">{sentTo}</strong></>},
              usually within a week.
            </li>
            <li>
              If your work is a fit, you&apos;ll also receive a separate email from Varnakrutha with a link to set your
              password. After that, you sign in at <strong className="font-medium text-foreground">varnakrutha.in/admin/login</strong>{" "}
              with this email address and the password you chose, then add your paintings and complete your profile.
            </li>
          </ol>
        </div>
        <p className="text-xs text-muted-foreground">
          Can&apos;t find our emails? Check your spam and Promotions folders, and add varnakrutha@gmail.com to your
          contacts. The set-password link expires after a while; if it does, use &ldquo;Forgot your password?&rdquo; on the
          sign-in page to get a new one.
        </p>
      </div>
    );
  }

  const describedBy = (name: keyof ApplicationFormValues) => (errors[name] ? `${name}-error` : undefined);

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
      {/* Honeypot: hidden from people and assistive tech. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="company">Company</label>
        <input id="company" type="text" tabIndex={-1} autoComplete="off" {...register("company")} />
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <Field id="name" label="Name" error={errors.name?.message} required>
          <Input id="name" autoComplete="name" aria-invalid={!!errors.name} aria-describedby={describedBy("name")} {...register("name")} />
        </Field>
        <Field id="email" label="Email" error={errors.email?.message} required>
          <Input id="email" type="email" autoComplete="email" aria-invalid={!!errors.email} aria-describedby={describedBy("email")} {...register("email")} />
        </Field>
        <Field id="phone" label="Phone / WhatsApp" error={errors.phone?.message}>
          <Input id="phone" type="tel" autoComplete="tel" aria-invalid={!!errors.phone} aria-describedby={describedBy("phone")} {...register("phone")} />
        </Field>
        <Field id="city" label="City" error={errors.city?.message} required>
          <Input id="city" autoComplete="address-level2" aria-invalid={!!errors.city} aria-describedby={describedBy("city")} {...register("city")} />
        </Field>
      </div>

      <Field
        id="portfolioUrl"
        label="Instagram or any other portfolio link"
        hint="No portfolio online? Put 3 to 5 photos of your paintings in a Google Drive or Google Photos album, share it with “Anyone with the link”, and paste that link here."
        error={errors.portfolioUrl?.message}
        required
      >
        <Input
          id="portfolioUrl"
          type="url"
          inputMode="url"
          placeholder="https://"
          aria-invalid={!!errors.portfolioUrl}
          aria-describedby={["portfolioUrl-hint", describedBy("portfolioUrl")].filter(Boolean).join(" ")}
          {...register("portfolioUrl")}
        />
      </Field>
      <Field id="sampleLinks" label="Links to your best paintings (up to 5, one per line)" error={errors.sampleLinks?.message}>
        <Textarea
          id="sampleLinks"
          rows={4}
          placeholder={"https://www.instagram.com/p/…\nhttps://drive.google.com/…"}
          aria-invalid={!!errors.sampleLinks}
          aria-describedby={describedBy("sampleLinks")}
          {...register("sampleLinks")}
        />
      </Field>
      <Field id="mediums" label="What do you paint?" error={errors.mediums?.message}>
        <Input
          id="mediums"
          placeholder="e.g. Watercolor landscapes, acrylic portraits"
          aria-invalid={!!errors.mediums}
          aria-describedby={describedBy("mediums")}
          {...register("mediums")}
        />
      </Field>
      <Field id="statement" label="About you and your work" error={errors.statement?.message} required>
        <Textarea
          id="statement"
          rows={6}
          placeholder="How you started, what inspires you, and why you would like to be featured."
          aria-invalid={!!errors.statement}
          aria-describedby={describedBy("statement")}
          {...register("statement")}
        />
      </Field>

      <div className="space-y-1.5">
        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            className="mt-0.5 size-4 shrink-0 accent-[var(--color-primary)]"
            aria-invalid={!!errors.originalWork}
            aria-describedby={errors.originalWork ? "originalWork-error" : undefined}
            {...register("originalWork")}
          />
          <span>
            The work I share is my own original work, and I have the right to show and sell it. I&apos;ve read the{" "}
            <Link href="/copyright" target="_blank" className="underline underline-offset-4 hover:text-primary">
              Copyright &amp; Disclaimer
            </Link>
            .
          </span>
        </label>
        {errors.originalWork && (
          <p id="originalWork-error" role="alert" className="text-sm text-destructive">
            {errors.originalWork.message}
          </p>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Your details are used only to review your application and reply to you. See the{" "}
        <Link href="/privacy" className="underline underline-offset-4 hover:text-primary">
          Privacy Policy
        </Link>
        .
      </p>

      {serverError && (
        <p role="alert" className="text-sm text-destructive">
          {serverError}
        </p>
      )}

      <Button type="submit" size="lg" disabled={isSubmitting}>
        {isSubmitting && <Loader2 className="animate-spin" aria-hidden />}
        {isSubmitting ? "Sending…" : "Send application"}
      </Button>
    </form>
  );
}
