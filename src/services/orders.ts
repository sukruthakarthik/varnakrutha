import "server-only";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { isSupabase } from "@/lib/env";
import { commissionRateBps, computeOrderAmounts, MIN_ONLINE_PRICE_PAISE, type OrderAmounts } from "@/lib/payments/amounts";
import { ORDER_HOLD_MINUTES, paymentsConfig, toPaise } from "@/lib/payments/config";
import { isSiteArtist } from "@/lib/site";
import { getMockDb, persistMockDb } from "@/services/mock/store";
import { RepositoryError } from "@/services/types";
import {
  ACTIVE_ORDER_STATUS,
  type Availability,
  type Order,
  type OrderEvent,
  type OrderKind,
  type OrderMethod,
  type OrderStatus,
} from "@/types";

// All order logic lives here, over a small storage interface (Supabase with the service role, or the mock
// JSON store). Callers must check permissions first: public checkout, buyer token, admin or artist.

// ─── Storage ────────────────────────────────────────────────────────

interface CheckoutTarget {
  artworkId: string;
  title: string;
  price: number | null;
  shippingFee: number | null;
  availability: Availability;
  artistId: string;
  artistName: string;
  artistSlug: string;
  artistApproved: boolean;
  commissionOverrideBps: number | null;
  razorpayAccountId: string | null;
}

type NewOrder = Omit<Order, "id" | "reference" | "createdAt" | "updatedAt">;
type OrderPatch = Partial<
  Pick<
    Order,
    | "status"
    | "paymentReference"
    | "razorpayOrderId"
    | "razorpayTransferId"
    | "tracking"
    | "adminNote"
    | "expiresAt"
    | "paidAt"
  >
>;

interface OrderStore {
  checkoutTarget(artworkId: string): Promise<CheckoutTarget | null>;
  /** Marks this artwork's unpaid orders past their hold as expired, freeing it. */
  expireStale(artworkId: string): Promise<void>;
  /** Throws a "conflict" RepositoryError if the artwork already has a live order. */
  insert(order: NewOrder): Promise<Order>;
  get(id: string): Promise<Order | null>;
  byRazorpayOrderId(razorpayOrderId: string): Promise<Order | null>;
  list(filter: { artistId?: string; paidOnly?: boolean }): Promise<Order[]>;
  update(id: string, patch: OrderPatch): Promise<Order>;
  hasActive(artworkId: string, exceptOrderId?: string): Promise<boolean>;
  setArtworkAvailability(artworkId: string, availability: Availability): Promise<void>;
  addEvent(orderId: string, type: string, detail?: string): Promise<void>;
  events(orderId: string): Promise<OrderEvent[]>;
  /** Records a webhook event id; false if it was already handled. */
  claimWebhookEvent(id: string): Promise<boolean>;
}

const CONFLICT_MESSAGE =
  "Someone is buying this painting right now. If their payment doesn't go through, it becomes available again shortly.";

// Statuses that are a sale (count for commission reports and artist views).
const SALE_STATUS: OrderStatus[] = ["paid", "shipped", "completed"];

