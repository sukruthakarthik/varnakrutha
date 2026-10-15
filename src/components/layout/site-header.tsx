"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Wordmark } from "@/components/common/wordmark";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/lib/site";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./theme-toggle";

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

/** Tracks scroll so the header can tuck away while reading down and return on any scroll up. */
function useScrollState() {
  const [state, setState] = useState({ scrolled: false, hidden: false });
  useEffect(() => {
    let last = window.scrollY;
    let frame = 0;
    function onScroll() {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const y = window.scrollY;
        const hidden = y > 160 && y > last + 4 ? true : y < last - 4 || y <= 160 ? false : undefined;
        last = y;
        setState((s) => ({ scrolled: y > 8, hidden: hidden ?? s.hidden }));
      });
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);
  return state;
}

export function SiteHeader() {
  const pathname = usePathname();
  const { scrolled, hidden } = useScrollState();

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b transition-[translate,background-color,border-color] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] focus-within:translate-y-0",
        scrolled
          ? "border-foreground/10 bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/70"
          : "border-transparent bg-background",
        hidden && "-translate-y-full",
      )}
    >
      <div className="container-page flex h-16 items-center justify-between md:h-20">
        <Link href="/" className="group font-serif text-2xl tracking-tight md:text-[1.7rem]">
          <Wordmark accentClassName="transition-colors group-hover:text-foreground" />
        </Link>

        <div className="flex items-center gap-2 md:gap-8">
          <nav aria-label="Main" className="hidden md:block">
            <ul className="flex items-center gap-10">
              {siteConfig.nav.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={isActive(pathname, item.href) ? "page" : undefined}
                    className={cn(
                      "link-draw text-[0.8rem] uppercase tracking-[0.18em] text-foreground/70 transition-colors hover:text-foreground",
                      isActive(pathname, item.href) && "text-foreground",
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <ThemeToggle />

          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu">
                <Menu />
              </Button>
            </DialogTrigger>
            <DialogContent side="right" aria-describedby={undefined}>
              <DialogTitle className="sr-only">Menu</DialogTitle>
              <nav aria-label="Mobile" className="mt-14">
                <ul className="flex flex-col gap-7">
                  {siteConfig.nav.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        aria-current={isActive(pathname, item.href) ? "page" : undefined}
                        className={cn("font-serif text-4xl", isActive(pathname, item.href) && "italic text-primary")}
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </header>
  );
}
