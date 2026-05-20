"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, ChevronsUpDown, Store } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Branch {
  id: string;
  name: string;
}

export function BranchSwitcher({ 
  branches, 
  currentShopId,
  isCollapsed 
}: { 
  branches: Branch[];
  currentShopId: string;
  isCollapsed?: boolean;
}) {
  const { update } = useSession();
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  const currentBranch = branches.find(b => b.id === currentShopId) || branches[0];

  const onSelect = async (branchId: string) => {
    if (branchId === currentShopId) return;
    
    console.log(`[BranchSwitcher] Switching to: ${branchId}`);
    setIsPending(true);
    try {
      const updated = await update({ activeShopId: branchId });
      console.log("[BranchSwitcher] Session updated:", updated);
      
      // Full page reload is the most reliable way to ensure all Server and Client 
      // components sync with the new session state without stale prop issues.
      window.location.reload();
    } catch (error) {
      console.error("Failed to switch branch:", error);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <DropdownMenu>
      {/*
        @base-ui's Trigger already renders a <button>.
        Use the `render` prop to delegate rendering to our styled element,
        avoiding the nested <button>-in-<button> hydration error.
      */}
      <DropdownMenuTrigger
        disabled={isPending}
        render={
          <button
            type="button"
            aria-label="Select a branch"
            className={cn(
              "inline-flex items-center justify-between gap-2 px-3 font-semibold",
              "rounded-md border border-input bg-background text-sm shadow-xs",
              "hover:bg-accent hover:text-accent-foreground transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              "disabled:pointer-events-none disabled:opacity-50",
              isCollapsed ? "w-10 px-0 justify-center h-10 rounded-full" : "w-full h-9"
            )}
          />
        }
      >
        {isCollapsed ? (
          <Store className="h-5 w-5 text-muted-foreground" />
        ) : (
          <>
            <div className="flex items-center gap-2 truncate">
              <Store className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="truncate">{currentBranch?.name || "Select Branch"}</span>
            </div>
            <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
          </>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[200px]">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Your Branches</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {branches.map((branch) => (
            <DropdownMenuItem
              key={branch.id}
              onClick={() => {
                console.log("[BranchSwitcher] Item clicked:", branch.id);
                onSelect(branch.id);
              }}
              className="flex items-center justify-between cursor-pointer"
            >
              <span className="truncate">{branch.name}</span>
              {branch.id === currentShopId && (
                <Check className="ml-2 h-4 w-4 text-primary" />
              )}
            </DropdownMenuItem>
          ))}
          {branches.length === 0 && (
            <div className="p-2 text-xs text-muted-foreground text-center">
              No branches found.
            </div>
          )}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
