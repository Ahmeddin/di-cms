"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole, requireBranchAccess, requireNotGlobalWrite } from "@/lib/rbac";
import { writeAuditLog } from "@/lib/audit";
import { categorySchema, productUpsertSchema } from "@/features/products/schemas";
import { convertToBase } from "@/lib/currency";

export async function createCategory(input: unknown) {
  const session = await requireRole(["SUPER_ADMIN", "INVENTORY"]);
  await requireBranchAccess(session);
  await requireNotGlobalWrite(session);
  const parsed = categorySchema.parse(input);

  const category = await prisma.category.create({
    data: {
      shopId: session.user.activeShopId!,
      name: parsed.name,
    },
  });

  await writeAuditLog({
    shopId: session.user.activeShopId!,
    userId: session.user.id,
    action: "CATEGORY_CREATE",
    entityType: "Category",
    entityId: category.id,
    metadata: { name: category.name },
  });

  revalidatePath("/products");
  return category;
}

export async function upsertProduct(input: unknown) {
  const session = await requireRole(["SUPER_ADMIN", "INVENTORY"]);
  await requireBranchAccess(session);
  await requireNotGlobalWrite(session);
  const parsed = productUpsertSchema.parse(input);

  const categoryId = parsed.categoryId && parsed.categoryId.length > 0 ? parsed.categoryId : null;
  const barcode = parsed.barcode && parsed.barcode.length > 0 ? parsed.barcode : null;

  const isCreate = !parsed.id;

  const org = await prisma.organization.findUnique({
    where: { id: session.user.organizationId! },
    select: { currency: true },
  });
  const displayCurrency = org?.currency || "USD";

  const baseCostPrice = convertToBase(parsed.costPrice, displayCurrency);
  const baseSellingPrice = convertToBase(parsed.sellingPrice, displayCurrency);

  const product = await prisma.product.upsert({
    where: { id: parsed.id ?? "" },
    create: {
      shopId: session.user.activeShopId!,
      name: parsed.name,
      sku: parsed.sku,
      barcode,
      categoryId,
      costPrice: baseCostPrice,
      sellingPrice: baseSellingPrice,
      stockQty: parsed.stockQty ?? 0,
      reorderLevel: parsed.reorderLevel,
      isActive: parsed.isActive,
    },
    update: {
      name: parsed.name,
      sku: parsed.sku,
      barcode,
      categoryId,
      costPrice: baseCostPrice,
      sellingPrice: baseSellingPrice,
      reorderLevel: parsed.reorderLevel,
      isActive: parsed.isActive,
    },
  });

  await writeAuditLog({
    shopId: session.user.activeShopId!,
    userId: session.user.id,
    action: isCreate ? "PRODUCT_CREATE" : "PRODUCT_UPDATE",
    entityType: "Product",
    entityId: product.id,
    metadata: {
      name: product.name,
      sku: product.sku,
      barcode: product.barcode,
      categoryId: product.categoryId,
    },
  });

  revalidatePath("/products");
  return product;
}

export async function deleteProduct(productId: string) {
  const session = await requireRole(["SUPER_ADMIN", "INVENTORY"]);
  await requireBranchAccess(session);
  await requireNotGlobalWrite(session);

  const product = await prisma.product.findFirst({
    where: { id: productId, shopId: session.user.activeShopId! },
  });
  if (!product) return;

  await prisma.product.delete({
    where: { id: productId },
  });

  await writeAuditLog({
    shopId: session.user.activeShopId!,
    userId: session.user.id,
    action: "PRODUCT_DELETE",
    entityType: "Product",
    entityId: productId,
    metadata: { name: product.name, sku: product.sku },
  });

  revalidatePath("/products");
}


