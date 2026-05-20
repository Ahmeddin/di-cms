"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole, requireBranchAccess, requireNotGlobalWrite } from "@/lib/rbac";
import { writeAuditLog } from "@/lib/audit";
import { createSaleSchema } from "./schemas";
import { Prisma } from "@prisma/client";
import { convertToBase, convertFromBase } from "@/lib/currency";

type ActionResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

export async function createSale(input: unknown): Promise<ActionResponse<any>> {
  try {
    const session = await requireRole(["SUPER_ADMIN", "CASHIER"]);
    await requireBranchAccess(session);
    await requireNotGlobalWrite(session);
    
    const parsed = createSaleSchema.parse(input);

    const org = await prisma.organization.findUnique({
      where: { id: session.user.organizationId! },
      select: { currency: true },
    });
    const displayCurrency = org?.currency || "USD";

    const baseSubtotal = convertToBase(parsed.subtotal, displayCurrency);
    const baseDiscountTotal = convertToBase(parsed.discountTotal, displayCurrency);
    const baseTaxTotal = convertToBase(parsed.taxTotal, displayCurrency);
    const baseTotal = convertToBase(parsed.total, displayCurrency);
    const baseAmountPaid = convertToBase(parsed.amountPaid, displayCurrency);
    const baseCreditIssued = convertToBase(parsed.creditIssued, displayCurrency);

    // Fetch products to check stock and verify prices
    const productIds = parsed.items.map(item => item.productId);
    const products = await prisma.product.findMany({
      where: { 
        id: { in: productIds },
        shopId: session.user.activeShopId!,
        isActive: true,
      }
    });

    if (products.length !== productIds.length) {
      return { success: false, error: "One or more products are invalid, inactive, or belong to another shop." };
    }

    const productMap = new Map(products.map(p => [p.id, p]));

    // Check inventory stock (if not allowing negative stock)
    if (!parsed.allowInsufficientStock) {
      for (const item of parsed.items) {
        const product = productMap.get(item.productId);
        if (!product) continue;
        if (product.stockQty < item.quantity) {
          return { 
            success: false, 
            error: `Insufficient stock for product: ${product.name}. Available: ${product.stockQty}, Requested: ${item.quantity}.` 
          };
        }
      }
    }

    // Verify Customer Credit Limit if issuing credit
    if (baseCreditIssued > 0 && parsed.customerId) {
      const customer = await prisma.customer.findFirst({
        where: { id: parsed.customerId, shopId: session.user.activeShopId! },
        include: { creditAccount: true }
      });

      if (!customer || !customer.isActive) {
        return { success: false, error: "Invalid or inactive customer selected for credit sale." };
      }

      const currentBalance = Number(customer.creditAccount?.outstandingBalance || 0);
      const limit = Number(customer.creditLimit || 0);
      const newBalance = currentBalance + baseCreditIssued;

      if (limit === 0 || newBalance > limit) {
        const displayLimit = convertFromBase(limit, displayCurrency);
        const displayCurrentBalance = convertFromBase(currentBalance, displayCurrency);
        return { 
          success: false, 
          error: `Credit limit exceeded. Customer's limit is ${displayLimit.toFixed(2)}, current balance is ${displayCurrentBalance.toFixed(2)}.` 
        };
      }
    }

    // Start Transaction
    const sale = await prisma.$transaction(async (tx) => {
      // 1. Create Sale and SaleItems
      const newSale = await tx.sale.create({
        data: {
          shopId: session.user.activeShopId!,
          createdById: session.user.id,
          customerId: parsed.customerId || null,
          status: "COMPLETED",
          paymentMethod: parsed.paymentMethod,
          subtotal: baseSubtotal,
          discountTotal: baseDiscountTotal,
          taxTotal: baseTaxTotal,
          total: baseTotal,
          amountPaid: baseAmountPaid,
          creditIssued: baseCreditIssued,
          paymentDueDate: parsed.paymentDueDate || null,
          allowInsufficientStock: parsed.allowInsufficientStock,
          items: {
            create: parsed.items.map(item => {
              const baseUnitPrice = convertToBase(item.unitPrice, displayCurrency);
              return {
                productId: item.productId,
                quantity: item.quantity,
                unitPrice: baseUnitPrice,
                lineTotal: Number((item.quantity * baseUnitPrice).toFixed(2)),
              };
            })
          }
        },
        include: { items: true }
      });

      // 2. Process Inventory Deduction
      for (const item of parsed.items) {
        // Record movement
        await tx.stockMovement.create({
          data: {
            shopId: session.user.activeShopId!,
            productId: item.productId,
            type: "SALE",
            quantityDelta: -Math.abs(item.quantity),
            referenceType: "SALE",
            referenceId: newSale.id,
            note: `Sold on Invoice #${newSale.id.slice(-6).toUpperCase()}`,
            createdById: session.user.id,
          }
        });

        // Decrement actual product stock
        await tx.product.update({
          where: { id: item.productId },
          data: { stockQty: { decrement: item.quantity } }
        });
      }

      // 3. Process Customer Credit
      if (baseCreditIssued > 0 && parsed.customerId) {
        await tx.creditAccount.update({
          where: { customerId: parsed.customerId },
          data: { outstandingBalance: { increment: baseCreditIssued } }
        });
      }

      return newSale;
    });

    // 4. Audit Log
    await writeAuditLog({
      shopId: session.user.activeShopId!,
      userId: session.user.id,
      action: "SALE_CREATE",
      entityType: "Sale",
      entityId: sale.id,
      metadata: { 
        total: sale.total, 
        paymentMethod: sale.paymentMethod,
        itemsCount: sale.items.length 
      },
    });

    // Revalidate relevant paths
    revalidatePath("/sales");
    revalidatePath("/inventory");
    revalidatePath("/products");
    if (parsed.customerId) {
      revalidatePath("/customers");
      revalidatePath(`/customers/${parsed.customerId}`);
    }

    const serializedSale = {
      ...sale,
      subtotal: convertFromBase(sale.subtotal.toString(), displayCurrency),
      discountTotal: convertFromBase(sale.discountTotal.toString(), displayCurrency),
      taxTotal: convertFromBase(sale.taxTotal.toString(), displayCurrency),
      total: convertFromBase(sale.total.toString(), displayCurrency),
      amountPaid: convertFromBase(sale.amountPaid.toString(), displayCurrency),
      creditIssued: convertFromBase(sale.creditIssued.toString(), displayCurrency),
      items: sale.items.map(item => ({
        ...item,
        unitPrice: convertFromBase(item.unitPrice.toString(), displayCurrency),
        lineTotal: convertFromBase(item.lineTotal.toString(), displayCurrency),
      }))
    };

    return { success: true, data: serializedSale };
  } catch (error) {
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "An unexpected error occurred while processing the sale." };
  }
}

export async function getSales(): Promise<ActionResponse<any>> {
  try {
    const session = await requireRole(["SUPER_ADMIN", "CASHIER"]);
    await requireBranchAccess(session);
    
    const sales = await prisma.sale.findMany({
      where: { shopId: session.user.activeShopId! },
      include: {
        customer: { select: { fullName: true, id: true } },
        createdBy: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const serializedSales = sales.map((sale) => ({
      ...sale,
      subtotal: Number(sale.subtotal),
      discountTotal: Number(sale.discountTotal),
      taxTotal: Number(sale.taxTotal),
      total: Number(sale.total),
      amountPaid: Number(sale.amountPaid),
      creditIssued: Number(sale.creditIssued),
    }));

    return { success: true, data: serializedSales };
  } catch (error) {
    return { success: false, error: "Failed to fetch sales." };
  }
}
