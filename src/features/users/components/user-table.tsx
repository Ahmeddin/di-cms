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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MoreHorizontal, Pencil, Trash2, Key, ShieldCheck } from "lucide-react";
import { format } from "date-fns";
import { deleteUser } from "../actions";
import { UserDialog } from "./user-dialog";

interface UserTableProps {
  users: any[];
  branches: any[];
}

export function UserTable({ users: initialUsers, branches }: UserTableProps) {
  const [editingUser, setEditingUser] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const handleEdit = (user: any) => {
    setEditingUser(user);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this user? This action cannot be undone.")) return;
    
    startTransition(async () => {
      const res = await deleteUser(id);
      if (res.success) {
        toast.success("User deleted successfully");
      } else {
        toast.error(res.error);
      }
    });
  };

  return (
    <div className="rounded-md border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[250px]">User</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Branches</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Joined</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {initialUsers.map((user) => (
            <TableRow key={user.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs">
                      {user.name?.split(" ").map((n: string) => n[0]).join("").toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{user.name}</span>
                    <span className="text-xs text-muted-foreground">{user.email}</span>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="flex w-fit items-center gap-1 font-normal">
                  <ShieldCheck className="h-3 w-3 text-primary" />
                  {user.shopMemberships?.[0]?.role?.name || "No Role"}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1 max-w-[200px]">
                  {user.shopMemberships?.map((m: any) => (
                    <Badge key={m.shopId} variant="secondary" className="text-[10px] px-1 py-0 h-4">
                      {m.shop.name}
                    </Badge>
                  ))}
                  {(!user.shopMemberships || user.shopMemberships.length === 0) && (
                    <span className="text-xs text-muted-foreground italic">No branches</span>
                  )}
                </div>
              </TableCell>
              <TableCell>
                {user.isActive ? (
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Active</Badge>
                ) : (
                  <Badge variant="destructive" className="bg-destructive/10 text-destructive border-destructive/20">Inactive</Badge>
                )}
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {format(new Date(user.createdAt), "MMM dd, yyyy")}
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    }
                  />
                  <DropdownMenuContent align="end" className="w-[160px]">
                    <DropdownMenuGroup>
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => handleEdit(user)}>
                        <Pencil className="mr-2 h-4 w-4" /> Edit Details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleEdit(user)}>
                        <Key className="mr-2 h-4 w-4" /> Reset Password
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                        onClick={() => handleDelete(user.id)}
                        disabled={pending}
                      >
                        <Trash2 className="mr-2 h-4 w-4" /> Delete User
                      </DropdownMenuItem>
                    </DropdownMenuGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
          {initialUsers.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                No users found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <UserDialog 
        user={editingUser} 
        branches={branches} 
        open={isDialogOpen} 
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) setEditingUser(null);
        }}
      />
    </div>
  );
}
