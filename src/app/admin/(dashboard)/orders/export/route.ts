import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/auth";
import { listOrders } from "@/services/orders";

/** Admin only: every order as CSV, for the accountant (commission, payments, refunds). */
export async function GET() {
  const admin = await getAdmin();
  if (!admin?.isPlatformAdmin) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [orders, artists] = await Promise.all([listOrders(), admin.dataSource.artists.list()]);
  const artistName = new Map(artists.map((a) => [a.id, a.name]));
  const rupees = (paise: number) => (paise / 100).toFixed(2);
  // Quote every field; double inner quotes; prefix formula-like values so spreadsheets don't execute them.
  const cell = (value: string | number | null) => {
    const text = value === null ? "" : String(value);
    return `"${(/^[=+\-@]/.test(text) ? `'${text}` : text).replace(/"/g, '""')}"`;
  };

  const header = [
    "Reference", "Created", "Paid", "Status", "Kind", "Method", "Artwork", "Artist", "Buyer", "Buyer email",
    "Price (INR)", "Shipping (INR)", "Paid through site (INR)", "Commission %", "Commission (INR)", "Artist share (INR)",
    "Payment reference", "Tracking",
  ];
  const rows = orders.map((o) => [
    o.reference, o.createdAt, o.paidAt, o.status, o.kind, o.method, o.artworkTitle, artistName.get(o.artistId) ?? "",
    o.buyerName, o.buyerEmail, rupees(o.pricePaise), rupees(o.shippingPaise), rupees(o.amountPaise),
    (o.commissionBps / 100).toFixed(2), rupees(o.commissionPaise), rupees(o.artistSharePaise), o.paymentReference, o.tracking,
  ]);
  const csv = [header, ...rows].map((r) => r.map(cell).join(",")).join("\r\n");

  return new NextResponse(`﻿${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="varnakrutha-orders-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
