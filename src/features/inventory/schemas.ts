import { z } from "zod";

export const stockMovementCreateSchema = z.object({
  productId: z.string().cuid(),
  quantity: z.coerce.number().int().positive(),
  note: z.string().trim().max(250).optional().or(z.literal("")),
});

export type StockMovementCreateInput = z.infer<typeof stockMovementCreateSchema>;

