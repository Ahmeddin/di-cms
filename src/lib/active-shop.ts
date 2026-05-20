import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

/**
 * Retrieves the current active shop ID from the session.
 * Used in Server Components and Server Actions.
 */
export async function getActiveShopId() {
  const session = await auth();
  
  if (!session?.user?.activeShopId) {
    return null;
  }
  
  return session.user.activeShopId;
}

/**
 * Ensures the user has an active shop selected, or redirects to selection.
 */
export async function requireActiveBranch() {
  const shopId = await getActiveShopId();
  
  if (!shopId) {
    redirect("/select-branch");
  }
  
  return shopId;
}

export const requireActiveShop = requireActiveBranch; // alias for backwards compatibility

/**
 * Retrieves the organization ID for the current user.
 */
export async function getOrganizationId() {
  const session = await auth();
  return session?.user?.organizationId || null;
}
