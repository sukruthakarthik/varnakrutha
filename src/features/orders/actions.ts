"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { actionError, type ActionResult } from "@/lib/action-result";
import { requireAdminAction, requirePlatformAdminAction } from "@/lib/auth";
import { paymentsEnabled, toPaise } from "@/lib/payments/config";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request";
import {
  cancelOrder,
  createOrder,
  getOrder,
  getOrderForBuyer,
  markOrderCompleted,
  markOrderPaid,
  markOrderShipped,
  recordOfflineSale,
  refundLatePayment,
} from "@/services/orders";
import { checkoutSchema, recordSaleSchema, type CheckoutFormValues, type RecordSaleFormValues } from "./schemas";

const idSchema = z.string().uuid();

function revalidateAfterSale() {
  // Availability changed: refresh the public pages and the admin.
  revalidatePath("/", "layout");
}

// ─── Buyers ─────────────────────────────────────────────────────────

export interface CheckoutStarted {
  orderId: string;
  token: string;
  method: "upi_manual" | "razorpay";
  amountPaise: number;
  reference: string;
  razorpay: { keyId: string; orderId: string } | null;
}

export async function startCheckout(values: CheckoutFormValues): Promise<ActionResult<CheckoutStarted>> {
  if (!paymentsEnabled) return { ok: false, error: "Online buying isn't available right now. Please enquire instead." };
  const parsed = checkoutSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: "Please check the highlighted fields", fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const { company, artworkId, name, email, phone, address, pincode } = parsed.data;
  if (company) return { ok: false, error: "We couldn't start checkout. Please try again." };
  if (!rateLimit(`checkout:${await getClientIp()}`, 10, 60 * 60 * 1000)) {
    return { ok: false, error: "Too many attempts. Please try again later." };
  }

  try {
    const order = await createOrder(artworkId, { name, email, phone, shippingAddress: `${address}\nPIN ${pincode}` });
    let razorpay: CheckoutStarted["razorpay"] = null;
    if (order.method === "razorpay") {
      const { razorpayKeyId } = await import("@/lib/payments/razorpay");
      razorpay = { keyId: razorpayKeyId(), orderId: order.razorpayOrderId ?? "" };
    }
    return {
      ok: true,
      data: {
        orderId: order.id,
        token: order.accessToken,
        method: order.method === "razorpay" ? "razorpay" : "upi_manual",
        amountPaise: order.amountPaise,
        reference: order.reference,
        razorpay,
      },
    };
  } catch (error) {
    return actionError(error, "We couldn't start checkout. Please try again.");
  }
}

/**
 * Razorpay Checkout's success callback. The signature proves the payment is genuine, so the order can be
 * marked paid straight away; the webhook does the same independently, in case the buyer closes the tab.
 */
export async function confirmCheckoutPayment(input: {
  orderId: string;
  token: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}): Promise<ActionResult> {
  try {
    const order = await getOrderForBuyer(idSchema.parse(input.orderId), input.token);
    if (!order || order.razorpayOrderId !== input.razorpayOrderId) return { ok: false, error: "Order not found" };
    const { verifyCheckoutSignature } = await import("@/lib/payments/razorpay");
    if (!verifyCheckoutSignature(input.razorpayOrderId, input.razorpayPaymentId, input.razorpaySignature)) {
      return { ok: false, error: "We couldn't verify the payment. If money was taken, it will be confirmed shortly." };
    }
    const result = await markOrderPaid(order.id, input.razorpayPaymentId, "checkout");
    if (result.outcome === "late-conflict") await refundLatePayment(result.order, input.razorpayPaymentId);
    revalidateAfterSale();
    return { ok: true, data: undefined };
  } catch (error) {
    return actionError(error, "We couldn't confirm the payment yet. If money was taken, it will be confirmed shortly.");
  }
}

// ─── Admins and artists ─────────────────────────────────────────────

