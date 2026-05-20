"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createBranch } from "@/features/shops/actions";

interface BranchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BranchDialog({ open, onOpenChange }: BranchDialogProps) {
  const [name, setName] = useState("");
  const [pending, startTransition] = useTransition();

  const handleSave = async () => {
    if (!name || name.length < 2) {
      toast.error("Branch name is too short");
      return;
    }
    
    startTransition(async () => {
      const res = await createBranch(name);
      if (res.success) {
        toast.success("Branch created successfully");
        onOpenChange(false);
        setName("");
      } else {
        toast.error((res as any).error || "Failed to create branch");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Create New Branch</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="header-branch-name">Branch Name</Label>
            <Input 
              id="header-branch-name" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              placeholder="e.g. Mainland Branch"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={pending || !name}>
            {pending ? "Creating..." : "Create Branch"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
