"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole, requireBranchAccess, requireNotGlobalWrite } from "@/lib/rbac";
import { writeAuditLog } from "@/lib/audit";
import { repaymentSchema } from "./schemas";
import { convertToBase, convertFromBase } from "@/lib/currency";

type ActionResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

export async function createRepayment(input: unknown): Promise<ActionResponse<any>> {
  try {
    const session = await requireRole(["SUPER_ADMIN", "CASHIER"]);
    await requireBranchAccess(session);
    await requireNotGlobalWrite(session);
    const parsed = repaymentSchema.parse(input);

    const customer = await prisma.customer.findFirst({
      where: { id: parsed.customerId, shopId: session.user.activeShopId! },
      include: { creditAccount: true },
    });

    if (!customer || !customer.creditAccount) {
      return { success: false, error: "Customer or credit account not found." };
    }

    const currentBalance = Number(customer.creditAccount.outstandingBalance);

    const org = await prisma.organization.findUnique({
      where: { id: session.user.organizationId! },
      select: { currency: true },
    });
    const displayCurrency = org?.currency || "USD";
    const baseAmount = convertToBase(parsed.amount, displayCurrency);
    
    // Check if repayment amount is valid
    if (baseAmount <= 0) {
      return { success: false, error: "Payment amount must be greater than 0." };
    }

    // Optional: allow overpayment? Usually not in small business credit tracking.
    if (baseAmount > currentBalance + 0.01) { // 0.01 to handle potential float issues
      const displayAmount = convertFromBase(baseAmount, displayCurrency);
      const displayCurrentBalance = convertFromBase(currentBalance, displayCurrency);
      return { 
        success: false, 
        error: `Payment amount (${displayAmount.toFixed(2)}) exceeds outstanding balance (${displayCurrentBalance.toFixed(2)}).` 
      };
    }

    const repayment = await prisma.$transaction(async (tx) => {
      // 1. Record the Repayment
      const newRepayment = await tx.repayment.create({
        data: {
          shopId: session.user.activeShopId!,
          customerId: parsed.customerId,
          receivedById: session.user.id,
          amount: baseAmount,
          method: parsed.method,
          note: parsed.note,
        },
      });

      // 2. Decrement the outstanding balance
      await tx.creditAccount.update({
        where: { customerId: parsed.customerId },
        data: { outstandingBalance: { decrement: baseAmount } },
      });

      return newRepayment;
    });

    await writeAuditLog({
      shopId: session.user.activeShopId!,
      userId: session.user.id,
      action: "REPAYMENT_CREATE",
      entityType: "Repayment",
      entityId: repayment.id,
      metadata: { 
        amount: Number(repayment.amount), 
        customerName: customer.fullName 
      },
    });

    revalidatePath("/customers");
    revalidatePath(`/customers/${parsed.customerId}`);
    
    return { success: true, data: repayment };
  } catch (error) {
    if (error instanceof Error) return { success: false, error: error.message };
    return { success: false, error: "An unexpected error occurred while recording payment." };
  }
}
