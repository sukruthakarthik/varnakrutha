"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ClipboardCheck,
  ExternalLink,
  Image as ImageIcon,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  UserPlus,
  UserRound,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { signOut } from "../auth-actions";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/artworks", label: "Artworks", icon: ImageIcon },
  { href: "/admin/inquiries", label: "Inquiries", icon: MessageSquare },
  { href: "/admin/profile", label: "Profile", icon: UserRound },
];

interface PlatformCounts {
  reviews: number;
  applications: number;
}

const PLATFORM_NAV = [
  { href: "/admin/reviews", label: "Reviews", icon: ClipboardCheck, count: "reviews" },
  { href: "/admin/applications", label: "Applications", icon: UserPlus, count: "applications" },
] as const;

/** `platformCounts` is null for admins who aren't platform admins; they don't see the platform links. */
export function AdminSidebar({
  artistName,
  platformCounts,
}: {
  artistName: string;
  platformCounts: PlatformCounts | null;
}) {
  const pathname = usePathname();
  const nav = [
    ...NAV.map((item) => ({ ...item, badge: 0 })),
    ...(platformCounts ? PLATFORM_NAV.map((item) => ({ ...item, badge: platformCounts[item.count] })) : []),
  ];
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
          {nav.map(({ href, label, icon: Icon, badge }) => (
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
              {badge > 0 && (
                <span className="ml-auto rounded-full bg-primary px-2 text-xs text-primary-foreground">{badge}</span>
              )}
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
