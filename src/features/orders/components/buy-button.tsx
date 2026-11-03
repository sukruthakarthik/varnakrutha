"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ShieldCheck, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatPaise } from "@/lib/payments/config";
import { confirmCheckoutPayment, startCheckout, type CheckoutStarted } from "../actions";

/** The server-computed breakdown for this artwork (see services/orders getCheckoutQuote). */
export interface BuyQuote {
  kind: "full" | "deposit";
  pricePaise: number;
  shippingPaise: number;
  amountPaise: number;
  balanceToArtistPaise: number;
  artworkTitle: string;
  artistName: string;
}

type Fields = "name" | "email" | "phone" | "address" | "pincode";

interface RazorpayCheckout {
  open(): void;
}
declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayCheckout;
  }
}

function loadRazorpay(): Promise<boolean> {
  if (window.Razorpay) return Promise.resolve(true);
  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export function BuyButton({ artworkId, quote }: { artworkId: string; quote: BuyQuote }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<Fields, string>>>({});
  // A Razorpay order already created in this dialog: retrying reopens it instead of creating a second
  // order, which would clash with the first one still holding the painting.
  const [started, setStarted] = useState<{ order: CheckoutStarted; prefill: Record<string, string> } | null>(null);
  const deposit = quote.kind === "deposit";

  async function openCheckout(order: CheckoutStarted, prefill: Record<string, string>) {
    const orderPage = `/orders/${order.orderId}?t=${encodeURIComponent(order.token)}`;
    if (!order.razorpay) {
      router.push(orderPage);
      return;
    }
    if (!(await loadRazorpay()) || !window.Razorpay) {
      setPending(false);
      setError("Couldn't load the payment window. Check your connection and try again.");
      return;
    }
    const checkout = new window.Razorpay({
      key: order.razorpay.keyId,
      order_id: order.razorpay.orderId,
      amount: order.amountPaise,
      currency: "INR",
      name: "Varnakrutha",
      description: `${deposit ? "Reservation deposit: " : ""}${quote.artworkTitle}`,
      prefill,
      notes: { reference: order.reference },
      theme: { color: "#9c4a2f" },
      handler: async (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
        await confirmCheckoutPayment({
          orderId: order.orderId,
          token: order.token,
          razorpayOrderId: response.razorpay_order_id,
          razorpayPaymentId: response.razorpay_payment_id,
          razorpaySignature: response.razorpay_signature,
        });
        // Even if confirming here failed, the webhook will; the order page shows the latest status.
        router.push(orderPage);
      },
      modal: {
        ondismiss: () => {
          setPending(false);
          setError("Payment wasn't completed. The painting is held for you for 30 minutes; you can try again.");
        },
      },
    });
    checkout.open();
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    if (started) {
      setPending(true);
      setError(null);
      await openCheckout(started.order, started.prefill);
      return;
    }
    const form = new FormData(event.currentTarget);
    const value = (key: string) => String(form.get(key) ?? "");
    setPending(true);
    setError(null);
    setFieldErrors({});

    const res = await startCheckout({
      artworkId,
      name: value("name"),
      email: value("email"),
      phone: value("phone"),
      address: value("address"),
      pincode: value("pincode"),
      company: value("company"),
    });
    if (!res.ok) {
      setPending(false);
      setError(res.error);
      const next: Partial<Record<Fields, string>> = {};
      for (const [field, messages] of Object.entries(res.fieldErrors ?? {})) {
        if (messages?.[0]) next[field as Fields] = messages[0];
      }
      setFieldErrors(next);
      return;
    }

    const prefill = { name: value("name"), email: value("email"), contact: value("phone") };
    if (res.data.razorpay) setStarted({ order: res.data, prefill });
    await openCheckout(res.data, prefill);
  }

  const field = (name: Fields) => ({
    id: `buy-${name}`,
    name,
    "aria-invalid": Boolean(fieldErrors[name]) || undefined,
    "aria-describedby": fieldErrors[name] ? `buy-${name}-error` : undefined,
  });
  const fieldError = (name: Fields) =>
    fieldErrors[name] ? (
      <p id={`buy-${name}-error`} className="text-xs text-destructive">
        {fieldErrors[name]}
      </p>
    ) : null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg" className="w-full">
          <ShoppingBag aria-hidden />
          {deposit ? `Reserve with ${formatPaise(quote.amountPaise)} deposit` : `Buy now · ${formatPaise(quote.amountPaise)}`}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[92dvh] max-w-lg overflow-y-auto">
        <div className="pr-8">
          <DialogTitle>{deposit ? "Reserve this painting" : "Buy this painting"}</DialogTitle>
          <DialogDescription>
            {quote.artworkTitle} by {quote.artistName}
          </DialogDescription>
        </div>

        <dl className="space-y-1.5 rounded-sm bg-secondary/50 p-4 text-sm">
          <div className="flex justify-between">
            <dt>Price</dt>
            <dd>{formatPaise(quote.pricePaise)}</dd>
          </div>
          <div className="flex justify-between">
            <dt>Shipping</dt>
            <dd>{quote.shippingPaise ? formatPaise(quote.shippingPaise) : "Free"}</dd>
          </div>
          {deposit ? (
            <>
              <div className="flex justify-between border-t border-border pt-1.5 font-medium">
                <dt>Deposit to pay now</dt>
                <dd>{formatPaise(quote.amountPaise)}</dd>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <dt>Balance, paid to the artist later</dt>
                <dd>{formatPaise(quote.balanceToArtistPaise)}</dd>
              </div>
            </>
          ) : (
            <div className="flex justify-between border-t border-border pt-1.5 font-medium">
              <dt>Total</dt>
              <dd>{formatPaise(quote.amountPaise)}</dd>
            </div>
          )}
        </dl>
        {deposit && (
          <p className="text-xs text-muted-foreground">
            The deposit reserves the painting for you. Once it&apos;s received, we introduce you to the artist, and you pay
            them the balance directly before they ship. It&apos;s refunded in full if the artist can&apos;t complete the sale.
          </p>
        )}

        <form onSubmit={onSubmit} noValidate className="space-y-4">
          <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
            <label htmlFor="buy-company">Company</label>
            <input id="buy-company" name="company" type="text" tabIndex={-1} autoComplete="off" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="buy-name">Full name</Label>
            <Input {...field("name")} autoComplete="name" required />
            {fieldError("name")}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="buy-email">Email</Label>
              <Input {...field("email")} type="email" autoComplete="email" required />
              {fieldError("email")}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="buy-phone">Phone</Label>
              <Input {...field("phone")} type="tel" autoComplete="tel" required />
              {fieldError("phone")}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="buy-address">Delivery address</Label>
            <Textarea {...field("address")} rows={3} autoComplete="street-address" required />
            {fieldError("address")}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="buy-pincode">PIN code</Label>
            <Input {...field("pincode")} inputMode="numeric" autoComplete="postal-code" maxLength={6} required className="max-w-40" />
            {fieldError("pincode")}
          </div>
          <p className="text-xs text-muted-foreground">
            We deliver within India. Your details are shared with the artist only after payment. By continuing you agree
            to the{" "}
            <a href="/terms" target="_blank" className="underline underline-offset-4 hover:text-primary">
              terms of sale, shipping and refunds
            </a>
            .
          </p>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <Button type="submit" size="lg" className="w-full" disabled={pending}>
            {pending ? <Loader2 className="animate-spin" aria-hidden /> : <ShieldCheck aria-hidden />}
            {pending ? "Starting…" : `Continue to pay ${formatPaise(quote.amountPaise)}`}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
