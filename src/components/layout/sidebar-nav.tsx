"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Session } from "next-auth";
import { 
  LayoutDashboard, 
  Package, 
  Boxes, 
  Users, 
  Receipt, 
  CreditCard, 
  BarChart3, 
  Settings, 
  Shield,
  UserCog,
  ChevronLeft,
  ChevronRight
} from "lucide-react";

import { cn } from "@/lib/utils";
import { BranchSwitcher } from "@/components/branch-switcher";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: Array<"SUPER_ADMIN" | "CASHIER" | "INVENTORY">;
};

const nav: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/products", label: "Products", icon: Package, roles: ["SUPER_ADMIN", "INVENTORY"] },
  { href: "/inventory", label: "Inventory", icon: Boxes, roles: ["SUPER_ADMIN", "INVENTORY"] },
  { href: "/customers", label: "Customers", icon: Users, roles: ["SUPER_ADMIN", "CASHIER", "INVENTORY"] },
  { href: "/sales", label: "Sales", icon: Receipt, roles: ["SUPER_ADMIN", "CASHIER"] },
  { href: "/credit", label: "Credit", icon: CreditCard, roles: ["SUPER_ADMIN", "CASHIER"] },
  { href: "/reports", label: "Reports", icon: BarChart3, roles: ["SUPER_ADMIN", "INVENTORY"] },
  { href: "/audit", label: "Audit Log", icon: Shield, roles: ["SUPER_ADMIN"] },
  { href: "/profile", label: "Admin Panel", icon: UserCog, roles: [] },
  { href: "/settings", label: "Settings", icon: Settings, roles: ["SUPER_ADMIN"] },
];

export function SidebarNav({ 
  session, 
  isCollapsed, 
  setIsCollapsed 
}: { 
  session: Session | null;
  isCollapsed: boolean;
  setIsCollapsed: (v: boolean) => void;
}) {
  const pathname = usePathname();
  const activeRole = session?.user?.activeRole;
  const isSuperAdmin = session?.user?.globalRole === "SUPER_ADMIN";

  const visibleNav = nav.filter((item) => !item.roles || isSuperAdmin || (activeRole ? item.roles.includes(activeRole) : false));

  return (
    <TooltipProvider>
      <div className="h-full flex flex-col justify-between py-4">
        <div className="flex flex-col gap-4">
          <div className={cn("px-4 flex items-center", isCollapsed ? "justify-center" : "justify-between")}>
            {!isCollapsed && (
              <div className="flex items-center gap-2">
                <div className="bg-primary rounded-md p-1.5 flex items-center justify-center">
                  <LayoutDashboard className="h-5 w-5 text-primary-foreground" />
                </div>
                <div className="font-bold text-lg tracking-tight">DI-CMS</div>
              </div>
            )}
            {isCollapsed && (
              <div className="bg-primary rounded-md p-1.5 flex items-center justify-center mb-2">
                <LayoutDashboard className="h-5 w-5 text-primary-foreground" />
              </div>
            )}
            <Button 
              variant="ghost" 
              size="icon" 
              className={cn("h-8 w-8 hidden md:flex", isCollapsed && "absolute right-[-16px] top-4 bg-background border rounded-full shadow-sm z-50 h-7 w-7")}
              onClick={() => setIsCollapsed(!isCollapsed)}
            >
              {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
          </div>

          <div className="px-3">
            {session?.user?.availableShops && session.user.availableShops.length > 0 && (
              <BranchSwitcher 
                branches={[
                  ...(isSuperAdmin ? [{ id: "ALL", name: "All Branches" }] : []),
                  ...session.user.availableShops.map(s => ({ id: s.shopId, name: s.shopName }))
                ]} 
                currentShopId={session?.user?.activeShopId || ""}
                isCollapsed={isCollapsed}
              />
            )}
          </div>

          <nav className="flex flex-col gap-1 px-3 mt-2">
            {visibleNav.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || (item.href !== "/" && pathname?.startsWith(item.href));

              const linkContent = (
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-all duration-200",
                    isActive 
                      ? "bg-primary text-primary-foreground shadow-premium" 
                      : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground",
                    isCollapsed && "justify-center px-0"
                  )}
                >
                  <Icon className={cn("h-4 w-4", isActive ? "text-primary-foreground" : "text-muted-foreground")} />
                  {!isCollapsed && <span>{item.label}</span>}
                </Link>
              );

              if (isCollapsed) {
                return (
                  <Tooltip key={item.href}>
                    <TooltipTrigger render={<span />}>{linkContent}</TooltipTrigger>
                    <TooltipContent side="right" className="flex items-center gap-4">
                      {item.label}
                    </TooltipContent>
                  </Tooltip>
                );
              }

              return <div key={item.href}>{linkContent}</div>;
            })}
          </nav>
        </div>
      </div>
    </TooltipProvider>
  );
}
