"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole, requireBranchAccess, requireNotGlobalWrite } from "@/lib/rbac";
import { writeAuditLog } from "@/lib/audit";
import { customerSchema } from "./schemas";
import { Prisma } from "@prisma/client";
import { convertToBase } from "@/lib/currency";

type ActionResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

export async function createCustomer(input: unknown): Promise<ActionResponse<any>> {
  try {
    const session = await requireRole(["SUPER_ADMIN", "CASHIER"]);
    await requireBranchAccess(session);
    await requireNotGlobalWrite(session);
    const parsed = customerSchema.parse(input);

    // Check phone uniqueness if provided
    if (parsed.phone) {
      const existing = await prisma.customer.findFirst({
        where: { shopId: session.user.activeShopId!, phone: parsed.phone },
      });
      if (existing) {
        return { success: false, error: "A customer with this phone number already exists." };
      }
    }

    const org = await prisma.organization.findUnique({
      where: { id: session.user.organizationId! },
      select: { currency: true },
    });
    const displayCurrency = org?.currency || "USD";
    const isCashier = session.user.activeRole === "CASHIER" && session.user.globalRole !== "SUPER_ADMIN";
    const baseCreditLimit = isCashier ? null : (parsed.creditLimit ? convertToBase(parsed.creditLimit, displayCurrency) : null);

    const customer = await prisma.$transaction(async (tx) => {
      const newCustomer = await tx.customer.create({
        data: {
          shopId: session.user.activeShopId!,
          fullName: parsed.fullName,
          phone: parsed.phone || null,
          address: parsed.address || null,
          notes: parsed.notes || null,
          creditLimit: baseCreditLimit,
          isActive: parsed.isActive,
        },
      });

      // Always create a credit account for the customer
      await tx.creditAccount.create({
        data: {
          shopId: session.user.activeShopId!,
          customerId: newCustomer.id,
          outstandingBalance: 0,
        },
      });

      return newCustomer;
    });

    await writeAuditLog({
      shopId: session.user.activeShopId!,
      userId: session.user.id,
      action: "CUSTOMER_CREATE",
      entityType: "Customer",
      entityId: customer.id,
      metadata: { fullName: customer.fullName, phone: customer.phone },
    });

    revalidatePath("/customers");
    return { success: true, data: customer };
  } catch (error) {
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "An unexpected error occurred while creating the customer." };
  }
}

export async function updateCustomer(id: string, input: unknown): Promise<ActionResponse<any>> {
  try {
    const session = await requireRole(["SUPER_ADMIN", "CASHIER"]);
    await requireBranchAccess(session);
    await requireNotGlobalWrite(session);
    const parsed = customerSchema.parse(input);

    const existingCustomer = await prisma.customer.findFirst({
      where: { id, shopId: session.user.activeShopId! },
    });

    if (!existingCustomer) {
      return { success: false, error: "Customer not found." };
    }

    if (parsed.phone && parsed.phone !== existingCustomer.phone) {
      const phoneExists = await prisma.customer.findFirst({
        where: { shopId: session.user.activeShopId!, phone: parsed.phone },
      });
      if (phoneExists) {
        return { success: false, error: "A customer with this phone number already exists." };
      }
    }

    const org = await prisma.organization.findUnique({
      where: { id: session.user.organizationId! },
      select: { currency: true },
    });
    const displayCurrency = org?.currency || "USD";
    const isCashier = session.user.activeRole === "CASHIER" && session.user.globalRole !== "SUPER_ADMIN";
    const baseCreditLimit = isCashier ? existingCustomer.creditLimit : (parsed.creditLimit ? convertToBase(parsed.creditLimit, displayCurrency) : null);

    const customer = await prisma.customer.update({
      where: { id },
      data: {
        fullName: parsed.fullName,
        phone: parsed.phone || null,
        address: parsed.address || null,
        notes: parsed.notes || null,
        creditLimit: baseCreditLimit,
        isActive: parsed.isActive,
      },
    });

    await writeAuditLog({
      shopId: session.user.activeShopId!,
      userId: session.user.id,
      action: "CUSTOMER_UPDATE",
      entityType: "Customer",
      entityId: customer.id,
      metadata: { fullName: customer.fullName, phone: customer.phone },
    });

    revalidatePath("/customers");
    revalidatePath(`/customers/${id}`);
    return { success: true, data: customer };
  } catch (error) {
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "An unexpected error occurred while updating the customer." };
  }
}

export async function deleteCustomer(id: string): Promise<ActionResponse<boolean>> {
  try {
    const session = await requireRole(["SUPER_ADMIN"]); // Only Super Admin can delete customers
    await requireBranchAccess(session);
    await requireNotGlobalWrite(session);

    const customer = await prisma.customer.findFirst({
      where: { id, shopId: session.user.activeShopId! },
      include: {
        creditAccount: true,
        sales: { take: 1 },
      },
    });

    if (!customer) {
      return { success: false, error: "Customer not found." };
    }

    if (customer.sales.length > 0) {
      return { success: false, error: "Cannot delete customer with existing sales history. Deactivate them instead." };
    }

    if (customer.creditAccount && customer.creditAccount.outstandingBalance.toNumber() > 0) {
      return { success: false, error: "Cannot delete customer with an outstanding balance." };
    }

    await prisma.customer.delete({
      where: { id },
    });

    await writeAuditLog({
      shopId: session.user.activeShopId!,
      userId: session.user.id,
      action: "CUSTOMER_DELETE",
      entityType: "Customer",
      entityId: id,
      metadata: { fullName: customer.fullName },
    });

    revalidatePath("/customers");
    return { success: true, data: true };
  } catch (error) {
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "An unexpected error occurred while deleting the customer." };
  }
}

export async function getCustomers(): Promise<ActionResponse<any>> {
  try {
    const session = await requireRole(["SUPER_ADMIN", "CASHIER", "INVENTORY"]);
    await requireBranchAccess(session);
    
    const customers = await prisma.customer.findMany({
      where: { shopId: session.user.activeShopId! },
      include: {
        creditAccount: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return { success: true, data: customers };
  } catch (error) {
    return { success: false, error: "Failed to fetch customers." };
  }
}

export async function getCustomerById(id: string): Promise<ActionResponse<any>> {
  try {
    const session = await requireRole(["SUPER_ADMIN", "CASHIER", "INVENTORY"]);
    await requireBranchAccess(session);
    
    const customer = await prisma.customer.findFirst({
      where: { id, shopId: session.user.activeShopId! },
      include: {
        creditAccount: true,
        sales: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
        repayments: {
          orderBy: { createdAt: "desc" },
          take: 10,
        }
      },
    });

    if (!customer) {
      return { success: false, error: "Customer not found." };
    }

    return { success: true, data: customer };
  } catch (error) {
    return { success: false, error: "Failed to fetch customer details." };
  }
}
