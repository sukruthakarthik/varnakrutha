"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/lib/site";
import { cn } from "@/lib/utils";

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75">
      <div className="container-page flex h-16 items-center justify-between md:h-20">
        <Link href="/" className="font-serif text-2xl tracking-tight md:text-[1.7rem]">
          Art By <span className="text-primary">Sukrutha</span>
        </Link>

        <nav aria-label="Main" className="hidden md:block">
          <ul className="flex items-center gap-8">
            {siteConfig.nav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={isActive(pathname, item.href) ? "page" : undefined}
                  className={cn(
                    "text-sm tracking-wide text-foreground/75 transition-colors hover:text-foreground",
                    isActive(pathname, item.href) && "text-foreground underline decoration-primary decoration-2 underline-offset-8",
                  )}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <Dialog>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu">
              <Menu />
            </Button>
          </DialogTrigger>
          <DialogContent side="right" aria-describedby={undefined}>
            <DialogTitle className="sr-only">Menu</DialogTitle>
            <nav aria-label="Mobile" className="mt-10">
              <ul className="flex flex-col gap-6">
                {siteConfig.nav.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={isActive(pathname, item.href) ? "page" : undefined}
                      className={cn("font-serif text-3xl", isActive(pathname, item.href) && "text-primary")}
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
    </header>
  );
}
