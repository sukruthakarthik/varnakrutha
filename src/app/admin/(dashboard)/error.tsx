"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/common/error-state";

export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return <ErrorState reset={reset} message="This admin page failed to load." />;
}
