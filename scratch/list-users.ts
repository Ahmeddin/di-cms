import "dotenv/config";
import { prisma } from "../src/lib/prisma";

async function main() {
  const users = await prisma.user.findMany({
    include: {
      shopMemberships: {
        include: {
          shop: true,
          role: true,
        }
      }
    }
  });

  console.log("USERS AND MEMBERSHIPS:");
  users.forEach((u) => {
    console.log(`- Email: ${u.email}`);
    console.log(`  Global Role: ${u.globalRole}`);
    console.log(`  Memberships:`);
    u.shopMemberships.forEach((m) => {
      console.log(`    * Shop: ${m.shop.name} (${m.shopId}), Role: ${m.role.name}`);
    });
    console.log("");
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
