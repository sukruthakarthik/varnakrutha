import type { Metadata } from "next";
import Link from "next/link";
import { SectionHeading } from "@/components/common/section-heading";
import { defaultOpenGraph, siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms of Sale, Shipping & Refunds",
  description: `How buying, reserving, shipping, cancellations and refunds work on ${siteConfig.name}.`,
  alternates: { canonical: "/terms" },
  openGraph: { ...defaultOpenGraph, url: "/terms", title: `Terms of Sale | ${siteConfig.name}` },
};

const LAST_UPDATED = "29 October 2026";

// Keep in step with the code: hold times in lib/payments/config.ts, the deposit model in lib/payments/amounts.ts.
export default function TermsPage() {
  const contact = siteConfig.contactEmail ? (
    <a href={`mailto:${siteConfig.contactEmail}`} className="text-primary underline-offset-4 hover:underline">
      {siteConfig.contactEmail}
    </a>
  ) : (
    <Link href="/contact" className="text-primary underline-offset-4 hover:underline">
      the contact page
    </Link>
  );

  return (
    <div className="container-page max-w-3xl space-y-10 py-16 md:py-20">
      <SectionHeading as="h1" eyebrow="Buying art" title="Terms of Sale, Shipping & Refunds" description={`Last updated ${LAST_UPDATED}`} />

      <div className="space-y-8 leading-relaxed text-foreground/85 [&_h2]:mb-3 [&_h2]:font-serif [&_h2]:text-2xl [&_h2]:text-foreground [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5">
        <section>
          <h2>Who you buy from</h2>
          <p>
            {siteConfig.name} is an online gallery. Paintings by the site&apos;s own artist are sold by {siteConfig.name}.
            Paintings by featured artists are sold by the artist, with {siteConfig.name} introducing you and handling the
            reservation. Every work is an original unless the listing says otherwise.
          </p>
        </section>

        <section>
          <h2>Prices and payment</h2>
          <ul>
            <li>Prices are in Indian rupees. The listing shows the price and any shipping fee before you pay.</li>
            <li>
              <strong>Buy now:</strong> you pay the full price plus shipping. The painting is yours once payment is
              confirmed.
            </li>
            <li>
              <strong>Reserve with deposit</strong> (featured artists): you pay a deposit through {siteConfig.name} to
              reserve the painting. We then introduce you to the artist, and you pay them the balance directly before
              they ship.
            </li>
            <li>
              An unpaid order holds the painting for a limited time (30 minutes for online checkout, 48 hours for UPI
              transfers), then releases it.
            </li>
            <li>For UPI transfers, only money received confirms the order; screenshots don&apos;t.</li>
          </ul>
        </section>

        <section>
          <h2>Shipping</h2>
          <ul>
            <li>We deliver within India.</li>
            <li>Paintings are packed with care and usually dispatched within 5 working days of payment (of the balance, for reservations), with tracking.</li>
            <li>Please check the address you enter; re-delivery to a corrected address may cost extra.</li>
          </ul>
        </section>

        <section>
          <h2>Cancellations</h2>
          <ul>
            <li>You can cancel for a full refund until the painting is shipped. Write to {contact} with your order reference.</li>
            <li>
              If the artist can&apos;t complete the sale, or the painting isn&apos;t shipped within 7 working days, you can
              cancel and receive a full refund, including any deposit.
            </li>
            <li>If you change your mind about a reservation after being introduced to the artist, the deposit is not refunded.</li>
          </ul>
        </section>

        <section>
          <h2>Damaged or not as described</h2>
          <p>
            Originals can&apos;t be exchanged, but if your painting arrives damaged or is materially different from its
            listing, tell us within 48 hours of delivery at {contact}, with photos of the painting and the packaging. Once
            it&apos;s returned in the condition received, you&apos;ll get a full refund, or a partial refund if you prefer to
            keep it. For lost parcels, you receive a full refund.
          </p>
        </section>

        <section>
          <h2>Refunds</h2>
          <p>
            Card, UPI and netbanking payments made online are refunded to the same method, usually within 5–7 working
            days. UPI transfers are refunded to the account they came from.
          </p>
        </section>

        <section>
          <h2>Copyright</h2>
          <p>
            Buying a painting gives you the original, not the right to reproduce it. See{" "}
            <Link href="/copyright" className="text-primary underline-offset-4 hover:underline">
              Copyright &amp; Disclaimer
            </Link>
            .
          </p>
        </section>

        <section>
          <h2>Contact</h2>
          <p>
            Questions about an order: {contact}, quoting your order reference (e.g. VK-1001). Your data is handled as
            described in our{" "}
            <Link href="/privacy" className="text-primary underline-offset-4 hover:underline">
              Privacy Policy
            </Link>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