async function supabaseStore(): Promise<OrderStore> {
  const { createAdminSupabaseClient } = await import("@/lib/supabase/admin");
  const db = createAdminSupabaseClient();

  type Row = {
    id: string;
    reference: string;
    access_token: string;
    artwork_id: string | null;
    artist_id: string;
    artwork_title: string;
    kind: OrderKind;
    method: OrderMethod;
    status: OrderStatus;
    buyer_name: string;
    buyer_email: string;
    buyer_phone: string;
    shipping_address: string;
    price_paise: number;
    shipping_paise: number;
    amount_paise: number;
    commission_bps: number;
    commission_paise: number;
    artist_share_paise: number;
    payment_reference: string | null;
    razorpay_order_id: string | null;
    razorpay_transfer_id: string | null;
    tracking: string | null;
    admin_note: string | null;
    expires_at: string | null;
    paid_at: string | null;
    created_at: string;
    updated_at: string;
  };

  const toOrder = (r: Row): Order => ({
    id: r.id,
    reference: r.reference,
    accessToken: r.access_token,
    artworkId: r.artwork_id,
    artistId: r.artist_id,
    artworkTitle: r.artwork_title,
    kind: r.kind,
    method: r.method,
    status: r.status,
    buyerName: r.buyer_name,
    buyerEmail: r.buyer_email,
    buyerPhone: r.buyer_phone,
    shippingAddress: r.shipping_address,
    pricePaise: Number(r.price_paise),
    shippingPaise: Number(r.shipping_paise),
    amountPaise: Number(r.amount_paise),
    commissionBps: r.commission_bps,
    commissionPaise: Number(r.commission_paise),
    artistSharePaise: Number(r.artist_share_paise),
    paymentReference: r.payment_reference,
    razorpayOrderId: r.razorpay_order_id,
    razorpayTransferId: r.razorpay_transfer_id,
    tracking: r.tracking,
    adminNote: r.admin_note,
    expiresAt: r.expires_at,
    paidAt: r.paid_at,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  });

  const toPatchRow = (p: OrderPatch) => {
    const row: Record<string, unknown> = {};
    if (p.status !== undefined) row.status = p.status;
    if (p.paymentReference !== undefined) row.payment_reference = p.paymentReference;
    if (p.razorpayOrderId !== undefined) row.razorpay_order_id = p.razorpayOrderId;
    if (p.razorpayTransferId !== undefined) row.razorpay_transfer_id = p.razorpayTransferId;
    if (p.tracking !== undefined) row.tracking = p.tracking;
    if (p.adminNote !== undefined) row.admin_note = p.adminNote;
    if (p.expiresAt !== undefined) row.expires_at = p.expiresAt;
    if (p.paidAt !== undefined) row.paid_at = p.paidAt;
    return row;
  };

  const fail = (error: { message: string; code?: string } | null) => {
    if (!error) return;
    if (error.code === "23505") throw new RepositoryError(CONFLICT_MESSAGE, "conflict");
    throw new RepositoryError(error.message);
  };

  return {
    async checkoutTarget(artworkId) {
      const { data, error } = await db
        .from("artworks")
        .select(
          "id, title, price, shipping_fee, availability, artist_id, artists(name, slug, approved_at, commission_rate_bps, razorpay_account_id)",
        )
        .eq("id", artworkId)
        .maybeSingle();
      fail(error);
      if (!data) return null;
      const r = data as unknown as {
        id: string;
        title: string;
        price: number | null;
        shipping_fee: number | null;
        availability: Availability;
        artist_id: string;
        artists: {
          name: string;
          slug: string;
          approved_at: string | null;
          commission_rate_bps: number | null;
          razorpay_account_id: string | null;
        } | null;
      };
      if (!r.artists) return null;
      return {
        artworkId: r.id,
        title: r.title,
        price: r.price === null ? null : Number(r.price),
        shippingFee: r.shipping_fee === null ? null : Number(r.shipping_fee),
        availability: r.availability,
        artistId: r.artist_id,
        artistName: r.artists.name,
        artistSlug: r.artists.slug,
        artistApproved: Boolean(r.artists.approved_at),
        commissionOverrideBps: r.artists.commission_rate_bps,
        razorpayAccountId: r.artists.razorpay_account_id,
      };
    },
    async expireStale(artworkId) {
      fail(
        (
          await db
            .from("orders")
            .update({ status: "expired" })
            .eq("artwork_id", artworkId)
            .eq("status", "pending")
            .lt("expires_at", new Date().toISOString())
        ).error,
      );
    },
    async insert(o) {
      const { data, error } = await db
        .from("orders")
        .insert({
          access_token: o.accessToken,
          artwork_id: o.artworkId,
          artist_id: o.artistId,
          artwork_title: o.artworkTitle,
          kind: o.kind,
          method: o.method,
          status: o.status,
          buyer_name: o.buyerName,
          buyer_email: o.buyerEmail,
          buyer_phone: o.buyerPhone,
          shipping_address: o.shippingAddress,
          price_paise: o.pricePaise,
          shipping_paise: o.shippingPaise,
          amount_paise: o.amountPaise,
          commission_bps: o.commissionBps,
          commission_paise: o.commissionPaise,
          artist_share_paise: o.artistSharePaise,
          payment_reference: o.paymentReference,
          admin_note: o.adminNote,
          expires_at: o.expiresAt,
          paid_at: o.paidAt,
        })
        .select("*")
        .single<Row>();
      fail(error);
      if (!data) throw new RepositoryError("Couldn't create the order");
      return toOrder(data);
    },
    async get(id) {
      const { data, error } = await db.from("orders").select("*").eq("id", id).maybeSingle<Row>();
      fail(error);
      return data ? toOrder(data) : null;
    },
    async byRazorpayOrderId(razorpayOrderId) {
      const { data, error } = await db
        .from("orders")
        .select("*")
        .eq("razorpay_order_id", razorpayOrderId)
        .maybeSingle<Row>();
      fail(error);
      return data ? toOrder(data) : null;
    },
    async list({ artistId, paidOnly }) {
      let query = db.from("orders").select("*").order("created_at", { ascending: false }).limit(500);
      if (artistId) query = query.eq("artist_id", artistId);
      if (paidOnly) query = query.not("status", "in", "(pending,expired,failed)");
      const { data, error } = await query;
      fail(error);
      return ((data ?? []) as Row[]).map(toOrder);
    },
    async update(id, patch) {
      const { data, error } = await db.from("orders").update(toPatchRow(patch)).eq("id", id).select("*").single<Row>();
      fail(error);
      if (!data) throw new RepositoryError("Order not found", "not_found");
      return toOrder(data);
    },
    async hasActive(artworkId, exceptOrderId) {
      let query = db
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("artwork_id", artworkId)
        .in("status", ACTIVE_ORDER_STATUS);
      if (exceptOrderId) query = query.neq("id", exceptOrderId);
      const { count, error } = await query;
      fail(error);
      return Boolean(count);
    },
    async setArtworkAvailability(artworkId, availability) {
      fail((await db.from("artworks").update({ availability }).eq("id", artworkId)).error);
    },
    async addEvent(orderId, type, detail) {
      fail((await db.from("order_events").insert({ order_id: orderId, type, detail: detail?.slice(0, 1000) ?? null })).error);
    },
    async events(orderId) {
      const { data, error } = await db
        .from("order_events")
        .select("id, order_id, type, detail, created_at")
        .eq("order_id", orderId)
        .order("created_at");
      fail(error);
      return ((data ?? []) as { id: number; order_id: string; type: string; detail: string | null; created_at: string }[]).map(
        (e) => ({ id: String(e.id), orderId: e.order_id, type: e.type, detail: e.detail, createdAt: e.created_at }),
      );
    },
    async claimWebhookEvent(id) {
      const { error } = await db.from("payment_webhook_events").insert({ id });
      if (error?.code === "23505") return false;
      fail(error);
      return true;
    },
  };
}

