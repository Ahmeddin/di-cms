import type { DefaultSession } from "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      globalRole: "SUPER_ADMIN" | "ADMIN" | "USER";
      organizationId: string | null;
      activeShopId?: string;
      activeRole?: "SUPER_ADMIN" | "CASHIER" | "INVENTORY";
      availableShops: {
        shopId: string;
        shopName: string;
        roleName: "SUPER_ADMIN" | "CASHIER" | "INVENTORY";
      }[];
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    globalRole: "SUPER_ADMIN" | "ADMIN" | "USER";
    organizationId: string | null;
    activeShopId?: string;
    availableShops: {
      shopId: string;
      shopName: string;
      roleName: "SUPER_ADMIN" | "CASHIER" | "INVENTORY";
    }[];
  }
}
