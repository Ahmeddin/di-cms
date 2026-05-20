import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pkg from "pg";
const { Pool } = pkg;

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  const users = await prisma.user.findMany({
    select: { email: true, isActive: true, passwordHash: true }
  });
  console.log("Found users:", users.map(u => ({ email: u.email, active: u.isActive, hasHash: !!u.passwordHash })));
  
  await prisma.$disconnect();
}

main().catch(console.error);
