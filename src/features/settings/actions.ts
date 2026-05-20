"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { revalidatePath } from "next/cache";

export async function getSettings() {
  let session;
  try {
    session = await requireRole(["SUPER_ADMIN"]);
  } catch (err) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const isGlobal = session.user.activeShopId === "ALL";
    const [shop, organization, settings] = await Promise.all([
      isGlobal
        ? null
        : prisma.shop.findUnique({
            where: { id: session.user.activeShopId! },
          }),
      prisma.organization.findUnique({
        where: { id: session.user.organizationId! },
      }),
      isGlobal
        ? []
        : prisma.setting.findMany({
            where: { shopId: session.user.activeShopId! },
          }),
    ]);

    return {
      success: true,
      data: {
        shop,
        organization,
        settings,
      },
    };
  } catch (error) {
    console.error("Failed to fetch settings:", error);
    return { success: false, error: "Failed to fetch settings" };
  }
}

export async function updateOrganizationSettings(formData: FormData) {
  let session;
  try {
    session = await requireRole(["SUPER_ADMIN"]);
  } catch (err) {
    return { success: false, error: "Unauthorized" };
  }
  if (!session?.user?.organizationId) return { success: false, error: "Unauthorized: No organization found" };

  const name = formData.get("name") as string;
  const currency = formData.get("currency") as string;

  if (!name) return { success: false, error: "Organization name is required" };

  try {
    await prisma.organization.update({
      where: { id: session.user.organizationId },
      data: { name, currency },
    });

    let targetShopId = session.user.activeShopId!;
    if (targetShopId === "ALL") {
      const firstShop = await prisma.shop.findFirst({
        where: { organizationId: session.user.organizationId },
        select: { id: true },
      });
      if (!firstShop) {
        return { success: false, error: "No active shop branch found to log this action." };
      }
      targetShopId = firstShop.id;
    }

    // Log action (using active shop for context)
    await prisma.auditLog.create({
      data: {
        shopId: targetShopId,
        userId: session.user.id,
        action: "UPDATE_ORG_PROFILE",
        entityType: "ORGANIZATION",
        entityId: session.user.organizationId,
        metadata: { name, currency },
      },
    });

    // Global revalidation to ensure currency updates everywhere (dashboards, tables, etc.)
    revalidatePath("/", "layout");
    
    return { success: true };
  } catch (error) {
    console.error("Failed to update organization settings:", error);
    return { success: false, error: "Failed to update organization settings" };
  }
}

export async function updateLowStockThreshold(formData: FormData) {
  let session;
  try {
    session = await requireRole(["SUPER_ADMIN"]);
  } catch (err) {
    return { success: false, error: "Unauthorized" };
  }

  const shopId = session.user.activeShopId;
  if (!shopId || shopId === "ALL") {
    return { success: false, error: "Please select a specific branch to configure low stock settings." };
  }

  const thresholdRaw = formData.get("threshold");
  const threshold = Number(thresholdRaw);

  if (isNaN(threshold) || threshold < 1) {
    return { success: false, error: "Threshold must be a positive number." };
  }

  try {
    await prisma.setting.upsert({
      where: {
        shopId_key: {
          shopId,
          key: "low_stock_threshold",
        },
      },
      update: {
        value: { threshold },
      },
      create: {
        shopId,
        key: "low_stock_threshold",
        value: { threshold },
      },
    });

    // Log action
    await prisma.auditLog.create({
      data: {
        shopId,
        userId: session.user.id,
        action: "UPDATE_LOW_STOCK_THRESHOLD",
        entityType: "SETTING",
        entityId: "low_stock_threshold",
        metadata: { threshold },
      },
    });

    revalidatePath("/", "layout");
    revalidatePath("/settings");

    return { success: true };
  } catch (error) {
    console.error("Failed to update low stock threshold:", error);
    return { success: false, error: "Failed to update low stock threshold." };
  }
}

