import { cn } from "@/lib/utils";

/**
 * The platform's name, "Varnakrutha" (varna, colour + krutha, made), with "krutha" in italic accent.
 * Each artist's own pages use "Art by <name>" instead; see artistBrand() in lib/site.
 */
export function Wordmark({ className, accentClassName }: { className?: string; accentClassName?: string }) {
  return (
    <span className={className}>
      Varna<span className={cn("italic text-primary", accentClassName)}>krutha</span>
    </span>
  );
}
