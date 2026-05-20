import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pkg from "pg";
import bcrypt from "bcryptjs";
const { Pool } = pkg;

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const pool = new Pool({ connectionString: databaseUrl });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding started...");

  // 1. Create Organization
  const org = await prisma.organization.upsert({
    where: { id: "demo-org-id" },
    update: {},
    create: {
      id: "demo-org-id",
      name: "Acme Enterprises Inc.",
    },
  });

  // 2. Create Branches (Shops)
  const branchesData = [
    { id: "branch-downtown", name: "Downtown Branch" },
    { id: "branch-uptown", name: "Uptown Branch" }
  ];

  const shops = [];
  for (const b of branchesData) {
    const shop = await prisma.shop.upsert({
      where: { id: b.id },
      update: {},
      create: {
        id: b.id,
        name: b.name,
        organizationId: org.id
      },
    });
    shops.push(shop);
  }

  // 3. Create Roles for each branch
  const roleNames = ["CASHIER", "INVENTORY"];
  for (const shop of shops) {
    for (const roleName of roleNames) {
      await prisma.role.upsert({
        where: { shopId_name: { shopId: shop.id, name: roleName as any } },
        update: {},
        create: { name: roleName as any, shopId: shop.id },
      });
    }
  }

  // Fetch roles for reference
  const dtCashierRole = await prisma.role.findFirst({ where: { shopId: "branch-downtown", name: "CASHIER" } });
  const utCashierRole = await prisma.role.findFirst({ where: { shopId: "branch-uptown", name: "CASHIER" } });

  // 4. Create Users
  const passwordHash = await bcrypt.hash("password123", 10);
  
  // Super Admin (Owner)
  const owner = await prisma.user.upsert({
    where: { email: "admin@demo.com" },
    update: { passwordHash },
    create: {
      email: "admin@demo.com",
      name: "Sarah Admin",
      passwordHash,
      globalRole: "SUPER_ADMIN",
      organizationId: org.id,
      isActive: true,
    },
  });

  // Cashier Downtown
  const cashierDt = await prisma.user.upsert({
    where: { email: "cashier1@demo.com" },
    update: { passwordHash },
    create: {
      email: "cashier1@demo.com",
      name: "John Downtown",
      passwordHash,
      globalRole: "USER",
      organizationId: org.id,
      isActive: true,
    },
  });

  // Cashier Uptown
  const cashierUt = await prisma.user.upsert({
    where: { email: "cashier2@demo.com" },
    update: { passwordHash },
    create: {
      email: "cashier2@demo.com",
      name: "Jane Uptown",
      passwordHash,
      globalRole: "USER",
      organizationId: org.id,
      isActive: true,
    },
  });

  // 5. Assign Memberships
  const memberships = [
    { userId: cashierDt.id, shopId: "branch-downtown", roleId: dtCashierRole!.id },
    { userId: cashierUt.id, shopId: "branch-uptown", roleId: utCashierRole!.id }
  ];

  for (const m of memberships) {
    await prisma.shopMember.upsert({
      where: { shopId_userId: { shopId: m.shopId, userId: m.userId } },
      update: { roleId: m.roleId },
      create: m
    });
  }

  // 6. Seed Branch Data
  for (const shop of shops) {
    // Categories
    const categories: any = {};
    for (const name of ["Laptops", "Accessories"]) {
      categories[name] = await prisma.category.upsert({
        where: { shopId_name: { shopId: shop.id, name } },
        update: {},
        create: { name, shopId: shop.id },
      });
    }

    // Products (Different prices/stocks per branch)
    const multiplier = shop.id === "branch-downtown" ? 1 : 1.1; // Uptown is 10% more expensive
    const productData = [
      { name: "MacBook Pro M3", sku: "MAC-M3-001", costPrice: 1800, sellingPrice: 2200 * multiplier, stockQty: 10, reorderLevel: 2, categoryId: categories["Laptops"].id, shopId: shop.id },
      { name: "Logitech MX Master 3S", sku: "LOGI-MX3", costPrice: 65, sellingPrice: 99 * multiplier, stockQty: 25, reorderLevel: 5, categoryId: categories["Accessories"].id, shopId: shop.id },
    ];

    for (const p of productData) {
      await prisma.product.upsert({
        where: { shopId_sku: { shopId: shop.id, sku: p.sku } },
        update: { ...p },
        create: { ...p },
      });
    }

    // Customers
    const customer = await prisma.customer.findFirst({ where: { shopId: shop.id, fullName: `VIP ${shop.name}` } });
    if (!customer) {
      await prisma.customer.create({
        data: {
          fullName: `VIP ${shop.name}`,
          phone: "+1 555-0101",
          creditLimit: 2000,
          shopId: shop.id,
          creditAccount: { create: { outstandingBalance: 450, shopId: shop.id } }
        }
      });
    }
  }

  console.log("Seeding completed successfully.");
}

main()
  .catch((e) => {
    console.error("Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
