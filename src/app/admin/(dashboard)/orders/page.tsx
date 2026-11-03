import Link from "next/link";
import { notFound } from "next/navigation";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { OrderList } from "@/features/admin/components/order-list";
import { RecordSaleForm } from "@/features/admin/components/record-sale-form";
import { requireAdminPage } from "@/lib/auth";
import { formatPaise, paymentsConfig, paymentsEnabled } from "@/lib/payments/config";
import { listOrders } from "@/services/orders";

export const metadata = { title: "Orders" };
export const dynamic = "force-dynamic";

const MODE_LABEL = { off: "Off", manual: "Manual UPI", razorpay: "Razorpay" } as const;

export default async function OrdersPage() {
  if (paymentsConfig.mode === "off") notFound();
  const { artist, dataSource, isPlatformAdmin } = await requireAdminPage();

  // Admins see every order; artists see their own, once paid (buyer details are theirs only after payment).
  const orders = isPlatformAdmin ? await listOrders() : await listOrders({ artistId: artist.id, paidOnly: true });
  const artists = await dataSource.artists.list();
  const artistNames = Object.fromEntries(artists.map((a) => [a.id, a.name]));

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const salesThisMonth = orders.filter(
    (o) => ["paid", "shipped", "completed"].includes(o.status) && o.paidAt && new Date(o.paidAt) >= monthStart,
  );
  const commission = salesThisMonth.reduce((sum, o) => sum + o.commissionPaise, 0);
  const takings = salesThisMonth.reduce((sum, o) => sum + o.amountPaise, 0);

  const sellable = isPlatformAdmin
    ? (await dataSource.artworks.list())
        .filter((a) => a.availability !== "sold")
        .map((a) => ({ id: a.id, title: a.title, artistName: artistNames[a.artistId] ?? "", price: a.price }))
    : [];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl">Orders</h1>
          <p className="text-sm text-muted-foreground">
            {isPlatformAdmin
              ? `Payments: ${MODE_LABEL[paymentsConfig.mode]}${paymentsEnabled ? "" : " (not active: set NEXT_PUBLIC_UPI_ID)"}.`
              : "Orders for your paintings. Ship once paid, and add the tracking number."}
          </p>
        </div>
        {isPlatformAdmin && (
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/orders/export">
              <Download aria-hidden /> Export CSV
            </Link>
          </Button>
        )}
      </div>

      {isPlatformAdmin && (
        <dl className="grid gap-4 sm:grid-cols-3">
          <Stat label="Sales this month" value={String(salesThisMonth.length)} />
          <Stat label="Received through the site" value={formatPaise(takings)} />
          <Stat label="Commission this month" value={formatPaise(commission)} />
        </dl>
      )}

      <OrderList orders={orders} artistNames={artistNames} isAdmin={isPlatformAdmin} />

      {isPlatformAdmin && <RecordSaleForm artworks={sellable} />}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-5">
      <dt className="text-xs uppercase tracking-[0.15em] text-muted-foreground">{label}</dt>
      <dd className="mt-2 font-serif text-3xl lining-nums">{value}</dd>
    </Card>
  );
}
