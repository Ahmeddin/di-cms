import { auth } from "@/lib/auth";

export type AppRole = "SUPER_ADMIN" | "CASHIER" | "INVENTORY";
export type GlobalRole = "SUPER_ADMIN" | "ADMIN" | "USER";

export async function requireSession() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session;
}

export async function requireRole(roles: AppRole[]) {
  const session = await requireSession();
  if (session.user.globalRole === "SUPER_ADMIN") return session;
  
  if (!session.user.activeRole || !roles.includes(session.user.activeRole)) {
    throw new Error("Forbidden");
  }
  return session;
}

export async function requireBranchAccess(session?: any) {
  const activeSession = session || (await requireSession());
  
  if (!activeSession.user.activeShopId) {
    throw new Error("No active shop selected.");
  }
  
  // block INVENTORY/CASHIER from global mode
  if (activeSession.user.activeShopId === "ALL" && activeSession.user.globalRole !== "SUPER_ADMIN") {
    throw new Error("Unauthorized access to global branch view.");
  }
  
  return activeSession;
}

export async function requireNotGlobalWrite(session: any) {
  if (session.user.activeShopId === "ALL") {
    throw new Error("Please select a specific branch to perform this action.");
  }
  return session;
}

