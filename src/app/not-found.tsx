import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="container-page flex min-h-[70dvh] flex-col items-center justify-center gap-4 text-center">
      <p className="eyebrow">404</p>
      <h1 className="text-5xl">Page not found</h1>
      <p className="max-w-md text-muted-foreground">The page you&apos;re looking for doesn&apos;t exist or has moved.</p>
      <Button asChild variant="outline" className="mt-4">
        <Link href="/">Return home</Link>
      </Button>
    </main>
  );
}
