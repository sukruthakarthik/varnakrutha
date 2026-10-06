import { cn } from "@/lib/utils";

interface SectionHeadingProps {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  as?: "h1" | "h2";
  className?: string;
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  as: Heading = "h2",
  className,
}: SectionHeadingProps) {
  return (
    <div className={cn("space-y-3", align === "center" && "mx-auto max-w-2xl text-center", className)}>
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <Heading className={cn(Heading === "h1" ? "text-4xl md:text-6xl" : "text-3xl md:text-5xl")}>{title}</Heading>
      {description && <p className="text-base text-muted-foreground md:text-lg">{description}</p>}
    </div>
  );
}
