"use server";

import { prisma } from "@/lib/prisma";
import { requireRole, requireBranchAccess } from "@/lib/rbac";
import { getShopScope } from "@/lib/session";
import { convertFromBase } from "@/lib/currency";

export async function getReportsData() {
  try {
    const session = await requireRole(["SUPER_ADMIN", "INVENTORY"]);
    await requireBranchAccess(session);

    const { whereShop } = getShopScope(session);
    const isInventory = session.user.activeRole === "INVENTORY" && session.user.globalRole !== "SUPER_ADMIN";

    // Parallel Execution of Aggregated Data (Conditional on role to prevent DB leakage)
    const [
      inventoryValuation,
      totalSalesStats,
      topDebtorsRaw
    ] = await Promise.all([
      // 1. Inventory Valuation (Summing cost and selling prices)
      prisma.product.findMany({
        where: { ...whereShop, isActive: true, stockQty: { gt: 0 } },
        select: { costPrice: true, sellingPrice: true, stockQty: true }
      }),
      // 2. Financial Summary (Skipped for Inventory role)
      isInventory 
        ? Promise.resolve({ _sum: { total: null, amountPaid: null, creditIssued: null } })
        : prisma.sale.aggregate({
            where: { ...whereShop, status: "COMPLETED" },
            _sum: { total: true, amountPaid: true, creditIssued: true }
          }),
      // 3. Top Debtors (Skipped for Inventory role)
      isInventory
        ? Promise.resolve([])
        : prisma.customer.findMany({
            where: { 
              ...whereShop, 
              isActive: true, 
              creditAccount: { outstandingBalance: { gt: 0 } } 
            },
            select: {
              id: true,
              fullName: true,
              creditLimit: true,
              creditAccount: { select: { outstandingBalance: true } }
            },
            orderBy: { creditAccount: { outstandingBalance: "desc" } },
            take: 10
          })
    ]);

    // Calculate valuation efficiently from minimal data
    const valuation = inventoryValuation.reduce((acc, p) => {
      const qty = p.stockQty;
      acc.totalCost += Number(p.costPrice) * qty;
      acc.totalRetail += Number(p.sellingPrice) * qty;
      return acc;
    }, { totalCost: 0, totalRetail: 0 });

    const org = await prisma.organization.findUnique({
      where: { id: session.user.organizationId! },
      select: { currency: true },
    });
    const displayCurrency = org?.currency || "USD";

    const topDebtors = isInventory ? [] : (topDebtorsRaw as any[]).map(c => {
      const balance = convertFromBase(Number(c.creditAccount?.outstandingBalance || 0), displayCurrency);
      const limit = c.creditLimit ? convertFromBase(c.creditLimit.toString(), displayCurrency) : 0;
      return {
        id: c.id,
        name: c.fullName,
        balance,
        limit,
        utilization: limit > 0 ? (balance / limit) * 100 : 0
      };
    });

    const costValue = convertFromBase(valuation.totalCost, displayCurrency);
    const retailValue = convertFromBase(valuation.totalRetail, displayCurrency);

    return {
      success: true,
      data: {
        inventory: {
          costValue,
          retailValue,
          potentialProfit: Number((retailValue - costValue).toFixed(2))
        },
        debt: {
          totalOutstanding: isInventory ? 0 : convertFromBase(Number(totalSalesStats._sum.creditIssued || 0), displayCurrency),
          topDebtors
        },
        sales: {
          totalRevenue: isInventory ? 0 : convertFromBase(Number(totalSalesStats._sum.total || 0), displayCurrency),
          totalCollected: isInventory ? 0 : convertFromBase(Number(totalSalesStats._sum.amountPaid || 0), displayCurrency)
        }
      }
    };
  } catch (error) {
    return { success: false, error: "Failed to load report data." };
  }
}
