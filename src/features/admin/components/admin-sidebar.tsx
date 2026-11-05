"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ClipboardCheck,
  ExternalLink,
  FlaskConical,
  Image as ImageIcon,
  KeyRound,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Palette,
  Receipt,
  UserPlus,
  UserRound,
  Wrench,
} from "lucide-react";
import type { Role } from "@/lib/auth/roles";
import { Wordmark } from "@/components/common/wordmark";
import { cn } from "@/lib/utils";
import { signOut } from "../auth-actions";

// Artists manage their own art and profile; inquiries are handled by admins.
const NAV: { href: string; label: string; icon: typeof LayoutDashboard; roles: Role[] }[] = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["admin", "artist"] },
  { href: "/admin/artworks", label: "Artworks", icon: ImageIcon, roles: ["admin", "artist"] },
  { href: "/admin/inquiries", label: "Inquiries", icon: MessageSquare, roles: ["admin"] },
  { href: "/admin/orders", label: "Orders", icon: Receipt, roles: ["admin", "artist"] },
  { href: "/admin/profile", label: "Profile", icon: UserRound, roles: ["admin", "artist"] },
  // Private study resources; admins only.
  { href: "/admin/lab", label: "Lab", icon: FlaskConical, roles: ["admin"] },
  { href: "/admin/test", label: "Test", icon: Wrench, roles: ["admin"] },
];

interface PlatformCounts {
  reviews: number;
  applications: number;
}

const PLATFORM_NAV = [
  { href: "/admin/reviews", label: "Reviews", icon: ClipboardCheck, count: "reviews" },
  { href: "/admin/applications", label: "Applications", icon: UserPlus, count: "applications" },
] as const;

/**
 * `platformCounts` is null for artists; only admins see the platform links.
 * `canChangePassword` is false in mock mode, where passwords aren't managed in the app.
 */
export function AdminSidebar({
  artistName,
  portfolioPath,
  portfolioLive,
  role,
  platformCounts,
  canChangePassword,
  showOrders,
}: {
  artistName: string;
  /** The signed-in artist's own public page, /artists/<slug>. */
  portfolioPath: string;
  /** False until a platform admin approves the profile; the page isn't public before that. */
  portfolioLive: boolean;
  role: Role;
  platformCounts: PlatformCounts | null;
  canChangePassword: boolean;
  /** False while NEXT_PUBLIC_PAYMENTS_MODE is "off". */
  showOrders: boolean;
}) {
  const pathname = usePathname();
  const nav = [
    ...NAV.filter((item) => item.roles.includes(role) && (showOrders || item.href !== "/admin/orders")).map((item) => ({
      ...item,
      badge: 0,
    })),
    ...(platformCounts ? PLATFORM_NAV.map((item) => ({ ...item, badge: platformCounts[item.count] })) : []),
  ];
  const isActive = (href: string) => pathname.startsWith(href);

  return (
    <aside className="border-b border-border bg-background md:sticky md:top-0 md:h-dvh md:w-60 md:shrink-0 md:border-b-0 md:border-r">
      <div className="flex h-full flex-col gap-4 p-4 md:p-6">
        <div>
          <Link href="/admin/dashboard" className="font-serif text-xl">
            <Wordmark />
          </Link>
          <p className="text-xs text-muted-foreground">
            {artistName} · {role === "admin" ? "Admin" : "Artist"}
          </p>
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
          {portfolioLive ? (
            <Link
              href={portfolioPath}
              target="_blank"
              className="flex items-center gap-3 rounded-sm px-3 py-2 text-sm text-muted-foreground hover:bg-secondary"
            >
              <Palette className="size-4" aria-hidden /> View my portfolio
            </Link>
          ) : (
            // A link here would open a "not found" page, so explain why it isn't available yet.
            <span
              className="flex cursor-not-allowed items-center gap-3 rounded-sm px-3 py-2 text-sm text-muted-foreground/60"
              title="Your portfolio goes live once your profile is approved."
            >
              <Palette className="size-4" aria-hidden /> Portfolio not live yet
            </span>
          )}
          {canChangePassword && (
            <Link
              href="/admin/set-password"
              className="flex items-center gap-3 rounded-sm px-3 py-2 text-sm text-muted-foreground hover:bg-secondary"
            >
              <KeyRound className="size-4" aria-hidden /> Change password
            </Link>
          )}
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
