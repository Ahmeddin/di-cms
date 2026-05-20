import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

export async function writeAuditLog(params: {
  shopId: string;
  userId: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: unknown;
}) {
  await prisma.auditLog.create({
    data: {
      shopId: params.shopId,
      userId: params.userId,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId ?? null,
      metadata: params.metadata as Prisma.InputJsonValue,
    },
  });
}

