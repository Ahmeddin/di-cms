import { z } from "zod";

export const repaymentSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  method: z.enum(["CASH", "MIXED"]), 
  note: z.string().max(255).optional().nullable(),
});

export type RepaymentFormValues = z.infer<typeof repaymentSchema>;