function mockStore(): OrderStore {
  const now = () => new Date().toISOString();
  return {
    async checkoutTarget(artworkId) {
      const db = await getMockDb();
      const artwork = db.artworks.find((a) => a.id === artworkId);
      const artist = artwork && db.artists.find((a) => a.id === artwork.artistId);
      if (!artwork || !artist) return null;
      // Mock-only payment settings: add "commissionRateBps" / "razorpayAccountId" to the artist in .data/db.json.
      const extra = artist as typeof artist & { commissionRateBps?: number; razorpayAccountId?: string };
      return {
        artworkId: artwork.id,
        title: artwork.title,
        price: artwork.price,
        shippingFee: artwork.shippingFee ?? null,
        availability: artwork.availability,
        artistId: artist.id,
        artistName: artist.name,
        artistSlug: artist.slug,
        artistApproved: Boolean(artist.approvedAt),
        commissionOverrideBps: extra.commissionRateBps ?? null,
        razorpayAccountId: extra.razorpayAccountId ?? null,
      };
    },
    async expireStale(artworkId) {
      const db = await getMockDb();
      for (const o of db.orders) {
        if (o.artworkId === artworkId && o.status === "pending" && o.expiresAt && o.expiresAt < now()) {
          o.status = "expired";
          o.updatedAt = now();
        }
      }
      await persistMockDb(db);
    },
    async insert(o) {
      const db = await getMockDb();
      if (o.artworkId && ACTIVE_ORDER_STATUS.includes(o.status) && db.orders.some((x) => x.artworkId === o.artworkId && ACTIVE_ORDER_STATUS.includes(x.status))) {
        throw new RepositoryError(CONFLICT_MESSAGE, "conflict");
      }
      const order: Order = { ...o, id: crypto.randomUUID(), reference: `VK-${1001 + db.orders.length}`, createdAt: now(), updatedAt: now() };
      db.orders.push(order);
      await persistMockDb(db);
      return order;
    },
    async get(id) {
      return (await getMockDb()).orders.find((o) => o.id === id) ?? null;
    },
    async byRazorpayOrderId(razorpayOrderId) {
      return (await getMockDb()).orders.find((o) => o.razorpayOrderId === razorpayOrderId) ?? null;
    },
    async list({ artistId, paidOnly }) {
      return (await getMockDb()).orders
        .filter((o) => (!artistId || o.artistId === artistId) && (!paidOnly || !["pending", "expired", "failed"].includes(o.status)))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },
    async update(id, patch) {
      const db = await getMockDb();
      const order = db.orders.find((o) => o.id === id);
      if (!order) throw new RepositoryError("Order not found", "not_found");
      if (patch.status && ACTIVE_ORDER_STATUS.includes(patch.status) && order.artworkId) {
        const clash = db.orders.some((x) => x.id !== id && x.artworkId === order.artworkId && ACTIVE_ORDER_STATUS.includes(x.status));
        if (clash) throw new RepositoryError(CONFLICT_MESSAGE, "conflict");
      }
      Object.assign(order, patch, { updatedAt: now() });
      await persistMockDb(db);
      return order;
    },
    async hasActive(artworkId, exceptOrderId) {
      return (await getMockDb()).orders.some(
        (o) => o.artworkId === artworkId && o.id !== exceptOrderId && ACTIVE_ORDER_STATUS.includes(o.status),
      );
    },
    async setArtworkAvailability(artworkId, availability) {
      const db = await getMockDb();
      const artwork = db.artworks.find((a) => a.id === artworkId);
      if (artwork) artwork.availability = availability;
      await persistMockDb(db);
    },
    async addEvent(orderId, type, detail) {
      const db = await getMockDb();
      db.orderEvents.push({ id: crypto.randomUUID(), orderId, type, detail: detail ?? null, createdAt: now() });
      await persistMockDb(db);
    },
    async events(orderId) {
      return (await getMockDb()).orderEvents.filter((e) => e.orderId === orderId);
    },
    async claimWebhookEvent(id) {
      const db = await getMockDb();
      if (db.webhookEvents.includes(id)) return false;
      db.webhookEvents.push(id);
      await persistMockDb(db);
      return true;
    },
  };
}

