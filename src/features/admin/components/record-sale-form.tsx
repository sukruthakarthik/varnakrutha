"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { recordSale } from "@/features/orders/actions";

export interface SellableArtwork {
  id: string;
  title: string;
  artistName: string;
  price: number | null;
}

/** Admin only: records a sale made outside online checkout, so the painting is marked sold and commission tracked. */
export function RecordSaleForm({ artworks }: { artworks: SellableArtwork[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [artworkId, setArtworkId] = useState("");
  const [price, setPrice] = useState("");

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const value = (key: string) => String(data.get(key) ?? "");
    startTransition(async () => {
      const res = await recordSale({
        artworkId,
        buyerName: value("buyerName"),
        buyerEmail: value("buyerEmail"),
        buyerPhone: value("buyerPhone"),
        salePrice: Number(price),
        paymentReference: value("paymentReference"),
        note: value("note"),
      });
      if (!res.ok) {
        const next: Record<string, string> = {};
        for (const [field, messages] of Object.entries(res.fieldErrors ?? {})) if (messages?.[0]) next[field] = messages[0];
        setErrors(next);
        toast.error(res.error);
        return;
      }
      setErrors({});
      form.reset();
      setArtworkId("");
      setPrice("");
      toast.success(`Sale recorded as ${res.data.reference}; painting marked as sold`);
      router.refresh();
    });
  }

  const err = (name: string) => (errors[name] ? <p className="text-xs text-destructive">{errors[name]}</p> : null);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Record a sale</CardTitle>
        <CardDescription>
          For sales arranged outside online checkout: UPI or bank transfer by message, or cash at an exhibition. The
          painting is marked sold and any commission is recorded.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="sale-artwork">Painting</Label>
            <NativeSelect
              id="sale-artwork"
              value={artworkId}
              onChange={(e) => {
                setArtworkId(e.target.value);
                const chosen = artworks.find((a) => a.id === e.target.value);
                if (chosen?.price) setPrice(String(chosen.price));
              }}
              required
            >
              <option value="">Choose a painting…</option>
              {artworks.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.title} · {a.artistName}
                </option>
              ))}
            </NativeSelect>
            {err("artworkId")}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sale-price">Sale price (INR)</Label>
            <Input id="sale-price" type="number" min={1} step="any" value={price} onChange={(e) => setPrice(e.target.value)} required />
            {err("salePrice")}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sale-ref">Payment reference</Label>
            <Input id="sale-ref" name="paymentReference" placeholder="UPI transaction ID, bank ref or “cash”" required />
            {err("paymentReference")}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sale-buyer">Buyer name</Label>
            <Input id="sale-buyer" name="buyerName" required />
            {err("buyerName")}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sale-email">Buyer email (optional)</Label>
            <Input id="sale-email" name="buyerEmail" type="email" />
            {err("buyerEmail")}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sale-phone">Buyer phone (optional)</Label>
            <Input id="sale-phone" name="buyerPhone" type="tel" />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="sale-note">Note (optional)</Label>
            <Textarea id="sale-note" name="note" rows={2} />
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={pending}>
              <Plus aria-hidden /> Record sale
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
