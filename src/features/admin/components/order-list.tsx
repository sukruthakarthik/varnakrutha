"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Package, Receipt, XCircle } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/common/empty-state";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cancelOrderAction, completeOrder, confirmManualPayment, shipOrder } from "@/features/orders/actions";
import { formatPaise } from "@/lib/payments/config";
import { cn } from "@/lib/utils";
import type { Order, OrderStatus } from "@/types";
import { formatDate } from "@/utils/format";
import { ConfirmDialog } from "./confirm-dialog";

const STATUS_META: Record<OrderStatus, { label: string; variant: BadgeProps["variant"] }> = {
  pending: { label: "Awaiting payment", variant: "warning" },
  paid: { label: "Paid", variant: "success" },
  shipped: { label: "Shipped", variant: "default" },
  completed: { label: "Completed", variant: "muted" },
  cancelled: { label: "Cancelled", variant: "muted" },
  refunded: { label: "Refunded", variant: "muted" },
  expired: { label: "Expired", variant: "muted" },
  failed: { label: "Failed", variant: "muted" },
};

const METHOD_LABEL: Record<Order["method"], string> = { upi_manual: "UPI (manual)", razorpay: "Razorpay", offline: "Recorded sale" };

const FILTERS = [
  { key: "action", label: "Needs action", statuses: ["pending", "paid", "shipped"] },
  { key: "completed", label: "Completed", statuses: ["completed"] },
  { key: "closed", label: "Cancelled / expired", statuses: ["cancelled", "refunded", "expired", "failed"] },
  { key: "all", label: "All", statuses: null },
] as const;

/** `isAdmin` false: an artist viewing their own (paid) orders, who can only mark them shipped. */
export function OrderList({
  orders,
  artistNames,
  isAdmin,
}: {
  orders: Order[];
  artistNames: Record<string, string>;
  isAdmin: boolean;
}) {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["key"]>("action");
  const statuses = FILTERS.find((f) => f.key === filter)?.statuses ?? null;
  const visible = statuses ? orders.filter((o) => (statuses as readonly string[]).includes(o.status)) : orders;

  return (
    <div className="space-y-6">
      <div role="group" aria-label="Filter orders" className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Button key={f.key} size="sm" variant={filter === f.key ? "default" : "outline"} aria-pressed={filter === f.key} onClick={() => setFilter(f.key)}>
            {f.label} ({f.statuses ? orders.filter((o) => (f.statuses as readonly string[]).includes(o.status)).length : orders.length})
          </Button>
        ))}
      </div>
      {visible.length === 0 ? (
        <EmptyState icon={Receipt} title="No orders here" description="Orders from Buy now and Reserve appear here, along with sales you record." />
      ) : (
        <ul className="space-y-4">
          {visible.map((o) => (
            <OrderCard key={o.id} order={o} artistName={artistNames[o.artistId] ?? "Unknown artist"} isAdmin={isAdmin} />
          ))}
        </ul>
      )}
    </div>
  );
}

