import type { Artist } from "@/types";
import { cn } from "@/lib/utils";
import { FacebookIcon, InstagramIcon, PinterestIcon, YoutubeIcon } from "./social-icons";

export function SocialLinks({ artist, className }: { artist: Artist; className?: string }) {
  const links = [
    { href: artist.instagram, label: "Instagram", Icon: InstagramIcon },
    { href: artist.youtube, label: "YouTube", Icon: YoutubeIcon },
    { href: artist.facebook, label: "Facebook", Icon: FacebookIcon },
    { href: artist.pinterest, label: "Pinterest", Icon: PinterestIcon },
  ].filter((l): l is typeof l & { href: string } => Boolean(l.href));

  if (links.length === 0) return null;

  return (
    <ul className={cn("flex items-center gap-3", className)}>
      {links.map(({ href, label, Icon }) => (
        <li key={label}>
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex size-10 items-center justify-center rounded-full border border-foreground/15 text-foreground/80 transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Icon />
            <span className="sr-only">{`${artist.name} on ${label}`}</span>
          </a>
        </li>
      ))}
    </ul>
  );
}
