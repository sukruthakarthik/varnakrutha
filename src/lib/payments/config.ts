import { env } from "@/lib/env";

/** Safe for the browser: only public settings. Secrets live in lib/payments/razorpay.ts (server only). */
export type PaymentsMode = "off" | "manual" | "razorpay";

export const paymentsConfig = {
  mode: env.NEXT_PUBLIC_PAYMENTS_MODE as PaymentsMode,
  upi: {
    id: env.NEXT_PUBLIC_UPI_ID ?? null,
    payeeName: env.NEXT_PUBLIC_UPI_PAYEE_NAME ?? "Varnakrutha",
    qrImage: env.NEXT_PUBLIC_UPI_QR_IMAGE ?? null,
  },
} as const;

/** Manual mode also needs a UPI ID to show buyers; without one, buying stays off. */
export const paymentsEnabled =
  paymentsConfig.mode === "razorpay" || (paymentsConfig.mode === "manual" && Boolean(paymentsConfig.upi.id));

/** How long an unpaid order holds the artwork before someone else may buy it. */
export const ORDER_HOLD_MINUTES = { upi_manual: 48 * 60, razorpay: 30 } as const;

/** Prices are rupees in the database; orders are paise. */
export const toPaise = (rupees: number | null | undefined) => Math.round((rupees ?? 0) * 100);

export function formatPaise(paise: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: paise % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(paise / 100);
}

/** A UPI deep link: opens PhonePe / Google Pay / Paytm with the amount and reference filled in. */
export function upiLink(amountPaise: number, reference: string): string | null {
  if (!paymentsConfig.upi.id) return null;
  const params = new URLSearchParams({
    pa: paymentsConfig.upi.id,
    pn: paymentsConfig.upi.payeeName,
    am: (amountPaise / 100).toFixed(2),
    cu: "INR",
    tn: reference,
  });
  return `upi://pay?${params.toString()}`;
}
