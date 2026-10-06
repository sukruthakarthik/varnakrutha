import { AdminSidebar } from "@/features/admin/components/admin-sidebar";
import { requireAdminPage } from "@/lib/auth";

export default async function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdminPage();
  return (
    <div className="md:flex">
      <AdminSidebar artistName={admin.artist.name} />
      <main className="min-w-0 flex-1 p-4 md:p-10">{children}</main>
    </div>
  );
}
