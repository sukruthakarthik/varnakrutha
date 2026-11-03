import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { verifyWebhookSignature } from "@/lib/payments/razorpay";
import {
  claimWebhookEvent,
  getOrder,
  getOrderByRazorpayOrderId,
  markOrderPaid,
  refundLatePayment,
} from "@/services/orders";

/**
 * Razorpay webhook. In the Razorpay Dashboard → Webhooks, add https://varnakrutha.in/api/razorpay/webhook
 * with the secret from RAZORPAY_WEBHOOK_SECRET and the events "order.paid" and "payment.captured".
 *
 * This, not the buyer's browser, is the source of truth: it marks orders paid even if the buyer closed the
 * tab. Handling is idempotent (marking an order paid twice is a no-op), so retries are harmless; the event
 * id is recorded only after success, and errors return 500 so Razorpay retries.
 */
export async function POST(request: NextRequest) {
  const raw = await request.text();
  if (!verifyWebhookSignature(raw, request.headers.get("x-razorpay-signature"))) {
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  let event: RazorpayEvent;
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  try {
    await handle(event);
  } catch (error) {
    console.error("[razorpay] webhook handling failed:", error);
    return NextResponse.json({ error: "handling failed" }, { status: 500 });
  }

  const eventId = request.headers.get("x-razorpay-event-id");
  if (eventId) await claimWebhookEvent(eventId).catch(() => undefined);
  return NextResponse.json({ ok: true });
}

type RazorpayEvent = {
  event?: string;
  payload?: {
    payment?: { entity?: { id?: string; order_id?: string; amount?: number; status?: string } };
    order?: { entity?: { id?: string; notes?: { order_id?: string } } };
  };
};

async function handle(event: RazorpayEvent): Promise<void> {
  if (event.event === "order.paid" || event.event === "payment.captured") {
    const payment = event.payload?.payment?.entity;
    const razorpayOrderId = payment?.order_id ?? event.payload?.order?.entity?.id;
    if (!payment?.id || !razorpayOrderId) return;

    // Our id travels in the order's notes; only use it if it's a real UUID, or the lookup would fail on every retry.
    const noted = event.payload?.order?.entity?.notes?.order_id;
    const ourId = noted && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(noted) ? noted : null;
    const order = (ourId ? await getOrder(ourId) : null) ?? (await getOrderByRazorpayOrderId(razorpayOrderId));
    if (!order || order.razorpayOrderId !== razorpayOrderId) {
      // Not one of ours (or a different site on the same account): acknowledge so Razorpay stops retrying.
      return;
    }
    // Never trust an amount we didn't set.
    if (typeof payment.amount === "number" && payment.amount !== order.amountPaise) {
      console.error(`[razorpay] amount mismatch on ${order.reference}: paid ${payment.amount}, expected ${order.amountPaise}`);
      return;
    }

    const result = await markOrderPaid(order.id, payment.id, "webhook");
    if (result.outcome === "late-conflict") await refundLatePayment(result.order, payment.id);
    revalidatePath("/", "layout");
  }
}