/** Manual UPI: the admin has seen the money arrive in their UPI app (never trust a screenshot). */
export async function confirmManualPayment(orderId: string, transactionId: string): Promise<ActionResult> {
  try {
    const admin = await requirePlatformAdminAction();
    const reference = z.string().trim().min(4, "Enter the UPI transaction ID").max(120).parse(transactionId);
    const order = await getOrder(idSchema.parse(orderId));
    if (!order) return { ok: false, error: "Order not found" };
    if (order.method !== "upi_manual") return { ok: false, error: "Only manual UPI orders are confirmed by hand." };
    const result = await markOrderPaid(order.id, reference, `admin ${admin.email ?? "admin"}`);
    if (result.outcome === "late-conflict") {
      return {
        ok: false,
        error: "This painting was sold through another order meanwhile. Refund this buyer in your UPI app, then cancel this order.",
      };
    }
    revalidateAfterSale();
    return { ok: true, data: undefined };
  } catch (error) {
    if (error instanceof z.ZodError) return { ok: false, error: error.issues[0]?.message ?? "Check the transaction ID" };
    return actionError(error);
  }
}

/** Artists ship their own orders; admins can mark any order. */
export async function shipOrder(orderId: string, tracking: string): Promise<ActionResult> {
  try {
    const admin = await requireAdminAction();
    const details = z.string().trim().min(3, "Enter the courier and tracking number").max(200).parse(tracking);
    const order = await getOrder(idSchema.parse(orderId));
    if (!order || (!admin.isPlatformAdmin && order.artistId !== admin.artist.id)) return { ok: false, error: "Order not found" };
    await markOrderShipped(order.id, details, admin.isPlatformAdmin ? "admin" : `artist ${admin.artist.name}`);
    revalidatePath("/admin", "layout");
    return { ok: true, data: undefined };
  } catch (error) {
    if (error instanceof z.ZodError) return { ok: false, error: error.issues[0]?.message ?? "Check the tracking details" };
    return actionError(error);
  }
}

/** Admin only: completes the sale and releases any held artist payout. */
export async function completeOrder(orderId: string): Promise<ActionResult> {
  try {
    const admin = await requirePlatformAdminAction();
    await markOrderCompleted(idSchema.parse(orderId), `admin ${admin.email ?? "admin"}`);
    revalidateAfterSale();
    return { ok: true, data: undefined };
  } catch (error) {
    return actionError(error);
  }
}

export async function cancelOrderAction(
  orderId: string,
  reason: string,
  refundReference: string | null,
): Promise<ActionResult> {
  try {
    const admin = await requirePlatformAdminAction();
    const why = z.string().trim().min(3, "Say why the order is cancelled").max(300).parse(reason);
    const refund = refundReference?.trim() ? refundReference.trim().slice(0, 120) : null;
    await cancelOrder(idSchema.parse(orderId), { reason: why, refundReference: refund }, `admin ${admin.email ?? "admin"}`);
    revalidateAfterSale();
    return { ok: true, data: undefined };
  } catch (error) {
    if (error instanceof z.ZodError) return { ok: false, error: error.issues[0]?.message ?? "Check the details" };
    return actionError(error);
  }
}

/** Admin only: a sale arranged outside online checkout. */
export async function recordSale(values: RecordSaleFormValues): Promise<ActionResult<{ reference: string }>> {
  try {
    await requirePlatformAdminAction();
    const parsed = recordSaleSchema.safeParse(values);
    if (!parsed.success) {
      return { ok: false, error: "Please check the highlighted fields", fieldErrors: parsed.error.flatten().fieldErrors };
    }
    const v = parsed.data;
    const order = await recordOfflineSale({
      artworkId: v.artworkId,
      buyerName: v.buyerName,
      buyerEmail: v.buyerEmail,
      buyerPhone: v.buyerPhone,
      salePricePaise: toPaise(v.salePrice),
      paymentReference: v.paymentReference,
      note: v.note,
    });
    revalidateAfterSale();
    return { ok: true, data: { reference: order.reference } };
  } catch (error) {
    return actionError(error);
  }
}

