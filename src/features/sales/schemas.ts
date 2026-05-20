import { z } from "zod";

export const saleItemSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  quantity: z.number().int().min(1, "Quantity must be at least 1"),
  unitPrice: z.number().min(0, "Unit price cannot be negative"),
});

export const createSaleSchema = z.object({
  customerId: z.string().optional().nullable(),
  paymentMethod: z.enum(["CASH", "CREDIT", "MIXED"]),
  subtotal: z.number().min(0),
  discountTotal: z.number().min(0).default(0),
  taxTotal: z.number().min(0).default(0),
  total: z.number().min(0),
  amountPaid: z.number().min(0),
  creditIssued: z.number().min(0),
  paymentDueDate: z.date().optional().nullable(),
  allowInsufficientStock: z.boolean().default(false),
  items: z.array(saleItemSchema).min(1, "At least one item is required"),
}).refine(data => {
  // If credit is issued, customerId MUST be present
  if (data.creditIssued > 0 && !data.customerId) {
    return false;
  }
  return true;
}, {
  message: "Customer is required when issuing credit.",
  path: ["customerId"],
}).refine(data => {
  // Total must match amountPaid + creditIssued
  const sum = Number((data.amountPaid + data.creditIssued).toFixed(2));
  const total = Number(data.total.toFixed(2));
  return Math.abs(sum - total) < 0.01; // Allow small floating point differences
}, {
  message: "Amount paid plus credit issued must equal the total amount.",
  path: ["amountPaid"],
});

export type CreateSaleInput = z.infer<typeof createSaleSchema>;
export type SaleItemInput = z.infer<typeof saleItemSchema>;
