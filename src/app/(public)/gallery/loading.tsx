import { Skeleton } from "@/components/ui/skeleton";

export default function GalleryLoading() {
  return (
    <div className="grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true" aria-label="Loading artworks">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="space-y-4">
          <Skeleton className="aspect-[4/5] w-full" />
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-4 w-1/3" />
        </div>
      ))}
    </div>
  );
}
