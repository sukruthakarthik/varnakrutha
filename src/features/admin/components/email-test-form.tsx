"use client";

import { useState, useTransition } from "react";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { EmailTestReport } from "@/services/accounts";
import { sendEmailTest } from "../email-test-actions";

const when = (value: string | null) => (value ? new Date(value).toLocaleString("en-IN") : "Never");

export function EmailTestForm() {
  const [email, setEmail] = useState("");
  const [pending, startTransition] = useTransition();
  const [report, setReport] = useState<EmailTestReport | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setReport(null);
    setFailure(null);
    startTransition(async () => {
      const res = await sendEmailTest(email);
      if (res.ok) setReport(res.data);
      else setFailure(res.error);
    });
  }

  const refused = failure ?? report?.error ?? null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Email</CardTitle>
        <CardDescription>
          Sends what Accept would send and shows Supabase&apos;s answer. An address with a login gets a Reset password
          email, whose link is real. Any other address gets an invitation, whose link won&apos;t work, and no account is
          left behind.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
          <div className="space-y-1.5">
            <Label htmlFor="test-email">Email</Label>
            <Input
              id="test-email"
              type="email"
              autoComplete="off"
              required
              maxLength={200}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={pending}>
            <Mail aria-hidden /> {pending ? "Sending…" : "Send"}
          </Button>
        </form>

        {refused && (
          <div role="alert" className="rounded-sm border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            <p className="font-medium">{report ? `Supabase refused the ${report.sent} email` : "The test failed"}</p>
            <p className="break-words">{refused}</p>
          </div>
        )}
        {report && !report.error && (
          <p role="status" className="rounded-sm border border-border bg-secondary/60 p-4 text-sm">
            Supabase accepted the {report.sent} email for {report.email}. If it doesn&apos;t arrive in a few minutes, look in
            that inbox&apos;s spam folder, then in the Sent folder of the Gmail account set under SMTP Settings, then in
            Supabase → Logs → Auth.
          </p>
        )}
        {report?.login && (
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            <dt className="text-muted-foreground">Login created</dt>
            <dd>{when(report.login.createdAt)}</dd>
            <dt className="text-muted-foreground">Invited</dt>
            <dd>{when(report.login.invitedAt)}</dd>
            <dt className="text-muted-foreground">Email confirmed</dt>
            <dd>{when(report.login.confirmedAt)}</dd>
            <dt className="text-muted-foreground">Last signed in</dt>
            <dd>{when(report.login.lastSignInAt)}</dd>
            <dt className="text-muted-foreground">Last reset email</dt>
            <dd>{when(report.login.recoverySentAt)}</dd>
          </dl>
        )}
      </CardContent>
    </Card>
  );
}
