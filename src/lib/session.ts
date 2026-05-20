import { cache } from "react";
import { auth } from "@/lib/auth";

/**
 * CACHED SESSION HELPER
 *
 * React's `cache()` deduplicates calls within the same server render tree.
 * All server components (RootLayout, DashboardLayout, page data components)
 * that call `getSession()` in the same request share a single `auth()` execution.
 *
 * This eliminates the triple auth() call per navigation without removing
 * auth() from any caller — each caller just uses this instead of raw auth().
 */
export const getSession = cache(async () => {
  return await auth();
});

/**
 * SHOP SCOPE HELPER
 * Returns the correct Prisma `where` clause for branch filtering.
 * Uses `shopId: { in: [...] }` for global scope which is highly performant.
 */
export function getShopScope(session: any) {
  const isGlobal = session?.user?.globalRole === "SUPER_ADMIN" && session?.user?.activeShopId === "ALL";
  
  // Extract all shop IDs the user has access to
  const availableShops = session?.user?.availableShops || [];
  const shopIds = availableShops.map((s: any) => s.shopId);
  
  const whereShop = isGlobal 
    ? { shopId: { in: shopIds } } 
    : { shopId: session?.user?.activeShopId };
    
  return { isGlobal, whereShop, shopIds };
}
