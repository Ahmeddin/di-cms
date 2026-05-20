import { z } from "zod";

export const customerSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters").max(100),
  phone: z.string().min(5, "Phone number is required").max(20),
  address: z.string().max(255).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
  creditLimit: z.coerce.number().min(0, "Credit limit cannot be negative").default(0),
  isActive: z.boolean().default(true),
});

export type CustomerFormValues = z.infer<typeof customerSchema>;
