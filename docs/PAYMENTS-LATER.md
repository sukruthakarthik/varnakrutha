# Turning on payments later — checklist

Online buying is **built but switched off** (`NEXT_PUBLIC_PAYMENTS_MODE=off`). This page is everything you need to switch it on in a few months, without re-reading the whole plan. Background and reasoning: [PAYMENTS.md](PAYMENTS.md).

*Written 30 October 2026.*

---

## Where things stand

| Item | Status |
|---|---|
| Code for Buy now / Reserve, orders, Admin → Orders, Record a sale, CSV export, Terms of Sale page | ✅ Built, off |
| Database script `supabase/migrations/20261016000000_spam_and_blocklist.sql` | ✅ Run on 30 Oct 2026 |
| Database script `supabase/migrations/20261029000000_orders_and_payments.sql` | ✅ Run on 30 Oct 2026 |
| Payment settings in `.env.local` | ✅ Added, mode `off` |
| Payment settings in Vercel | ☐ Add when switching on |
| Merchant UPI ID (for manual mode) | ☐ |
| Razorpay account and KYC (for Razorpay mode) | ☐ |
| Commission rate decided | ☐ Default is 15% |
| CA advice on GST / TDS | ☐ |

### Database scripts (done 30 Oct 2026)
*Kept for reference, e.g. when setting up a new Supabase project.*
They only add new tables and columns, and change nothing visible while payments are off. **They're also required before deploying the current code:** saving an artwork now writes the new `shipping_fee` column, and without the script, saving fails.

1. Supabase → **SQL Editor → New query**.
2. Paste the whole of `20261016000000_spam_and_blocklist.sql` → **Run** → "Success".
3. Same for `20261029000000_orders_and_payments.sql`.
4. Tick them off in the table above.

---

## Before switching on

1. **Decide the commission rate** (10–25%). Set `COMMISSION_RATE_BPS` (1500 = 15%). For a different rate for one artist, set `commission_rate_bps` on their row: Supabase → Table Editor → `artists`.
2. **Price your paintings.** Each artwork needs a price of **₹500 or more** to show a Buy/Reserve button, plus a shipping fee if you charge one (artwork edit form). Paintings without a price stay enquiry-only.
3. **Read the Terms of Sale** at `/terms` and adjust it if your shipping or refund rules differ. The code's hold times (30 minutes / 48 hours) are written there too.
4. **Ask a CA** about GST registration, GST on commission, and TDS (s.194-O). The app records the amounts but doesn't calculate taxes.
5. **Re-check rates and rules.** Razorpay fees, GST on paintings (5% as of Oct 2026) and Razorpay Route eligibility may have changed.

---

## Option A: manual UPI (simplest; no gateway)

**You need:** a merchant UPI ID from PhonePe Business or Google Pay for Business, not your personal UPI.

1. Optional: save your UPI QR image as `public/payments/upi-qr.png`.
2. In **`.env.local`** (to test locally) and in **Vercel → Settings → Environment Variables** (for the live site), set:
   ```
   NEXT_PUBLIC_PAYMENTS_MODE=manual
   NEXT_PUBLIC_UPI_ID=yourname@bank
   NEXT_PUBLIC_UPI_PAYEE_NAME=Varnakrutha
   NEXT_PUBLIC_UPI_QR_IMAGE=/payments/upi-qr.png   # only if you added the image
   COMMISSION_RATE_BPS=1500
   ```
