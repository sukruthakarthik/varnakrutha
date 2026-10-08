import { ApplicationList } from "@/features/admin/components/application-list";
import { requirePlatformAdminPage } from "@/lib/auth";

export const metadata = { title: "Artist applications" };

export default async function ApplicationsPage() {
  const { dataSource } = await requirePlatformAdminPage();
  const applications = await dataSource.applications.list();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl">Artist applications</h1>
        <p className="text-sm text-muted-foreground">
          Artists who applied to be featured. Use Email to reply; the message is pre-filled to match the status.
        </p>
      </div>
      <ApplicationList applications={applications} />
    </div>
  );
}