function store(): Promise<OrderStore> {
  return isSupabase ? supabaseStore() : Promise.resolve(mockStore());
}

// ─── Checkout ───────────────────────────────────────────────────────

export interface CheckoutQuote extends OrderAmounts {
  artworkTitle: string;
  artistName: string;
  /** Why online buying isn't offered for this artwork, if it isn't. */
  unavailableReason: string | null;
}

function quoteFor(target: CheckoutTarget): CheckoutQuote {
  const pricePaise = toPaise(target.price);
  const amounts = computeOrderAmounts({
    pricePaise,
    shippingPaise: toPaise(target.shippingFee),
    isSiteArtist: isSiteArtist(target.artistSlug),
    commissionBps: commissionRateBps(target.commissionOverrideBps),
    canTransferToArtist: paymentsConfig.mode === "razorpay" && Boolean(target.razorpayAccountId),
  });
  let unavailableReason: string | null = null;
  if (!target.artistApproved) unavailableReason = "This artist's page isn't public yet.";
  else if (target.availability !== "available") unavailableReason = "This painting is no longer available.";
  else if (pricePaise < MIN_ONLINE_PRICE_PAISE) unavailableReason = "This painting can't be bought online; please enquire.";
  else if (amounts.amountPaise <= 0) unavailableReason = "This painting can't be reserved online; please enquire.";
  return { ...amounts, artworkTitle: target.title, artistName: target.artistName, unavailableReason };
}

