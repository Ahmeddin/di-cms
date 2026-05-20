"use client";

import * as React from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ShieldAlert, UserPlus, Save, X, AlertCircle } from "lucide-react";

import { userUpsertSchema, type UserUpsertInput } from "../schemas";
import { upsertUser } from "../actions";
import { RoleName } from "@/generated/prisma/enums";
import { useSession } from "next-auth/react";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface UserDialogProps {
  user?: any;
  branches: any[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UserDialog({ user, branches, open, onOpenChange }: UserDialogProps) {
  const [isPending, startTransition] = React.useTransition();
  const { data: session, update } = useSession();

  const form = useForm<UserUpsertInput>({
    resolver: zodResolver(userUpsertSchema),
    defaultValues: {
      id: undefined,
      name: "",
      email: "",
      password: "",
      role: RoleName.CASHIER,
      shopIds: [],
      isActive: true,
    },
  });

  const isSuperAdmin = user?.globalRole === "SUPER_ADMIN";

  // Reset form when user or open state changes
  React.useEffect(() => {
    if (open) {
      form.reset({
        id: user?.id || undefined,
        name: user?.name || "",
        email: user?.email || "",
        password: "",
        role: isSuperAdmin ? undefined : (user?.shopMemberships?.[0]?.role?.name as RoleName) || RoleName.CASHIER,
        shopIds: isSuperAdmin ? [] : user?.shopMemberships?.map((m: any) => m.shopId) || [],
        isActive: user?.isActive !== false,
      });
    }
  }, [user, open, form, isSuperAdmin]);

  const onSubmit = async (data: UserUpsertInput) => {
    startTransition(async () => {
      try {
        const result = await upsertUser(data);
        if (result.success) {
          toast.success(user ? "User updated" : "User created");
          
          // Trigger next-auth session updates if we just updated ourselves
          if (session?.user?.id && data.id === session.user.id) {
            await update({
              name: data.name,
              email: data.email,
            });
            window.location.reload();
          }

          onOpenChange(false);
          form.reset();
        } else {
          toast.error(("error" in result ? result.error as string : null) || "Failed to save user");
        }
      } catch (err) {
        toast.error("An unexpected error occurred");
      }
    });
  };

  const errorFields = Object.keys(form.formState.errors);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {user ? <Save className="h-5 w-5" /> : <UserPlus className="h-5 w-5" />}
            {user ? "Edit User Account" : "Add New User"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">
          {errorFields.length > 0 && (
            <Alert variant="destructive" className="py-2 px-3">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Please check: {errorFields.map(f => f.charAt(0).toUpperCase() + f.slice(1)).join(", ")}
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="user-name">Full Name</Label>
              <Input
                id="user-name"
                {...form.register("name")}
                placeholder="John Doe"
                disabled={isPending}
              />
              {form.formState.errors.name && (
                <span className="text-[10px] text-destructive">{form.formState.errors.name.message}</span>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="user-email">Email Address</Label>
              <Input
                id="user-email"
                type="email"
                {...form.register("email")}
                placeholder="john@example.com"
                disabled={isPending}
              />
              {form.formState.errors.email && (
                <span className="text-[10px] text-destructive">{form.formState.errors.email.message}</span>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="user-password">
                {user ? "New Password (optional)" : "Password"}
              </Label>
              <Input
                id="user-password"
                type="password"
                {...form.register("password")}
                placeholder="••••••••"
                disabled={isPending}
              />
              {form.formState.errors.password && (
                <span className="text-[10px] text-destructive">{form.formState.errors.password.message}</span>
              )}
            </div>

            <div className="flex items-center justify-between gap-4">
              <Controller
                name="isActive"
                control={form.control}
                render={({ field }) => (
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="user-active"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={isPending || user?.id === session?.user?.id}
                    />
                    <Label htmlFor="user-active" className="text-sm font-medium cursor-pointer">
                      Active Account
                    </Label>
                  </div>
                )}
              />
            </div>

            {isSuperAdmin ? (
                <div className="rounded-lg bg-white/10 backdrop-blur-md border border-violet-500/30 p-4 text-xs text-violet-500 space-y-1 animate-fade-in">
                  <span className="font-semibold block text-[13px]">Super Admin Account</span>
                  <p className="text-muted-foreground leading-relaxed">Super Admins have full access to all branches, logs, and settings.</p>
                  <p className="text-muted-foreground text-[11px]">Role selection and branch-specific permissions do not apply.</p>
                </div>
              ) : (
              <>
                <div className="space-y-2">
                  <Label>System Role</Label>
                  <Controller
                    name="role"
                    control={form.control}
                    render={({ field }) => (
                      <Select 
                        disabled={isPending} 
                        onValueChange={field.onChange} 
                        value={field.value}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={RoleName.CASHIER}>Cashier</SelectItem>
                          <SelectItem value={RoleName.INVENTORY}>Inventory</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Branch Access</Label>
                  <Controller
                    name="shopIds"
                    control={form.control}
                    render={({ field }) => (
                      <ScrollArea className="h-[120px] rounded-md border p-4">
                        <div className="grid grid-cols-2 gap-4">
                          {branches.map((branch) => (
                            <div key={branch.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={`shop-${branch.id}`}
                                checked={field.value?.includes(branch.id)}
                                onCheckedChange={(checked) => {
                                  const val = field.value || [];
                                  if (checked) {
                                    field.onChange([...val, branch.id]);
                                  } else {
                                    field.onChange(val.filter(id => id !== branch.id));
                                  }
                                }}
                                disabled={isPending}
                              />
                              <Label 
                                htmlFor={`shop-${branch.id}`} 
                                className="text-xs font-normal truncate cursor-pointer"
                              >
                                {branch.name}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    )}
                  />
                </div>
              </>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : user ? "Update User" : "Create User"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
