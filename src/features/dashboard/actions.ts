"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { startOfDay, subDays, format } from "date-fns";
import { getShopScope } from "@/lib/session";
import { convertFromBase } from "@/lib/currency";

export async function getDashboardStats() {
  try {
    const session = await requireRole(["SUPER_ADMIN", "CASHIER", "INVENTORY"]);
    const shopId = session.user.activeShopId;

    if (!shopId) throw new Error("No active shop selected. Please select a branch.");

    const { whereShop } = getShopScope(session);
    const orgId = session.user.organizationId as string;

    const whereCredit = whereShop;
    const whereProduct = { ...whereShop, isActive: true };

    const today = startOfDay(new Date());
    const thirtyDaysAgo = startOfDay(subDays(new Date(), 30));

    const isInventory = session.user.activeRole === "INVENTORY" && session.user.globalRole !== "SUPER_ADMIN";
    const isCashier = session.user.activeRole === "CASHIER" && session.user.globalRole !== "SUPER_ADMIN";

    // ─── DYNAMIC LOW STOCK THRESHOLD ─────────────────────────────────────────
    const isGlobal = shopId === "ALL";
    const availableShops = session.user.availableShops || [];
    const targetShopIds = isGlobal ? availableShops.map((s: any) => s.shopId) : [shopId];

    const thresholdSettings = await prisma.setting.findMany({
      where: { shopId: { in: targetShopIds }, key: "low_stock_threshold" }
    });

    const thresholdMap = new Map<string, number>();
    targetShopIds.forEach((sid: string) => thresholdMap.set(sid, 10));
    thresholdSettings.forEach((set) => {
      if (set.value !== null && typeof set.value === "object" && "threshold" in set.value) {
        thresholdMap.set(set.shopId, Number((set.value as any).threshold) || 10);
      } else if (typeof set.value === "number") {
        thresholdMap.set(set.shopId, set.value);
      }
    });

    const lowStockFilter = isGlobal
      ? {
          OR: targetShopIds.map((sid: string) => ({
            shopId: sid,
            stockQty: { lte: thresholdMap.get(sid) || 10 },
          })),
        }
      : {
          stockQty: { lte: thresholdMap.get(shopId) || 10 },
        };

    // DB optimization: conditionally build promises so unauthorized data is never queried
    const queryRevenueToday = isInventory
      ? Promise.resolve({ _sum: { total: null } })
      : prisma.sale.aggregate({
          where: { ...whereShop, createdAt: { gte: today } },
          _sum: { total: true },
        });

    const queryTotalDebt = (isInventory || isCashier)
      ? Promise.resolve({ _sum: { outstandingBalance: null } })
      : prisma.creditAccount.aggregate({
          where: whereCredit,
          _sum: { outstandingBalance: true },
        });

    const querySalesTrend = isInventory
      ? Promise.resolve([])
      : prisma.sale.findMany({
          where: { ...whereShop, createdAt: { gte: thirtyDaysAgo } },
          select: { total: true, createdAt: true },
        });

    const queryRecentSales = isInventory
      ? Promise.resolve([])
      : prisma.sale.findMany({
          where: whereShop,
          take: 5,
          orderBy: { createdAt: "desc" },
          include: { customer: { select: { fullName: true } } },
        });

    // Execute only necessary queries in parallel
    const [
      revenueToday,
      totalDebt,
      activeProductCount,
      lowStockCount,
      outOfStockCount,
      lowStockAlerts,
      outOfStockAlerts,
      salesTrendRaw,
      recentSales,
      organization,
    ] = await Promise.all([
      queryRevenueToday,
      queryTotalDebt,
      prisma.product.count({
        where: whereProduct,
      }),
      prisma.product.count({
        where: {
          ...whereProduct,
          stockQty: { gt: 0 },
          ...lowStockFilter,
        },
      }),
      prisma.product.count({
        where: { ...whereProduct, stockQty: { lte: 0 } },
      }),
      prisma.product.findMany({
        where: {
          ...whereProduct,
          stockQty: { gt: 0 },
          ...lowStockFilter,
        },
        select: {
          id: true,
          name: true,
          sku: true,
          stockQty: true,
          reorderLevel: true,
          costPrice: true,
          sellingPrice: true,
        },
        orderBy: { stockQty: "asc" },
        take: 5,
      }),
      prisma.product.findMany({
        where: { ...whereProduct, stockQty: { lte: 0 } },
        select: {
          id: true,
          name: true,
          sku: true,
          stockQty: true,
          reorderLevel: true,
          costPrice: true,
          sellingPrice: true,
        },
        orderBy: { name: "asc" },
        take: 5,
      }),
      querySalesTrend,
      queryRecentSales,
      prisma.organization.findUnique({
        where: { id: orgId },
        select: { currency: true },
      }),
    ]);

    const displayCurrency = organization?.currency || "USD";

    // Build sales trend map
    const salesMap = new Map<string, number>();
    for (let i = 29; i >= 0; i--) {
      salesMap.set(format(subDays(new Date(), i), "MMM dd"), 0);
    }
    for (const s of salesTrendRaw) {
      const date = format(s.createdAt, "MMM dd");
      if (salesMap.has(date)) {
        salesMap.set(date, salesMap.get(date)! + Number(s.total));
      }
    }

    const chartData = Array.from(salesMap.entries()).map(([date, total]) => ({
      date,
      total: convertFromBase(total, displayCurrency),
    }));

    return {
      success: true,
      data: {
        currency: displayCurrency,
        kpis: {
          todayRevenue: convertFromBase(Number(revenueToday?._sum?.total || 0), displayCurrency),
          totalOutstandingDebt: convertFromBase(Number(totalDebt?._sum?.outstandingBalance || 0), displayCurrency),
          activeProducts: activeProductCount,
          lowStockCount,
          outOfStockCount,
        },
        chartData,
        recentSales: recentSales.map((s) => ({
          id: s.id,
          customer: s.customer?.fullName || "Walk-in",
          total: convertFromBase(Number(s.total), displayCurrency),
          createdAt: s.createdAt,
          method: s.paymentMethod,
        })),
        inventoryAlerts: {
          lowStock: lowStockAlerts.map((p) => ({
            ...p,
            costPrice: convertFromBase(Number(p.costPrice), displayCurrency),
            sellingPrice: convertFromBase(Number(p.sellingPrice), displayCurrency),
          })),
          outOfStock: outOfStockAlerts.map((p) => ({
            ...p,
            costPrice: convertFromBase(Number(p.costPrice), displayCurrency),
            sellingPrice: convertFromBase(Number(p.sellingPrice), displayCurrency),
          })),
        },
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[Dashboard Stats Error]:", message, error);
    return {
      success: false,
      error: `Failed to load dashboard statistics. Reason: ${message}`,
    };
  }
}
