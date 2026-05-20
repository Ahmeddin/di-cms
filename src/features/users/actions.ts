"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { userUpsertSchema, resetPasswordSchema } from "./schemas";
import bcrypt from "bcryptjs";
import { RoleName } from "@/generated/prisma/enums";

async function requireSuperAdmin() {
  const session = await auth();
  if (session?.user?.globalRole !== "SUPER_ADMIN") {
    throw new Error("Unauthorized: Super Admin access required.");
  }
  return session;
}

export async function getUsers() {
  await requireSuperAdmin();
  
  const users = await prisma.user.findMany({
    include: {
      shopMemberships: {
        include: {
          shop: { select: { name: true } },
          role: { select: { name: true } }
        }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  return { success: true, data: users };
}

export async function upsertUser(input: any) {
  const session = await requireSuperAdmin();
  const parsed = userUpsertSchema.parse(input);
  
  const { id, name, email, password, role, shopIds = [], isActive } = parsed;

  if (id === session.user.id && !isActive) {
    return { success: false, error: "You cannot deactivate your own account." };
  }

  try {
    return await prisma.$transaction(async (tx) => {
      let user;
      
      if (id) {
        // Update user
        user = await tx.user.update({
          where: { id },
          data: { 
            name, 
            email, 
            isActive,
            // Only update password if provided
            ...(password ? { passwordHash: await bcrypt.hash(password, 10) } : {})
          }
        });
      } else {
        // Create user
        if (!password) throw new Error("Password is required for new users");
        
        user = await tx.user.create({
          data: {
            name,
            email,
            passwordHash: await bcrypt.hash(password, 10),
            organizationId: session.user.organizationId,
            isActive
          }
        });
      }

      // Sync memberships only if target user is NOT a SUPER_ADMIN
      const userRecord = await tx.user.findUnique({
        where: { id: user.id },
        select: { globalRole: true }
      });
      const isTargetSuperAdmin = userRecord?.globalRole === "SUPER_ADMIN";

      // Sync memberships only for non‑Super Admin users
if (!isTargetSuperAdmin && role) {
        // 1. Identify memberships to remove (those in DB but not in shopIds)
        await tx.shopMember.deleteMany({
          where: { 
            userId: user.id,
            shopId: { notIn: shopIds }
          }
        });

        // 2. Add or Update memberships for the selected shops
        for (const shopId of shopIds) {
          // Find role ID for this specific shop
          const dbRole = await tx.role.findUnique({
            where: { shopId_name: { shopId, name: role } }
          });

          if (!dbRole) throw new Error(`Role ${role} not found for shop ${shopId}`);

          await tx.shopMember.upsert({
            where: { shopId_userId: { shopId, userId: user.id } },
            update: { roleId: dbRole.id, isActive: true },
            create: {
              userId: user.id,
              shopId,
              roleId: dbRole.id,
              isActive: true
            }
          });
        }
      }

      // Log action safely
      let logShopId = shopIds[0];
      if (!logShopId) {
        logShopId = session.user.activeShopId || "ALL";
      }
      if (logShopId === "ALL") {
        const firstShop = await tx.shop.findFirst({
          where: { organizationId: session.user.organizationId || undefined },
          select: { id: true }
        });
        logShopId = firstShop?.id || "";
      }

      if (logShopId) {
        await tx.auditLog.create({
          data: {
            shopId: logShopId,
            userId: session.user.id,
            action: id ? "USER_UPDATE" : "USER_CREATE",
            entityType: "USER",
            entityId: user.id,
            metadata: { email, role, shopIds }
          }
        });
      }

      revalidatePath("/profile");
      return { success: true, data: user };
    });
  } catch (error: any) {
    console.error("Upsert User Error:", error);
    return { success: false, error: error.message || "Failed to save user" };
  }
}

export async function deleteUser(userId: string) {
  const session = await requireSuperAdmin();

  if (userId === session.user.id) {
    return { success: false, error: "You cannot delete your own account." };
  }

  try {
    await prisma.user.delete({
      where: { id: userId }
    });

    revalidatePath("/profile");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: "Failed to delete user" };
  }
}

export async function resetPassword(input: any) {
  await requireSuperAdmin();
  const { userId, password } = resetPasswordSchema.parse(input);

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash }
    });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: "Failed to reset password" };
  }
}
