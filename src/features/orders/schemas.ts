import { z } from "zod";

export const checkoutSchema = z.object({
  artworkId: z.string().uuid(),
  name: z.string().trim().min(2, "Please enter your name").max(100),
  email: z.string().trim().toLowerCase().email("Please enter a valid email").max(200),
  phone: z
    .string()
    .trim()
    .min(8, "Please enter a phone number")
    .max(30)
    .regex(/^[+()\-\s\d]+$/, "Please enter a valid phone number"),
  address: z.string().trim().min(10, "Please enter the full delivery address").max(500),
  pincode: z.string().trim().regex(/^\d{6}$/, "Enter a 6-digit PIN code"),
  // Honeypot field: must stay empty.
  company: z.string().max(0).optional(),
});

export type CheckoutFormValues = z.input<typeof checkoutSchema>;

export const recordSaleSchema = z.object({
  artworkId: z.string().uuid("Choose a painting"),
  buyerName: z.string().trim().min(2, "Enter the buyer's name").max(100),
  buyerEmail: z
    .string()
    .trim()
    .toLowerCase()
    .max(200)
    .refine((v) => v === "" || z.string().email().safeParse(v).success, "Enter a valid email or leave it blank"),
  buyerPhone: z.string().trim().max(30),
  salePrice: z.number({ invalid_type_error: "Enter the sale price" }).positive("Enter the sale price").max(100_000_000),
  paymentReference: z.string().trim().min(2, "Enter the UPI transaction ID, bank reference or 'cash'").max(120),
  note: z
    .string()
    .trim()
    .max(1000)
    .transform((v) => (v === "" ? null : v)),
});

export type RecordSaleFormValues = z.input<typeof recordSaleSchema>;
