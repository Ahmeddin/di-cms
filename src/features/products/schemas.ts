import { z } from "zod";

export const categorySchema = z.object({
  name: z.string().trim().min(2).max(64),
});

export const productUpsertSchema = z.object({
  id: z.string().cuid().optional(),
  name: z.string().trim().min(2).max(120),
  sku: z.string().trim().min(2).max(64),
  barcode: z.string().trim().min(2).max(64).optional().or(z.literal("")),
  categoryId: z.string().cuid().optional().or(z.literal("")),
  costPrice: z.coerce.number().nonnegative(),
  sellingPrice: z.coerce.number().nonnegative(),
  stockQty: z.coerce.number().int().nonnegative().optional(),
  reorderLevel: z.coerce.number().int().nonnegative(),
  isActive: z.coerce.boolean().default(true),
});

export type ProductUpsertInput = z.infer<typeof productUpsertSchema>;

