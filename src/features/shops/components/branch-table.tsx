"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Pencil, Trash2, Store, Users } from "lucide-react";
import { format } from "date-fns";
import { createBranch, updateBranch, deleteBranch } from "../actions";

interface BranchTableProps {
  branches: any[];
}

export function BranchTable({ branches }: BranchTableProps) {
  const [editingBranch, setEditingBranch] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [pending, startTransition] = useTransition();

  const handleEdit = (branch: any) => {
    setEditingBranch(branch);
    setNewName(branch.name);
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!newName) return;
    
    startTransition(async () => {
      const res = editingBranch 
        ? await updateBranch(editingBranch.id, newName)
        : await createBranch(newName);

      if (res.success) {
        toast.success(editingBranch ? "Branch updated" : "Branch created");
        setIsDialogOpen(false);
        setEditingBranch(null);
        setNewName("");
      } else {
        toast.error((res as any).error || "Failed to save branch");
      }
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure? This will delete the branch and all associated data if not restricted.")) return;
    
    startTransition(async () => {
      const res = await deleteBranch(id);
      if (res.success) {
        toast.success("Branch deleted");
      } else {
        toast.error((res as any).error || "Failed to delete branch");
      }
    });
  };

  return (
    <div className="rounded-md border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[300px]">Branch Name</TableHead>
            <TableHead>Active Users</TableHead>
            <TableHead>Created At</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {branches.map((branch) => (
            <TableRow key={branch.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Store className="h-4 w-4 text-primary" />
                  </div>
                  <span className="font-medium">{branch.name}</span>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1.5 text-sm">
                  <Users className="h-3.5 w-3.5 text-muted-foreground" />
                  {branch._count?.members || 0} users
                </div>
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {format(new Date(branch.createdAt), "MMM dd, yyyy")}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(branch)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => handleDelete(branch.id)}
                    disabled={pending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>{editingBranch ? "Edit Branch" : "Create New Branch"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="branch-name">Branch Name</Label>
              <Input 
                id="branch-name" 
                value={newName} 
                onChange={(e) => setNewName(e.target.value)} 
                placeholder="e.g. Lagos Mainland Branch"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={pending || !newName}>
              {pending ? "Saving..." : editingBranch ? "Update Branch" : "Create Branch"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Expose method to trigger new branch creation from parent */}
      <Button 
        className="hidden" 
        id="trigger-create-branch" 
        onClick={() => {
          setEditingBranch(null);
          setNewName("");
          setIsDialogOpen(true);
        }}
      />
    </div>
  );
}
