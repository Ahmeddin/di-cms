import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

const credentialsSchema = z.object({
  email: z.string(),
  password: z.string(),
});

/**
 * FETCH USER DATA ONCE
 * Used by JWT callback to enrich the token so we don't hit DB on every session call.
 */
async function getEnrichedUserData(userId: string) {
  return await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      globalRole: true,
      organizationId: true,
      shopMemberships: {
        select: {
          shopId: true,
          shop: { select: { name: true } },
          role: { select: { name: true } }
        }
      }
    },
  });
}

export const authConfig: NextAuthConfig = {
  adapter: PrismaAdapter(prisma as any),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;
        try {
          const user = await prisma.user.findFirst({
            where: {
              email: { equals: email, mode: 'insensitive' },
              isActive: true
            },
          });

          if (!user || !user.passwordHash) return null;

          const isPasswordCorrect = await bcrypt.compare(password, user.passwordHash);
          if (!isPasswordCorrect) return null;

          return {
            id: user.id,
            name: user.name,
            email: user.email,
            image: user.image,
          };
        } catch (dbError) {
          console.error(">>> [AUTH] Database Error during authorize:", dbError);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    /**
     * JWT CALLBACK - ENRICHMENT & PERSISTENCE
     * This runs on sign-in or when session is updated.
     * We store all necessary RBAC/Context info here to avoid DB lookups during navigation.
     */
    async jwt({ token, user, trigger, session }) {
      console.log(`>>> [AUTH JWT] Trigger: "${trigger}", Token Name: "${token.name}", Token ID: "${token.id || user?.id}"`);
      // 1. Initial Sign In - Fetch and cache everything in the JWT
      if (user) {
        const dbUser = await getEnrichedUserData(user.id!);
        if (dbUser) {
          let availableShops = dbUser.shopMemberships.map(sm => ({
            shopId: sm.shopId,
            shopName: sm.shop.name,
            roleName: sm.role.name as any
          }));

          // If SUPER_ADMIN, automatically grant access to all organization shops
          if (dbUser.globalRole === "SUPER_ADMIN" && dbUser.organizationId) {
            const orgShops = await prisma.shop.findMany({
              where: { organizationId: dbUser.organizationId },
              select: { id: true, name: true }
            });
            availableShops = orgShops.map(s => ({
              shopId: s.id,
              shopName: s.name,
              roleName: "SUPER_ADMIN" as any
            }));
          }

          token.id = dbUser.id;
          token.name = dbUser.name;
          token.email = dbUser.email;
          token.picture = dbUser.image;
          token.globalRole = dbUser.globalRole as any;
          token.organizationId = dbUser.organizationId;
          token.availableShops = availableShops;
          
          // Default active shop
          token.activeShopId = availableShops[0]?.shopId || (dbUser.globalRole === "SUPER_ADMIN" ? "ALL" : undefined);
          console.log(`>>> [AUTH JWT] Sign In - Enriched Token:`, { name: token.name, role: token.globalRole });
        }
      }

      // 2. Handle update() (Branch Switching or manual refresh)
      if (trigger === "update") {
        console.log(`>>> [AUTH JWT] Update trigger payload:`, session);
        if (session?.activeShopId) {
          token.activeShopId = session.activeShopId;
        }
        
        // Force a data refresh if update is called
        const dbUser = await getEnrichedUserData(token.id as string);
        if (dbUser) {
          token.name = dbUser.name;
          token.email = dbUser.email;
          token.picture = dbUser.image;
          token.globalRole = dbUser.globalRole;

          let availableShops = dbUser.shopMemberships.map(sm => ({
            shopId: sm.shopId,
            shopName: sm.shop.name,
            roleName: sm.role.name as any
          }));

          if (dbUser.globalRole === "SUPER_ADMIN" && dbUser.organizationId) {
            const orgShops = await prisma.shop.findMany({
              where: { organizationId: dbUser.organizationId },
              select: { id: true, name: true }
            });
            availableShops = orgShops.map(s => ({
              shopId: s.id,
              shopName: s.name,
              roleName: "SUPER_ADMIN" as any
            }));
          }

          token.availableShops = availableShops;
          console.log(`>>> [AUTH JWT] Update success - DB Name: "${dbUser.name}", Token Name updated to: "${token.name}"`);
        } else {
          console.warn(`>>> [AUTH JWT] Update failed - user not found in DB for ID: "${token.id}"`);
        }
      }

      return token;
    },

    /**
     * SESSION CALLBACK - LIGHTWEIGHT
     * This runs on EVERY auth() call. It MUST be extremely fast.
     * It now simply maps the JWT token data to the session object without any DB queries.
     */
    async session({ session, token }) {
      if (token && session.user) {
        const availableShops = token.availableShops || [];
        const globalRole = token.globalRole;
        
        session.user.id = token.id;
        session.user.name = (token.name as string) || null;
        session.user.email = (token.email as string) || "";
        session.user.image = (token.picture as string) || null;
        session.user.globalRole = globalRole;
        session.user.organizationId = token.organizationId;
        session.user.availableShops = availableShops;

        // Validation of activeShopId from token
        let activeShopId = token.activeShopId;
        const validShopIds = availableShops.map(s => s.shopId);
        if (globalRole === "SUPER_ADMIN") validShopIds.push("ALL");

        if (!activeShopId || !validShopIds.includes(activeShopId)) {
          activeShopId = validShopIds.length > 0 ? validShopIds[0] : (globalRole === "SUPER_ADMIN" ? "ALL" : undefined);
        }

        session.user.activeShopId = activeShopId;
        session.user.activeRole = availableShops.find(s => s.shopId === activeShopId)?.roleName;
      }
      
      return session;
    },
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