/** The price breakdown a buyer would see, without creating anything. */
export async function getCheckoutQuote(artworkId: string): Promise<CheckoutQuote | null> {
  const target = await (await store()).checkoutTarget(artworkId);
  return target ? quoteFor(target) : null;
}

export interface BuyerDetails {
  name: string;
  email: string;
  phone: string;
  shippingAddress: string;
}

/**
 * Creates a pending order that holds the artwork, with every amount fixed now (later price or rate
 * changes don't affect it). In razorpay mode it also creates the Razorpay order for Checkout.
 */
export async function createOrder(artworkId: string, buyer: BuyerDetails): Promise<Order> {
  if (paymentsConfig.mode === "off") throw new RepositoryError("Online buying isn't available.", "invalid");
  const orders = await store();
  const target = await orders.checkoutTarget(artworkId);
  if (!target) throw new RepositoryError("Painting not found", "not_found");
  const quote = quoteFor(target);
  if (quote.unavailableReason) throw new RepositoryError(quote.unavailableReason, "invalid");

  const method: "razorpay" | "upi_manual" = paymentsConfig.mode === "razorpay" ? "razorpay" : "upi_manual";
  await orders.expireStale(artworkId);
  const order = await orders.insert({
    accessToken: randomBytes(24).toString("base64url"),
    artworkId,
    artistId: target.artistId,
    artworkTitle: target.title,
    kind: quote.kind,
    method,
    status: "pending",
    buyerName: buyer.name,
    buyerEmail: buyer.email,
    buyerPhone: buyer.phone,
    shippingAddress: buyer.shippingAddress,
    pricePaise: quote.pricePaise,
    shippingPaise: quote.shippingPaise,
    amountPaise: quote.amountPaise,
    commissionBps: quote.commissionBps,
    commissionPaise: quote.commissionPaise,
    artistSharePaise: quote.artistSharePaise,
    paymentReference: null,
    razorpayOrderId: null,
    razorpayTransferId: null,
    tracking: null,
    adminNote: null,
    expiresAt: new Date(Date.now() + ORDER_HOLD_MINUTES[method] * 60_000).toISOString(),
    paidAt: null,
  });
  await orders.addEvent(order.id, "created", `${quote.kind} order via ${method}`);

  if (method !== "razorpay") return order;
  try {
    const { createRazorpayOrder } = await import("@/lib/payments/razorpay");
    const rzp = await createRazorpayOrder({
      amountPaise: order.amountPaise,
      receipt: order.reference,
      orderId: order.id,
      transfer:
        quote.transferToArtist && target.razorpayAccountId
          ? { account: target.razorpayAccountId, amountPaise: order.artistSharePaise }
          : undefined,
    });
    return await orders.update(order.id, { razorpayOrderId: rzp.id });
  } catch (error) {
    // Release the hold so the painting isn't stuck behind an order nobody can pay.
    await orders.update(order.id, { status: "failed" });
    await orders.addEvent(order.id, "failed", error instanceof Error ? error.message : "Razorpay order failed");
    throw error;
  }
}

/** The buyer's own order page: the token in their link must match. */
export async function getOrderForBuyer(id: string, token: string): Promise<Order | null> {
  const order = await (await store()).get(id);
  if (!order) return null;
  const a = Buffer.from(order.accessToken);
  const b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b) ? order : null;
}

// ─── Status changes ─────────────────────────────────────────────────

export type PaidResult = { order: Order; outcome: "paid" | "already-paid" | "late-conflict" };

/**
 * Records a payment. Safe to call more than once (webhook retries, Checkout callback + webhook).
 * A payment arriving after the hold expired is accepted if the painting is still free; if someone else
 * bought it meanwhile, the caller must refund ("late-conflict").
 */
