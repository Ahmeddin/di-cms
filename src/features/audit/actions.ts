"use server";

import { prisma } from "@/lib/prisma";
import { requireRole, requireBranchAccess } from "@/lib/rbac";
import { getShopScope } from "@/lib/session";

export async function getAuditLogs(page = 1, limit = 20) {
  try {
    const session = await requireRole(["SUPER_ADMIN"]);
    await requireBranchAccess(session);
    const { whereShop } = getShopScope(session);
    const skip = (page - 1) * limit;
    
    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where: whereShop,
        include: { 
          user: { select: { name: true, email: true } },
          shop: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.auditLog.count({
        where: whereShop,
      }),
    ]);

    return {
      success: true,
      data: {
        logs,
        pagination: {
          total,
          pages: Math.ceil(total / limit),
          currentPage: page,
        },
      },
    };
  } catch (error) {
    console.error("Failed to fetch audit logs:", error);
    return { success: false, error: "Failed to fetch audit logs" };
  }
}
