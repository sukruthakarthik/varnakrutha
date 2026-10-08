"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { submitInquiry } from "../actions";
import { inquiryInputSchema, type InquiryFormValues, type InquiryInput } from "../schemas";

interface ContactFormProps {
  artwork?: { id: string; title: string } | null;
}

export function ContactForm({ artwork }: ContactFormProps) {
  const [sent, setSent] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    getValues,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<InquiryFormValues, unknown, InquiryInput>({
    resolver: zodResolver(inquiryInputSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      subject: artwork ? `Purchase enquiry: ${artwork.title}` : "",
      message: "",
      artworkId: artwork?.id ?? "",
      company: "",
    },
  });

  async function onSubmit() {
    setServerError(null);
    // The server re-validates, so it receives the raw (pre-transform) values.
    const result = await submitInquiry(getValues());
    if (result.ok) {
      setSent(true);
      reset();
      return;
    }
    setServerError(result.error);
    for (const [field, messages] of Object.entries(result.fieldErrors ?? {})) {
      if (messages?.[0]) setError(field as keyof InquiryFormValues, { message: messages[0] });
    }
  }

  if (sent) {
    return (
      <div role="status" className="flex flex-col items-start gap-4 rounded-sm bg-secondary/60 p-8">
        <CheckCircle2 className="size-8 text-primary" aria-hidden />
        <h2 className="font-serif text-3xl">Thank you for reaching out</h2>
        <p className="text-foreground/80">
          Your message has been received. Sukrutha will get back to you personally, usually within two
          working days.
        </p>
        <Button variant="outline" onClick={() => setSent(false)}>
          Send another message
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
      <input type="hidden" {...register("artworkId")} />
      {/* Honeypot: hidden from people and assistive tech. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="company">Company</label>
        <input id="company" type="text" tabIndex={-1} autoComplete="off" {...register("company")} />
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <Field id="name" label="Name" error={errors.name?.message} required>
          <Input id="name" autoComplete="name" aria-invalid={!!errors.name} aria-describedby={errors.name ? "name-error" : undefined} {...register("name")} />
        </Field>
        <Field id="email" label="Email" error={errors.email?.message} required>
          <Input id="email" type="email" autoComplete="email" aria-invalid={!!errors.email} aria-describedby={errors.email ? "email-error" : undefined} {...register("email")} />
        </Field>
        <Field id="phone" label="Phone" error={errors.phone?.message}>
          <Input id="phone" type="tel" autoComplete="tel" aria-invalid={!!errors.phone} aria-describedby={errors.phone ? "phone-error" : undefined} {...register("phone")} />
        </Field>
        <Field id="subject" label="Subject" error={errors.subject?.message} required>
          <Input id="subject" aria-invalid={!!errors.subject} aria-describedby={errors.subject ? "subject-error" : undefined} {...register("subject")} />
        </Field>
      </div>
      <Field id="message" label="Message" error={errors.message?.message} required>
        <Textarea id="message" rows={6} aria-invalid={!!errors.message} aria-describedby={errors.message ? "message-error" : undefined} {...register("message")} />
      </Field>

      <p className="text-xs text-muted-foreground">
        Your details are used only to reply to your message. See the{" "}
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
        {isSubmitting ? "Sending…" : "Send message"}
      </Button>
    </form>
  );
}

export function Field({
  id,
  label,
  error,
  required,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>
        {label}
        {required && <span className="text-primary"> *</span>}
      </Label>
      {children}
      {error && (
        <p id={`${id}-error`} className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