3. Redeploy: `npx vercel --prod`. Settings starting with `NEXT_PUBLIC_` only take effect after a redeploy.
4. Test it ([Test before announcing](#test-before-announcing)).

**Your routine (check Admin → Orders every working day):**

| Order shows | Do this |
|---|---|
| **Awaiting payment** | Open your UPI app, find the payment with that reference (VK-…), copy its transaction ID → **Confirm payment received**. Never confirm from a screenshot |
| **Paid**, your painting | Pack, ship, enter courier + tracking → **Mark shipped**. Email the buyer the tracking |
| **Paid**, deposit (featured artist) | Email the buyer and the artist to introduce them (their details are on the order). The artist collects the balance and ships |
| **Shipped** | When the buyer has it (for deposits: when the artist confirms the balance arrived) → **Complete** |
| Buyer wants to cancel | Refund in your UPI app first, then **Cancel** and enter the refund's transaction ID |

Unpaid orders release the painting automatically after 48 hours.

---

## Option B: Razorpay (cards, UPI, netbanking; automatic)

**You need:** an activated Razorpay account (business KYC, current account, and the Terms of Sale, Privacy and Contact pages, which already exist).

1. Razorpay Dashboard → **API Keys**: generate **test** keys first.
2. Razorpay Dashboard → **Webhooks → Add**: URL `https://varnakrutha.in/api/razorpay/webhook`, events **order.paid** and **payment.captured**, and a secret you make up.
3. Razorpay Dashboard → payment capture settings: **automatic capture on**.
4. Set in `.env.local` and Vercel:
   ```
   NEXT_PUBLIC_PAYMENTS_MODE=razorpay
   RAZORPAY_KEY_ID=rzp_test_...
   RAZORPAY_KEY_SECRET=...
   RAZORPAY_WEBHOOK_SECRET=...   # the secret from step 2
   COMMISSION_RATE_BPS=1500
   ```
5. Redeploy, test with Razorpay's test cards and test UPI IDs, then swap in **live** keys (and a live-mode webhook) and redeploy.
6. **Optional, per featured artist:** create their **linked account** in Razorpay → Route, then paste its `acc_…` id into Supabase → Table Editor → `artists` → `razorpay_account_id`. Their buyers then pay the full price, and the artist's share is held until you press **Complete**. Without it, featured artists' works use the deposit flow. Ask Razorpay what they need for Route first; access has been compliance-gated since September 2025.

---

## Test before announcing
- [ ] A priced painting of yours shows **Buy now · ₹…**; a featured artist's shows **Reserve with ₹… deposit**.
- [ ] Checkout → order page shows the right amount and reference (manual) / Razorpay opens (Razorpay).
- [ ] Manual: **Confirm payment received** → the painting shows as Sold (yours) or Reserved (deposit) on the site.
- [ ] Razorpay (test mode): pay → the order turns **Paid** by itself, even if you close the tab straight after paying.
- [ ] A second Buy now on the same painting is blocked while the first order is open.
- [ ] Cancel and Complete work; **Export CSV** downloads.
- [ ] Clean up test orders: cancel them, and set the paintings back to Available if needed.

## Switching off again
1. Finish or cancel open orders first (Admin → Orders → Needs action).
2. Set `NEXT_PUBLIC_PAYMENTS_MODE=off` and redeploy. Buy buttons and the Orders menu disappear, and nothing is deleted.

## If something goes wrong
| Symptom | Likely cause |
|---|---|
| No Buy/Reserve buttons | Mode is `off`; manual mode without `NEXT_PUBLIC_UPI_ID`; no redeploy after changing settings; artwork has no price, is under ₹500 or isn't Available; artist not approved |
| "Someone is buying this painting right now" | Another open order holds it; it frees itself after 30 min / 48 h, or cancel it in Admin → Orders |
| Saving an artwork fails | The orders database script wasn't run |
| Razorpay payment taken but order still "Awaiting payment" | Webhook URL or secret wrong (Razorpay Dashboard → Webhooks shows failed deliveries); fix it, and Razorpay retries |
| "Razorpay isn't configured" | `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` missing in Vercel |
| Orders page missing from the admin menu | Mode is `off` |

## For a developer picking this up
- Money rules: `src/lib/payments/amounts.ts`. Settings: `src/lib/payments/config.ts`. Razorpay API: `src/lib/payments/razorpay.ts` (direct REST, no SDK).
- Orders logic (Supabase and mock): `src/services/orders.ts`. Actions: `src/features/orders/actions.ts`. Webhook: `src/app/api/razorpay/webhook/route.ts`.
- UI: `src/features/orders/components/buy-button.tsx`, `src/app/(public)/orders/[id]/page.tsx`, `src/app/admin/(dashboard)/orders/`.
- Not built yet: emails, auto-completing orders after delivery, partial refunds, GST/TDS calculation, artist payout onboarding, international shipping. See [PAYMENTS.md](PAYMENTS.md) section 0.
- After months away, run `npm install`, `npm run typecheck` and `npm run build` first. Dependencies may have moved on.