export async function markOrderPaid(orderId: string, paymentReference: string, source: string): Promise<PaidResult> {
  const orders = await store();
  const order = await orders.get(orderId);
  if (!order) throw new RepositoryError("Order not found", "not_found");
  if (SALE_STATUS.includes(order.status) || order.status === "refunded") return { order, outcome: "already-paid" };

  if (order.status !== "pending" && order.artworkId && (await orders.hasActive(order.artworkId, order.id))) {
    await orders.addEvent(order.id, "late_payment_conflict", `${source}: ${paymentReference}`);
    return { order, outcome: "late-conflict" };
  }

  let paid: Order;
  try {
    paid = await orders.update(order.id, { status: "paid", paymentReference, paidAt: new Date().toISOString(), expiresAt: null });
  } catch (error) {
    if (error instanceof RepositoryError && error.code === "conflict") {
      await orders.addEvent(order.id, "late_payment_conflict", `${source}: ${paymentReference}`);
      return { order, outcome: "late-conflict" };
    }
    throw error;
  }
  if (paid.artworkId) await orders.setArtworkAvailability(paid.artworkId, paid.kind === "full" ? "sold" : "reserved");
  await orders.addEvent(paid.id, "paid", `${source}: ${paymentReference}`);
  return { order: paid, outcome: "paid" };
}

export async function markOrderShipped(orderId: string, tracking: string, by: string): Promise<Order> {
  const orders = await store();
  const order = await orders.get(orderId);
  if (!order) throw new RepositoryError("Order not found", "not_found");
  if (order.status !== "paid" && order.status !== "shipped") {
    throw new RepositoryError("Only paid orders can be marked as shipped.", "invalid");
  }
  const updated = await orders.update(order.id, { status: "shipped", tracking });
  await orders.addEvent(order.id, "shipped", `${by}: ${tracking}`);
  return updated;
}

/**
 * Completes the sale. For a full Route order this releases the artist's held share; for a deposit it
 * means the artist confirmed the balance was paid and the painting delivered.
 */
export async function markOrderCompleted(orderId: string, by: string): Promise<Order> {
  const orders = await store();
  const order = await orders.get(orderId);
  if (!order) throw new RepositoryError("Order not found", "not_found");
  if (order.status !== "paid" && order.status !== "shipped") {
    throw new RepositoryError("Only paid or shipped orders can be completed.", "invalid");
  }
  let transferId = order.razorpayTransferId;
  // Any full Razorpay order may carry a held transfer (none for the site's own works); release it if so.
  if (order.method === "razorpay" && order.kind === "full" && order.razorpayOrderId) {
    const { findOrderTransferId, releaseTransfer } = await import("@/lib/payments/razorpay");
    transferId ??= await findOrderTransferId(order.razorpayOrderId);
    if (transferId) {
      await releaseTransfer(transferId);
      await orders.addEvent(order.id, "payout_released", transferId);
    }
  }
  const updated = await orders.update(order.id, { status: "completed", razorpayTransferId: transferId });
  if (updated.artworkId) await orders.setArtworkAvailability(updated.artworkId, "sold");
  await orders.addEvent(order.id, "completed", by);
  return updated;
}

/**
 * Cancels an order. Paid Razorpay orders are refunded through Razorpay (including any transfer);
 * manual UPI refunds are made by the admin in their UPI app, then recorded here with `refundReference`.
 */
export async function cancelOrder(
  orderId: string,
  input: { reason: string; refundReference?: string | null },
  by: string,
): Promise<Order> {
  const orders = await store();
  const order = await orders.get(orderId);
  if (!order) throw new RepositoryError("Order not found", "not_found");
  if (!["pending", "paid", "shipped"].includes(order.status)) {
    throw new RepositoryError("This order can't be cancelled.", "invalid");
  }
  const wasPaid = order.status !== "pending";
  let status: OrderStatus = "cancelled";
  let refundNote = "";

  if (wasPaid && order.method === "razorpay" && order.paymentReference) {
    const { refundPayment } = await import("@/lib/payments/razorpay");
    const refund = await refundPayment(order.paymentReference, input.reason);
    status = "refunded";
    refundNote = ` Razorpay refund ${refund.id}.`;
  } else if (wasPaid) {
    if (!input.refundReference) {
      throw new RepositoryError("Refund the buyer in your UPI app first, then enter the refund's transaction ID.", "invalid");
    }
    status = "refunded";
    refundNote = ` Refund ${input.refundReference}.`;
  }

  const updated = await orders.update(order.id, {
    status,
    adminNote: [order.adminNote, `Cancelled: ${input.reason}.${refundNote}`].filter(Boolean).join("\n").slice(0, 2000),
  });
  // Put the painting back on sale if this order had taken it off.
  if (wasPaid && updated.artworkId && !(await orders.hasActive(updated.artworkId, updated.id))) {
    await orders.setArtworkAvailability(updated.artworkId, "available");
  }
  await orders.addEvent(order.id, status, `${by}: ${input.reason}.${refundNote}`);
  return updated;
}

