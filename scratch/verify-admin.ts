
import "dotenv/config";
import { prisma } from "../src/lib/prisma";

async function main() {
  const user = await prisma.user.findFirst({
    where: { email: "admin@demo.com" },
    include: { shopMemberships: true }
  });
  console.log("Check admin@demo.com:", JSON.stringify(user, null, 2));
  if (user && user.passwordHash) {
    const bcrypt = require("bcryptjs");
    const match = await bcrypt.compare("password123", user.passwordHash);
    console.log("Password 'password123' match:", match);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
