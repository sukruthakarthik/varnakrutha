import { cn } from "@/lib/utils";

interface SectionHeadingProps {
  id?: string;
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  as?: "h1" | "h2";
  className?: string;
}

export function SectionHeading({
  id,
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
      <Heading id={id} className={cn("text-balance leading-[1.02] tracking-[-0.015em]", Heading === "h1" ? "text-5xl md:text-7xl" : "text-4xl md:text-6xl")}>
        {title}
      </Heading>
      {description && <p className="text-base text-muted-foreground md:text-lg">{description}</p>}
    </div>
  );
}
