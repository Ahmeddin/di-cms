"use server";

import { prisma } from "@/lib/prisma";
import { requireRole, requireBranchAccess, requireNotGlobalWrite } from "@/lib/rbac";
import { revalidatePath } from "next/cache";
import { getShopScope } from "@/lib/session";
import { convertFromBase, convertToBase } from "@/lib/currency";

export async function getCreditSummary() {
  const session = await requireRole(["SUPER_ADMIN", "CASHIER"]);
  await requireBranchAccess(session);

  try {
    const { whereShop } = getShopScope(session);

    const accounts = await prisma.creditAccount.findMany({
      where: whereShop,
      include: { 
        customer: { 
          select: { 
            id: true, 
            fullName: true, 
            phone: true, 
            creditLimit: true 
          } 
        },
        shop: { select: { name: true } },
      },
      orderBy: { outstandingBalance: "desc" },
    });

    const org = await prisma.organization.findUnique({
      where: { id: session.user.organizationId! },
      select: { currency: true },
    });
    const displayCurrency = org?.currency || "USD";

    const serializedAccounts = accounts.map((acc) => ({
      ...acc,
      outstandingBalance: convertFromBase(acc.outstandingBalance.toString(), displayCurrency),
      customer: {
        ...acc.customer,
        creditLimit: acc.customer.creditLimit ? convertFromBase(acc.customer.creditLimit.toString(), displayCurrency) : null,
      },
    }));

    const totalOutstanding = serializedAccounts.reduce((sum, acc) => sum + acc.outstandingBalance, 0);

    return {
      success: true,
      data: {
        accounts: serializedAccounts,
        totalOutstanding,
      },
    };
  } catch (error) {
    console.error("Failed to fetch credit summary:", error);
    return { success: false, error: "Failed to fetch credit summary" };
  }
}

export async function recordRepayment(formData: FormData) {
  const session = await requireRole(["SUPER_ADMIN", "CASHIER"]);
  await requireBranchAccess(session);
  await requireNotGlobalWrite(session);

  const customerId = formData.get("customerId") as string;
  const amount = Number(formData.get("amount"));
  const method = formData.get("method") as any;
  const note = formData.get("note") as string;

  if (!customerId || isNaN(amount) || amount <= 0) {
    return { success: false, error: "Invalid repayment data" };
  }

  try {
    const org = await prisma.organization.findUnique({
      where: { id: session.user.organizationId! },
      select: { currency: true },
    });
    const displayCurrency = org?.currency || "USD";
    const baseAmount = convertToBase(amount, displayCurrency);

    await prisma.$transaction(async (tx) => {
      // 1. Record repayment
      await tx.repayment.create({
        data: {
          shopId: session.user.activeShopId!,
          customerId,
          receivedById: session.user.id,
          amount: baseAmount,
          method,
          note,
        },
      });

      // 2. Update credit account balance
      await tx.creditAccount.update({
        where: { customerId },
        data: {
          outstandingBalance: { decrement: baseAmount },
        },
      });

      // 3. Log the action
      await tx.auditLog.create({
        data: {
          shopId: session.user.activeShopId!,
          userId: session.user.id,
          action: "RECORD_REPAYMENT",
          entityType: "REPAYMENT",
          metadata: { customerId, amount: baseAmount, method },
        },
      });
    });

    revalidatePath("/credit");
    return { success: true };
  } catch (error) {
    console.error("Failed to record repayment:", error);
    return { success: false, error: "Failed to record repayment" };
  }
}
