import { InquiryList } from "@/features/admin/components/inquiry-list";
import { requireAdminPage } from "@/lib/auth";

export const metadata = { title: "Inquiries" };

export default async function AdminInquiriesPage() {
  const { artist, dataSource } = await requireAdminPage();
  const inquiries = await dataSource.inquiries.list(artist.id);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl">Inquiries</h1>
        <p className="text-sm text-muted-foreground">Messages and purchase enquiries from visitors.</p>
      </div>
      <InquiryList initialData={inquiries} />
    </div>
  );
}
