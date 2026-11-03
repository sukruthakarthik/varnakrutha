/**
 * The money rules for one order, in paise (whole numbers only; never floating rupees).
 *
 * - The site's own artist: the platform is the seller; no commission; the buyer pays price + shipping.
 * - Featured artist with a Razorpay linked account (razorpay mode only): the buyer pays price + shipping;
 *   the artist's share is transferred to them, on hold until the admin releases it.
 * - Any other featured artist: the buyer pays only the commission now, as a deposit that reserves the
 *   work, and pays the balance (price + shipping − commission) to the artist after being introduced.
 *   The platform's commission is collected before buyer and artist are in touch.
 *
 * Commission is charged on the price only; shipping goes to the artist in full. Gateway fees are
 * absorbed by the platform and not modelled here; GST/TDS treatment is for the accountant (docs/PAYMENTS.md).
 */
export interface OrderAmounts {
  kind: "full" | "deposit";
  pricePaise: number;
  shippingPaise: number;
  commissionBps: number;
  commissionPaise: number;
  /** Paid by the buyer through Varnakrutha now. */
  amountPaise: number;
  /** The artist's part of price + shipping. */
  artistSharePaise: number;
  /** Deposits only: what the buyer still pays the artist directly. */
  balanceToArtistPaise: number;
  /** Full orders to a featured artist with a linked account: transfer the artist share via Route. */
  transferToArtist: boolean;
}

export const DEFAULT_COMMISSION_BPS = 1500;

/** Below this, fees can exceed the commission, so online buying isn't offered. */
export const MIN_ONLINE_PRICE_PAISE = 500_00;

export function commissionRateBps(override: number | null | undefined): number {
  if (override !== null && override !== undefined) return override;
  const fromEnv = Number(process.env.COMMISSION_RATE_BPS);
  return Number.isInteger(fromEnv) && fromEnv >= 0 && fromEnv <= 5000 ? fromEnv : DEFAULT_COMMISSION_BPS;
}

export function computeOrderAmounts(input: {
  pricePaise: number;
  shippingPaise: number;
  isSiteArtist: boolean;
  commissionBps: number;
  /** True only in razorpay mode for an artist with a linked account. */
  canTransferToArtist: boolean;
}): OrderAmounts {
  const { pricePaise, shippingPaise } = input;
  const total = pricePaise + shippingPaise;

  if (input.isSiteArtist) {
    return {
      kind: "full",
      pricePaise,
      shippingPaise,
      commissionBps: 0,
      commissionPaise: 0,
      amountPaise: total,
      artistSharePaise: total,
      balanceToArtistPaise: 0,
      transferToArtist: false,
    };
  }

  // Half-up rounding to the paisa; the artist's share is the exact remainder, so totals always add up.
  const commissionPaise = Math.round((pricePaise * input.commissionBps) / 10_000);
  const artistSharePaise = total - commissionPaise;

  if (input.canTransferToArtist) {
    return {
      kind: "full",
      pricePaise,
      shippingPaise,
      commissionBps: input.commissionBps,
      commissionPaise,
      amountPaise: total,
      artistSharePaise,
      balanceToArtistPaise: 0,
      transferToArtist: true,
    };
  }

  return {
    kind: "deposit",
    pricePaise,
    shippingPaise,
    commissionBps: input.commissionBps,
    commissionPaise,
    amountPaise: commissionPaise,
    artistSharePaise,
    balanceToArtistPaise: artistSharePaise,
    transferToArtist: false,
  };
}
