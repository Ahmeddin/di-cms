import { z } from "zod";
import { RoleName } from "@/generated/prisma/enums";

export const userUpsertSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8).optional().or(z.literal("")),
  // Role is optional for Super Admins; they have global access
  role: z.nativeEnum(RoleName).optional(),
  shopIds: z.array(z.string()).optional(),
  isActive: z.boolean(),
});

export type UserUpsertInput = z.infer<typeof userUpsertSchema>;

export const resetPasswordSchema = z.object({
  userId: z.string().cuid(),
  password: z.string().min(8),
});

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
