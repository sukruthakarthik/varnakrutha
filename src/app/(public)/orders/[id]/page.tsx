import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, Clock, Package, Smartphone, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatPaise, paymentsConfig, upiLink } from "@/lib/payments/config";
import { siteConfig } from "@/lib/site";
import { getOrderForBuyer } from "@/services/orders";
import type { Order } from "@/types";
import { formatDate } from "@/utils/format";

export const metadata: Metadata = { title: "Your order", robots: { index: false, follow: false } };
// Always fresh: the status changes as the payment is confirmed.
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ t?: string }> };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The buyer's private order page; the link (with its token) is their only key to it. */
export default async function OrderPage({ params, searchParams }: Props) {
  const [{ id }, { t }] = await Promise.all([params, searchParams]);
  if (!UUID.test(id) || !t) notFound();
  const order = await getOrderForBuyer(id, t);
  if (!order) notFound();

  return (
    <div className="container-page max-w-2xl space-y-8 py-16 md:py-20">
      <div className="space-y-2">
        <p className="eyebrow">Order {order.reference}</p>
        <h1 className="text-4xl md:text-5xl">{order.artworkTitle}</h1>
        <p className="text-sm text-muted-foreground">Placed {formatDate(order.createdAt)} · Keep this page&apos;s link to check your order.</p>
      </div>

      <StatusPanel order={order} />

      <dl className="space-y-1.5 rounded-sm border border-border p-5 text-sm">
        <Row label="Price" value={formatPaise(order.pricePaise)} />
        <Row label="Shipping" value={order.shippingPaise ? formatPaise(order.shippingPaise) : "Free"} />
        {order.kind === "deposit" ? (
          <>
            <Row label="Deposit paid through Varnakrutha" value={formatPaise(order.amountPaise)} strong />
            <Row label="Balance, paid to the artist" value={formatPaise(order.artistSharePaise)} />
          </>
        ) : (
          <Row label="Total" value={formatPaise(order.amountPaise)} strong />
        )}
      </dl>

      <div className="text-sm text-muted-foreground">
        <p className="font-medium text-foreground">Delivering to</p>
        <p className="whitespace-pre-line">
          {order.buyerName}
          {"\n"}
          {order.shippingAddress}
        </p>
      </div>

      <p className="text-sm text-muted-foreground">
        Questions? <Link href="/contact" className="text-primary underline-offset-4 hover:underline">Contact us</Link> and
        mention <strong className="font-medium text-foreground">{order.reference}</strong>. See our{" "}
        <Link href="/terms" className="underline-offset-4 hover:underline">terms of sale</Link>.
      </p>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={strong ? "flex justify-between border-t border-border pt-1.5 font-medium" : "flex justify-between"}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function StatusPanel({ order }: { order: Order }) {
  if (order.status === "pending" && order.method === "upi_manual") return <UpiInstructions order={order} />;

  const panels: Partial<Record<Order["status"], { icon: React.ReactNode; title: string; body: string }>> = {
    pending: {
      icon: <Clock className="size-6" aria-hidden />,
      title: "Waiting for your payment",
      body: "If you've paid, this updates within a few minutes. Refresh the page to check.",
    },
    paid: {
      icon: <CheckCircle2 className="size-6 text-primary" aria-hidden />,
      title: order.kind === "deposit" ? "Deposit received: the painting is reserved for you" : "Payment received, thank you!",
      body:
        order.kind === "deposit"
          ? "We'll introduce you to the artist by email within one working day to arrange the balance and delivery."
          : "The painting is being prepared for shipping. We'll email you the tracking details.",
    },
    shipped: {
      icon: <Package className="size-6 text-primary" aria-hidden />,
      title: "On its way",
      body: order.tracking ? `Tracking: ${order.tracking}` : "Your painting has been shipped.",
    },
    completed: {
      icon: <CheckCircle2 className="size-6 text-primary" aria-hidden />,
      title: "Delivered. Enjoy your painting!",
      body: "Thank you for supporting original art.",
    },
    cancelled: { icon: <XCircle className="size-6" aria-hidden />, title: "This order was cancelled", body: "No payment was taken, or it has been refunded." },
    refunded: { icon: <XCircle className="size-6" aria-hidden />, title: "Refunded", body: "Your payment has been refunded. Bank refunds can take 5–7 working days to appear." },
    expired: {
      icon: <XCircle className="size-6" aria-hidden />,
      title: "This order expired",
      body: "No payment arrived in time, so the painting was released. If you paid, contact us with your transaction ID.",
    },
    failed: { icon: <XCircle className="size-6" aria-hidden />, title: "Checkout didn't start", body: "Nothing was charged. Please try again from the painting's page." },
  };
  const panel = panels[order.status];
  if (!panel) return null;
  return (
    <div role="status" className="flex gap-4 rounded-sm bg-secondary/60 p-5">
      {panel.icon}
      <div>
        <p className="font-medium">{panel.title}</p>
        <p className="text-sm text-foreground/80">{panel.body}</p>
      </div>
    </div>
  );
}

function UpiInstructions({ order }: { order: Order }) {
  const link = upiLink(order.amountPaise, order.reference);
  return (
    <div className="space-y-5 rounded-sm border border-primary/30 bg-secondary/40 p-6">
      <div className="flex gap-3">
        <Smartphone className="size-6 shrink-0 text-primary" aria-hidden />
        <div>
          <p className="font-medium">Pay {formatPaise(order.amountPaise)} by UPI to confirm</p>
          <p className="text-sm text-foreground/80">
            Use any UPI app (Google Pay, PhonePe, Paytm…). Put <strong>{order.reference}</strong> in the payment note.
            {order.expiresAt && <> The painting is held for you until {formatDate(order.expiresAt)}.</>}
          </p>
        </div>
      </div>

      <dl className="grid gap-2 text-sm sm:grid-cols-[auto_1fr] sm:gap-x-6">
        <dt className="text-muted-foreground">Pay to (UPI ID)</dt>
        <dd className="font-mono">{paymentsConfig.upi.id}</dd>
        <dt className="text-muted-foreground">Name</dt>
        <dd>{paymentsConfig.upi.payeeName}</dd>
        <dt className="text-muted-foreground">Amount</dt>
        <dd className="font-medium">{formatPaise(order.amountPaise)}</dd>
        <dt className="text-muted-foreground">Note / reference</dt>
        <dd className="font-mono">{order.reference}</dd>
      </dl>

      {link && (
        <Button asChild size="lg" className="w-full sm:w-auto">
          {/* Opens the UPI app on phones; on a computer, scan the QR or pay to the UPI ID above. */}
          <a href={link}>Pay with a UPI app</a>
        </Button>
      )}
      {paymentsConfig.upi.qrImage && (
        <div className="relative mx-auto size-56 overflow-hidden rounded-sm bg-white p-2">
          <Image src={paymentsConfig.upi.qrImage} alt={`UPI QR code for ${paymentsConfig.upi.payeeName}`} fill sizes="224px" className="object-contain" />
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        After you pay, we check the payment and confirm by email, usually within one working day. Please don&apos;t send
        screenshots in place of paying; only payments received in {siteConfig.name}&apos;s account confirm the order.
      </p>
    </div>
  );
}
