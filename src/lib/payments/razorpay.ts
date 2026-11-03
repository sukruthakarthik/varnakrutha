import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { RepositoryError } from "@/services/types";

// Razorpay's REST API, called directly (no SDK). Docs: https://razorpay.com/docs/api/
// Keys: RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET (Dashboard → Account & Settings → API Keys; use test keys
// while testing) and RAZORPAY_WEBHOOK_SECRET (the secret you type when adding the webhook).

const API = "https://api.razorpay.com/v1";

function keys() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    throw new RepositoryError("Razorpay isn't configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.", "invalid");
  }
  return { keyId, keySecret };
}

/** The public key id, needed by Razorpay Checkout in the browser. */
export function razorpayKeyId(): string {
  return keys().keyId;
}

async function call<T>(method: "GET" | "POST" | "PATCH", path: string, body?: unknown): Promise<T> {
  const { keyId, keySecret } = keys();
  const response = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`,
      "Content-Type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });
  const json = (await response.json().catch(() => ({}))) as { error?: { description?: string } };
  if (!response.ok) {
    throw new RepositoryError(`Razorpay: ${json.error?.description ?? `request failed (${response.status})`}`);
  }
  return json as unknown as T;
}

export interface RazorpayOrder {
  id: string;
  amount: number;
  status: string;
}

/**
 * Creates the Razorpay order the buyer pays. With `transfer`, Route moves the artist's share to their
 * linked account when the payment is captured, held until releaseTransfer().
 */
export function createRazorpayOrder(input: {
  amountPaise: number;
  receipt: string;
  orderId: string;
  transfer?: { account: string; amountPaise: number };
}): Promise<RazorpayOrder> {
  return call<RazorpayOrder>("POST", "/orders", {
    amount: input.amountPaise,
    currency: "INR",
    receipt: input.receipt.slice(0, 40),
    notes: { order_id: input.orderId, reference: input.receipt },
    ...(input.transfer
      ? {
          transfers: [
            {
              account: input.transfer.account,
              amount: input.transfer.amountPaise,
              currency: "INR",
              on_hold: true,
              notes: { order_id: input.orderId, reference: input.receipt },
            },
          ],
        }
      : {}),
  });
}

/** The transfer Route created for an order, if any. */
export async function findOrderTransferId(razorpayOrderId: string): Promise<string | null> {
  const result = await call<{ items?: { id: string }[] }>("GET", `/orders/${razorpayOrderId}/transfers`);
  return result.items?.[0]?.id ?? null;
}

/** Pays the held artist share out (after delivery). */
export async function releaseTransfer(transferId: string): Promise<void> {
  await call("PATCH", `/transfers/${transferId}`, { on_hold: false });
}

/** Full refund; reverse_all also pulls back any transfer made to the artist. */
export async function refundPayment(paymentId: string, note: string): Promise<{ id: string }> {
  return call<{ id: string }>("POST", `/payments/${paymentId}/refund`, { reverse_all: 1, notes: { reason: note.slice(0, 200) } });
}

function safeEqualHex(expected: string, received: string): boolean {
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(received, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Checkout's success callback signature: HMAC-SHA256("<order_id>|<payment_id>", key secret). */
export function verifyCheckoutSignature(razorpayOrderId: string, paymentId: string, signature: string): boolean {
  const expected = createHmac("sha256", keys().keySecret).update(`${razorpayOrderId}|${paymentId}`).digest("hex");
  return safeEqualHex(expected, signature);
}

/** Webhook signature: HMAC-SHA256(raw body, webhook secret). */
export function verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  return safeEqualHex(expected, signature);
}
