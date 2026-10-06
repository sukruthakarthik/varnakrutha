import { Badge } from "@/components/ui/badge";
import { AVAILABILITY_META } from "@/lib/constants";
import type { Availability } from "@/types";

const VARIANT = { available: "success", reserved: "warning", sold: "muted" } as const;

export function AvailabilityBadge({ availability }: { availability: Availability }) {
  return <Badge variant={VARIANT[availability]}>{AVAILABILITY_META[availability].label}</Badge>;
}
