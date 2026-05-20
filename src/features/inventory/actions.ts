"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole, requireBranchAccess, requireNotGlobalWrite } from "@/lib/rbac";
import { writeAuditLog } from "@/lib/audit";
import { stockMovementCreateSchema } from "@/features/inventory/schemas";

async function adjustStock(params: {
  productId: string;
  quantityDelta: number;
  type: "STOCK_IN" | "STOCK_OUT" | "ADJUSTMENT";
  note?: string;
}) {
  const session = await requireRole(["SUPER_ADMIN", "INVENTORY"]);
  await requireBranchAccess(session);
  await requireNotGlobalWrite(session);

  const product = await prisma.$transaction(async (tx) => {
    const p = await tx.product.findFirst({
      where: { id: params.productId, shopId: session.user.activeShopId! },
      select: { id: true, stockQty: true, name: true, sku: true },
    });
    if (!p) throw new Error("Product not found");

    const nextQty = p.stockQty + params.quantityDelta;
    if (nextQty < 0) throw new Error("Insufficient stock");

    const updated = await tx.product.update({
      where: { id: p.id },
      data: { stockQty: nextQty },
    });

    await tx.stockMovement.create({
      data: {
        shopId: session.user.activeShopId!,
        productId: p.id,
        type: params.type,
        quantityDelta: params.quantityDelta,
        note: params.note && params.note.length > 0 ? params.note : null,
        createdById: session.user.id,
      },
    });

    return updated;
  });

  await writeAuditLog({
    shopId: session.user.activeShopId!,
    userId: session.user.id,
    action: "STOCK_ADJUST",
    entityType: "Product",
    entityId: product.id,
    metadata: { type: params.type, delta: params.quantityDelta },
  });

  revalidatePath("/inventory");
  revalidatePath("/products");
}

export async function stockIn(input: unknown) {
  const parsed = stockMovementCreateSchema.parse(input);
  return adjustStock({
    productId: parsed.productId,
    quantityDelta: parsed.quantity,
    type: "STOCK_IN",
    note: parsed.note ?? undefined,
  });
}

export async function stockOut(input: unknown) {
  const parsed = stockMovementCreateSchema.parse(input);
  return adjustStock({
    productId: parsed.productId,
    quantityDelta: -parsed.quantity,
    type: "STOCK_OUT",
    note: parsed.note ?? undefined,
  });
}

export async function stockAdjustment(input: unknown) {
  const parsed = stockMovementCreateSchema.parse(input);
  return adjustStock({
    productId: parsed.productId,
    quantityDelta: parsed.quantity,
    type: "ADJUSTMENT",
    note: parsed.note ?? undefined,
  });
}

