import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ArtworkNotFound() {
  return (
    <div className="container-page flex flex-col items-center gap-4 py-28 text-center">
      <p className="eyebrow">404</p>
      <h1 className="text-4xl">This artwork could not be found</h1>
      <p className="max-w-md text-muted-foreground">It may have been renamed or removed from the collection.</p>
      <Button asChild variant="outline" className="mt-4">
        <Link href="/gallery">Browse the gallery</Link>
      </Button>
    </div>
  );
}
