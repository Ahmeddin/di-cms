"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

async function requireSuperAdmin() {
  const session = await auth();
  if (session?.user?.globalRole !== "SUPER_ADMIN") {
    throw new Error("Unauthorized: Super Admin access required.");
  }
  return session;
}

export async function getAllBranches() {
  const session = await requireSuperAdmin();
  
  const branches = await prisma.shop.findMany({
    where: { organizationId: session.user.organizationId! },
    include: {
      _count: {
        select: { members: true }
      }
    },
    orderBy: { createdAt: "asc" }
  });

  return { success: true, data: branches };
}

export async function createBranch(name: string) {
  const session = await requireSuperAdmin();

  if (!name || name.length < 2) {
    return { success: false, error: "Branch name is too short." };
  }

  try {
    return await prisma.$transaction(async (tx) => {
      const shop = await tx.shop.create({
        data: {
          name,
          organizationId: session.user.organizationId!
        }
      });

      // Create default roles for the new shop
      const roles = [
        { name: "CASHIER" as const },
        { name: "INVENTORY" as const }
      ];

      for (const role of roles) {
        await tx.role.create({
          data: {
            name: role.name,
            shopId: shop.id
          }
        });
      }

      revalidatePath("/profile");
      return { success: true, data: shop };
    });
  } catch (error: any) {
    return { success: false, error: "Failed to create branch." };
  }
}

export async function updateBranch(id: string, name: string) {
  await requireSuperAdmin();

  try {
    await prisma.shop.update({
      where: { id },
      data: { name }
    });

    revalidatePath("/profile");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: "Failed to update branch." };
  }
}

export async function deleteBranch(id: string) {
  const session = await requireSuperAdmin();

  try {
    // Check if there are other branches
    const count = await prisma.shop.count({
      where: { organizationId: session.user.organizationId! }
    });

    if (count <= 1) {
      return { success: false, error: "Cannot delete the last remaining branch." };
    }

    await prisma.shop.delete({
      where: { id }
    });

    revalidatePath("/profile");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: "Failed to delete branch. It might have active sales or inventory data." };
  }
}
