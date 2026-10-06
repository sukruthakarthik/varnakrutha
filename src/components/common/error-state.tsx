"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ErrorState({ reset, message }: { reset?: () => void; message?: string }) {
  return (
    <div role="alert" className="container-page flex flex-col items-center gap-4 py-24 text-center">
      <AlertTriangle className="size-8 text-primary" aria-hidden />
      <h1 className="font-serif text-3xl">Something went wrong</h1>
      <p className="max-w-md text-muted-foreground">
        {message ?? "We couldn't load this page. Please try again in a moment."}
      </p>
      {reset && (
        <Button onClick={reset} variant="outline">
          Try again
        </Button>
      )}
    </div>
  );
}
