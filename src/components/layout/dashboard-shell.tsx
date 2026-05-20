"use client";

import { useState, useEffect } from "react";
import type { Session } from "next-auth";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { UserMenu } from "@/components/user-menu";
import { Menu, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function DashboardShell({ session, children }: { session: Session | null; children: React.ReactNode }) {
  const [isMobile, setIsMobile] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(true);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) setIsCollapsed(false);
      else setIsCollapsed(true);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  return (
    <div
      className={cn(
        "min-h-screen bg-muted/20 transition-all duration-300",
        !isMobile && (isCollapsed ? "grid grid-cols-[80px_1fr]" : "grid grid-cols-[260px_1fr]")
      )}
    >
      {/* Mobile Backdrop */}
      {isMobile && !isCollapsed && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
          onClick={() => setIsCollapsed(true)}
        />
      )}

      <aside
        className={cn(
          "border-r bg-sidebar text-sidebar-foreground flex flex-col transition-all duration-300 z-50",
          isMobile ? "fixed inset-y-0 left-0 w-[260px] transform shadow-2xl" : "sticky top-0 h-screen overflow-y-auto",
          isMobile && isCollapsed && "-translate-x-full"
        )}
      >
        <SidebarNav
          session={session}
          isCollapsed={!isMobile && isCollapsed}
          setIsCollapsed={setIsCollapsed}
        />
      </aside>

      {/* Main content area */}
      <div className="flex flex-col min-w-0 min-h-screen">
        {/* ─── Top Header ─────────────────────────────────────────── */}
        <header className="border-b bg-background/95 backdrop-blur-sm sticky top-0 z-10 supports-[backdrop-filter]:bg-background/60">
          <div className="flex items-center justify-between px-4 sm:px-6 h-14">
            {/* Left: hamburger (mobile) + brand */}
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="md:hidden h-8 w-8"
                aria-label="Toggle sidebar"
              >
                <Menu className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-2 hidden md:flex">
                <div className="bg-primary rounded-md p-1 flex items-center justify-center">
                  <LayoutDashboard className="h-4 w-4 text-primary-foreground" />
                </div>
                <span className="font-bold text-base tracking-tight text-foreground">
                  DI-CMS
                </span>
              </div>
            </div>

            {/* Right: user menu */}
            <UserMenu session={session} />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 sm:p-6 overflow-auto bg-muted/20">
          <div className="mx-auto max-w-6xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
