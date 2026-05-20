"use client";

import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTheme } from "next-themes";
import type { Session } from "next-auth";
import {
  LogOut,
  User,
  Settings,
  Sun,
  Moon,
  ChevronDown,
  Store,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Derive initials from name or email
function getInitials(name?: string | null, email?: string | null): string {
  if (name) {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }
  if (email) return email[0].toUpperCase();
  return "U";
}

// Map global role to a badge label
function getRoleBadge(globalRole?: string | null, activeRole?: string | null) {
  if (globalRole === "SUPER_ADMIN") return { label: "Super Admin", color: "text-violet-500" };
  if (activeRole === "SUPER_ADMIN") return { label: "Super Admin", color: "text-violet-500" };
  if (activeRole === "CASHIER") return { label: "Cashier", color: "text-sky-500" };
  if (activeRole === "INVENTORY") return { label: "Inventory", color: "text-emerald-500" };
  return { label: "User", color: "text-muted-foreground" };
}

export function UserMenu({ session }: { session: Session | null }) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const user = session?.user;
  const isSuperAdmin = user?.globalRole === "SUPER_ADMIN";
  
  const initials = getInitials(user?.name, user?.email);
  const { label: roleLabel, color: roleColor } = getRoleBadge(
    user?.globalRole,
    user?.activeRole
  );
  const activeBranch = user?.availableShops?.find(
    (s) => s.shopId === user?.activeShopId
  );

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOut({
        redirect: false, // We handle redirect manually for cleaner UX
      });
      // Force a full navigation to ensure all client state is cleared
      router.push("/login");
      router.refresh();
    } catch (err) {
      console.error("Sign out error:", err);
      setIsSigningOut(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={isSigningOut}
        render={
          <button
            type="button"
            aria-label="User account menu"
            className={cn(
              "flex items-center gap-2.5 rounded-full pl-1 pr-3 py-1",
              "border border-border/60 bg-background/80 backdrop-blur-sm",
              "hover:bg-accent hover:border-border transition-all duration-200",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              "disabled:pointer-events-none disabled:opacity-50"
            )}
          />
        }
      >
        {/* Avatar */}
        <Avatar size="sm" className="ring-2 ring-primary/20">
          {user?.image && <AvatarImage src={user.image} alt={user.name ?? "User"} />}
          <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
            {initials}
          </AvatarFallback>
        </Avatar>

        {/* Name + chevron (hidden on mobile) */}
        <span className="hidden sm:flex items-center gap-1.5">
          <span className="text-sm font-semibold text-foreground leading-none">
            {user?.name?.split(" ")[0] ?? user?.email?.split("@")[0] ?? "User"}
          </span>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </span>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-[260px]" sideOffset={8}>
        {/* User identity header */}
        <DropdownMenuGroup>
          <DropdownMenuLabel>
            <div className="flex items-center gap-3 py-1">
              <Avatar size="lg" className="ring-2 ring-primary/20 shrink-0">
                {user?.image && <AvatarImage src={user.image} alt={user.name ?? ""} />}
                <AvatarFallback className="bg-primary/10 text-primary font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="font-semibold text-sm text-foreground truncate">
                  {user?.name ?? "User"}
                </span>
                <span className="text-xs text-muted-foreground truncate">
                  {user?.email}
                </span>
                <span className={cn("text-[10px] font-bold uppercase tracking-wider mt-0.5", roleColor)}>
                  {roleLabel}
                </span>
              </div>
            </div>
          </DropdownMenuLabel>
        </DropdownMenuGroup>

        {/* Active branch info */}
        {(activeBranch || (user?.globalRole === "SUPER_ADMIN" && user?.activeShopId === "ALL")) && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuLabel>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Store className="h-3.5 w-3.5 shrink-0" />
                  <span className="text-xs font-medium truncate">
                    Active: {user?.activeShopId === "ALL" ? "All Branches" : activeBranch?.shopName}
                  </span>
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
          </>
        )}

        <DropdownMenuSeparator />

        {/* Account actions */}
        <DropdownMenuGroup>
          <DropdownMenuLabel>Account</DropdownMenuLabel>
          {isSuperAdmin && (
            <DropdownMenuItem
              onClick={() => router.push("/profile")}
              className="gap-2.5 cursor-pointer"
            >
              <User className="h-4 w-4 text-muted-foreground" />
              <span>Profile (Admin Panel)</span>
            </DropdownMenuItem>
          )}
          {isSuperAdmin && (
            <DropdownMenuItem
              onClick={() => router.push("/settings")}
              className="gap-2.5 cursor-pointer"
            >
              <Settings className="h-4 w-4 text-muted-foreground" />
              <span>Settings</span>
            </DropdownMenuItem>
          )}
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        {/* Theme picker */}
        <DropdownMenuGroup>
          <DropdownMenuLabel>Appearance</DropdownMenuLabel>
          <DropdownMenuItem
            onClick={() => setTheme("light")}
            className={cn("gap-2.5 cursor-pointer", theme === "light" && "text-primary")}
          >
            <Sun className="h-4 w-4 text-muted-foreground" />
            <span>Light</span>
            {theme === "light" && <span className="ml-auto text-[10px] font-bold text-primary">✓</span>}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setTheme("dark")}
            className={cn("gap-2.5 cursor-pointer", theme === "dark" && "text-primary")}
          >
            <Moon className="h-4 w-4 text-muted-foreground" />
            <span>Dark</span>
            {theme === "dark" && <span className="ml-auto text-[10px] font-bold text-primary">✓</span>}
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        {/* Sign out */}
        <DropdownMenuGroup>
          <DropdownMenuItem
            onClick={handleSignOut}
            className="gap-2.5 cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
          >
            <LogOut className="h-4 w-4" />
            <span>{isSigningOut ? "Signing out…" : "Sign Out"}</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
