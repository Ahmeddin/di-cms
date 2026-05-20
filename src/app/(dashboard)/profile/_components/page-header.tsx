"use client";

import { useState } from "react";
import { Shield, UserPlus, PlusCircle, UserCog } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserDialog } from "@/features/users/components/user-dialog";
import { BranchDialog } from "./branch-dialog";

interface AdminPageHeaderProps {
  branches: any[];
  currentUser?: any;
}

export function AdminPageHeader({ branches, currentUser }: AdminPageHeaderProps) {
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [isBranchDialogOpen, setIsBranchDialogOpen] = useState(false);
  const [isSelfDialogOpen, setIsSelfDialogOpen] = useState(false);

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b pb-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Shield className="h-8 w-8 text-primary" />
          Admin Control Panel
        </h1>
        <p className="text-muted-foreground">Manage users, roles, and branch access across your organization.</p>
      </div>
      
      <div className="flex items-center gap-2">
        {currentUser && (
          <Button 
            variant="secondary" 
            size="sm" 
            className="gap-2"
            onClick={() => setIsSelfDialogOpen(true)}
          >
            <UserCog className="h-4 w-4" />
            Edit My Profile
          </Button>
        )}
        <Button 
          variant="outline" 
          size="sm" 
          className="gap-2"
          onClick={() => setIsBranchDialogOpen(true)}
        >
          <PlusCircle className="h-4 w-4" />
          Create Branch
        </Button>
        <Button 
          size="sm" 
          className="gap-2"
          onClick={() => setIsUserDialogOpen(true)}
        >
          <UserPlus className="h-4 w-4" />
          Add User
        </Button>
      </div>

      {currentUser && (
        <UserDialog 
          user={currentUser}
          branches={branches}
          open={isSelfDialogOpen}
          onOpenChange={setIsSelfDialogOpen}
        />
      )}
      <UserDialog 
        branches={branches}
        open={isUserDialogOpen}
        onOpenChange={setIsUserDialogOpen}
      />
      <BranchDialog 
        open={isBranchDialogOpen}
        onOpenChange={setIsBranchDialogOpen}
      />
    </div>
  );
}
