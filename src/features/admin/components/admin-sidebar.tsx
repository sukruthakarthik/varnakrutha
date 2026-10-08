"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ExternalLink, Image as ImageIcon, LayoutDashboard, LogOut, MessageSquare, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { signOut } from "../auth-actions";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/artworks", label: "Artworks", icon: ImageIcon },
  { href: "/admin/inquiries", label: "Inquiries", icon: MessageSquare },
  { href: "/admin/profile", label: "Profile", icon: UserRound },
];

export function AdminSidebar({ artistName }: { artistName: string }) {
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/admin" ? pathname === href : pathname.startsWith(href));

  return (
    <aside className="border-b border-border bg-background md:sticky md:top-0 md:h-dvh md:w-60 md:shrink-0 md:border-b-0 md:border-r">
      <div className="flex h-full flex-col gap-4 p-4 md:p-6">
        <div>
          <Link href="/admin" className="font-serif text-xl">
            Art By <span className="text-primary">Sukrutha</span>
          </Link>
          <p className="text-xs text-muted-foreground">{artistName}</p>
        </div>
        <nav aria-label="Admin" className="flex gap-1 overflow-x-auto md:flex-col">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              aria-current={isActive(href) ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-sm px-3 py-2 text-sm transition-colors hover:bg-secondary",
                isActive(href) && "bg-secondary font-medium text-secondary-foreground",
              )}
            >
              <Icon className="size-4" aria-hidden />
              {label}
            </Link>
          ))}
        </nav>
        <div className="flex gap-1 md:mt-auto md:flex-col">
          <Link href="/" target="_blank" className="flex items-center gap-3 rounded-sm px-3 py-2 text-sm text-muted-foreground hover:bg-secondary">
            <ExternalLink className="size-4" aria-hidden /> View site
          </Link>
          <form action={signOut}>
            <button type="submit" className="flex w-full items-center gap-3 rounded-sm px-3 py-2 text-sm text-muted-foreground hover:bg-secondary">
              <LogOut className="size-4" aria-hidden /> Sign out
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