function OrderCard({ order: o, artistName, isAdmin }: { order: Order; artistName: string; isAdmin: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [txn, setTxn] = useState("");
  const [tracking, setTracking] = useState(o.tracking ?? "");
  const [reason, setReason] = useState("");
  const [refundRef, setRefundRef] = useState("");
  const live = o.status === "pending" || o.status === "paid" || o.status === "shipped";

  function run(action: () => Promise<{ ok: true } | { ok: false; error: string }>, message: string) {
    startTransition(async () => {
      const res = await action();
      if (!res.ok) {
        toast.error(res.error, { duration: 8000 });
        return;
      }
      toast.success(message);
      router.refresh();
    });
  }

  return (
    <li className={cn("rounded-sm border border-border bg-background p-5", live && "border-l-4 border-l-primary")}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="flex flex-wrap items-center gap-2 font-medium">
            {o.reference} · {o.artworkTitle}
            <Badge variant={STATUS_META[o.status].variant}>{STATUS_META[o.status].label}</Badge>
            {o.kind === "deposit" && <Badge variant="outline">Deposit</Badge>}
          </p>
          <p className="text-sm text-muted-foreground">
            {artistName} · {METHOD_LABEL[o.method]} · {formatDate(o.createdAt)}
            {o.status === "pending" && o.expiresAt && <> · held until {formatDate(o.expiresAt)}</>}
          </p>
        </div>
        <p className="text-right font-serif text-2xl">{formatPaise(o.amountPaise)}</p>
      </div>

      <dl className="mt-4 grid gap-x-8 gap-y-1 text-sm sm:grid-cols-2">
        <Line label="Price" value={formatPaise(o.pricePaise)} />
        <Line label="Shipping" value={o.shippingPaise ? formatPaise(o.shippingPaise) : "Free"} />
        {o.commissionBps > 0 && (
          <Line label={`Commission (${(o.commissionBps / 100).toFixed(o.commissionBps % 100 ? 2 : 0)}%)`} value={formatPaise(o.commissionPaise)} />
        )}
        <Line
          label={o.kind === "deposit" ? "Balance buyer pays artist" : "Artist's share"}
          value={formatPaise(o.artistSharePaise)}
        />
        {o.paymentReference && <Line label="Payment ref" value={o.paymentReference} mono />}
        {o.tracking && <Line label="Tracking" value={o.tracking} />}
      </dl>

      {(o.buyerName || o.shippingAddress) && (
        <div className="mt-4 rounded-sm bg-muted/60 p-3 text-sm">
          <p className="font-medium">{o.buyerName}</p>
          <p className="text-muted-foreground">
            {[o.buyerEmail, o.buyerPhone].filter(Boolean).join(" · ")}
          </p>
          {o.shippingAddress && <p className="mt-1 whitespace-pre-line">{o.shippingAddress}</p>}
        </div>
      )}
      {isAdmin && o.adminNote && <p className="mt-3 whitespace-pre-line text-xs text-muted-foreground">{o.adminNote}</p>}

      <div className="mt-4 flex flex-wrap items-end gap-3">
        {isAdmin && o.status === "pending" && o.method === "upi_manual" && (
          <form
            className="flex flex-wrap items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              run(() => confirmManualPayment(o.id, txn), "Payment confirmed; painting marked as sold/reserved");
            }}
          >
            <label className="space-y-1 text-xs">
              <span className="text-muted-foreground">UPI transaction ID (check it in your UPI app)</span>
              <Input value={txn} onChange={(e) => setTxn(e.target.value)} className="h-9 w-56" required />
            </label>
            <Button size="sm" type="submit" disabled={pending}>
              <CheckCircle2 aria-hidden /> Confirm payment received
            </Button>
          </form>
        )}

        {o.status === "paid" && (
          <form
            className="flex flex-wrap items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              run(() => shipOrder(o.id, tracking), "Marked as shipped");
            }}
          >
            <label className="space-y-1 text-xs">
              <span className="text-muted-foreground">Courier and tracking number</span>
              <Input value={tracking} onChange={(e) => setTracking(e.target.value)} className="h-9 w-56" required />
            </label>
            <Button size="sm" type="submit" variant="outline" disabled={pending}>
              <Package aria-hidden /> Mark shipped
            </Button>
          </form>
        )}

        {isAdmin && (o.status === "paid" || o.status === "shipped") && (
          <ConfirmDialog
            title="Mark this order completed?"
            description={
              o.method === "razorpay" && o.kind === "full" && o.commissionBps > 0
                ? "Only after the buyer has received the painting. This releases the artist's held payout through Razorpay."
                : o.kind === "deposit"
                  ? "Only after the artist confirms the buyer paid the balance and received the painting."
                  : "Only after the buyer has received the painting."
            }
            confirmLabel="Mark completed"
            confirmVariant="default"
            onConfirm={async () => run(() => completeOrder(o.id), "Order completed")}
            trigger={
              <Button size="sm" variant="ghost" disabled={pending}>
                <CheckCircle2 aria-hidden /> Complete
              </Button>
            }
          />
        )}
      </div>

      {isAdmin && live && (
        <details className="mt-4 text-sm">
          <summary className="cursor-pointer text-destructive">Cancel this order…</summary>
          <form
            className="mt-3 flex flex-wrap items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              run(() => cancelOrderAction(o.id, reason, refundRef || null), o.status === "pending" ? "Order cancelled" : "Order cancelled and refunded");
            }}
          >
            <label className="space-y-1 text-xs">
              <span className="text-muted-foreground">Reason</span>
              <Input value={reason} onChange={(e) => setReason(e.target.value)} className="h-9 w-64" required />
            </label>
            {o.status !== "pending" && o.method === "upi_manual" && (
              <label className="space-y-1 text-xs">
                <span className="text-muted-foreground">Refund UPI transaction ID (refund first)</span>
                <Input value={refundRef} onChange={(e) => setRefundRef(e.target.value)} className="h-9 w-56" required />
              </label>
            )}
            <Button size="sm" type="submit" variant="destructive" disabled={pending}>
              <XCircle aria-hidden />
              {o.status === "pending" ? "Cancel order" : o.method === "razorpay" ? "Cancel and refund via Razorpay" : "Cancel and record refund"}
            </Button>
          </form>
        </details>
      )}
    </li>
  );
}

function Line({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border/60 py-1">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={mono ? "font-mono text-xs" : undefined}>{value}</dd>
    </div>
  );
}
