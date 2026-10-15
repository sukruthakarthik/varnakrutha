import { InquiryList } from "@/features/admin/components/inquiry-list";
import { requirePlatformAdminPage } from "@/lib/auth";

export const metadata = { title: "Inquiries" };

export default async function AdminInquiriesPage() {
  const { dataSource } = await requirePlatformAdminPage();
  const inquiries = await dataSource.inquiries.list();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl">Inquiries</h1>
        <p className="text-sm text-muted-foreground">Messages and purchase enquiries from visitors, for every artist on the site.</p>
      </div>
      <InquiryList initialData={inquiries} />
    </div>
  );
}