/** A Razorpay payment for an order that can no longer be fulfilled (someone else bought it): refund it in full. */
export async function refundLatePayment(order: Order, paymentId: string): Promise<void> {
  const orders = await store();
  const { refundPayment } = await import("@/lib/payments/razorpay");
  const refund = await refundPayment(paymentId, "Painting was sold to another buyer before this payment arrived");
  await orders.update(order.id, {
    status: "refunded",
    paymentReference: paymentId,
    adminNote: [order.adminNote, `Late payment refunded automatically (${refund.id}).`].filter(Boolean).join("\n"),
  });
  await orders.addEvent(order.id, "refunded", `Late payment ${paymentId} refunded: ${refund.id}`);
}

// ─── Offline sales and reading ──────────────────────────────────────

/**
 * Records a sale made outside online checkout (UPI or bank transfer arranged by message, cash at an
 * exhibition), so the painting is marked sold and the commission owed is on record.
 */
export async function recordOfflineSale(input: {
  artworkId: string;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
  salePricePaise: number;
  paymentReference: string;
  note: string | null;
}): Promise<Order> {
  const orders = await store();
  const target = await orders.checkoutTarget(input.artworkId);
  if (!target) throw new RepositoryError("Painting not found", "not_found");
  if (await orders.hasActive(input.artworkId)) {
    throw new RepositoryError("This painting has an open order. Complete or cancel it first.", "conflict");
  }
  const amounts = computeOrderAmounts({
    pricePaise: input.salePricePaise,
    shippingPaise: 0,
    isSiteArtist: isSiteArtist(target.artistSlug),
    commissionBps: commissionRateBps(target.commissionOverrideBps),
    canTransferToArtist: false,
  });
  const order = await orders.insert({
    accessToken: randomBytes(24).toString("base64url"),
    artworkId: input.artworkId,
    artistId: target.artistId,
    artworkTitle: target.title,
    kind: "full",
    method: "offline",
    status: "completed",
    buyerName: input.buyerName,
    buyerEmail: input.buyerEmail,
    buyerPhone: input.buyerPhone,
    shippingAddress: "",
    pricePaise: input.salePricePaise,
    shippingPaise: 0,
    amountPaise: input.salePricePaise,
    commissionBps: amounts.commissionBps,
    commissionPaise: amounts.commissionPaise,
    artistSharePaise: input.salePricePaise - amounts.commissionPaise,
    paymentReference: input.paymentReference,
    razorpayOrderId: null,
    razorpayTransferId: null,
    tracking: null,
    adminNote: input.note,
    expiresAt: null,
    paidAt: new Date().toISOString(),
  });
  await orders.setArtworkAvailability(input.artworkId, "sold");
  await orders.addEvent(order.id, "recorded_offline", input.paymentReference);
  return order;
}

export async function listOrders(filter: { artistId?: string; paidOnly?: boolean } = {}): Promise<Order[]> {
  return (await store()).list(filter);
}

export async function getOrder(id: string): Promise<Order | null> {
  return (await store()).get(id);
}

export async function getOrderByRazorpayOrderId(razorpayOrderId: string): Promise<Order | null> {
  return (await store()).byRazorpayOrderId(razorpayOrderId);
}

export async function listOrderEvents(orderId: string): Promise<OrderEvent[]> {
  return (await store()).events(orderId);
}

export async function artworkHasOpenOrder(artworkId: string): Promise<boolean> {
  // With payments off there are no new orders, and the orders table may not even exist yet;
  // don't let this check break artwork editing. (Finish open orders before switching payments off.)
  if (paymentsConfig.mode === "off") return false;
  return (await store()).hasActive(artworkId);
}

export async function claimWebhookEvent(id: string): Promise<boolean> {
  return (await store()).claimWebhookEvent(id);
}
