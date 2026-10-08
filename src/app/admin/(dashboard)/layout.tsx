import { AdminSidebar } from "@/features/admin/components/admin-sidebar";
import { requireAdminPage } from "@/lib/auth";
import type { DataSource } from "@/services/types";

async function getPlatformCounts(ds: DataSource) {
  const [reviews, applications] = await Promise.all([ds.profileReviews.list(), ds.applications.list()]);
  return { reviews: reviews.length, applications: applications.filter((a) => a.status === "new").length };
}

export default async function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdminPage();
  const platformCounts = admin.isPlatformAdmin ? await getPlatformCounts(admin.dataSource) : null;
  return (
    <div className="md:flex">
      <AdminSidebar artistName={admin.artist.name} platformCounts={platformCounts} />
      <main className="min-w-0 flex-1 p-4 md:p-10">{children}</main>
    </div>
  );
}
