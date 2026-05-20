"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import type { Customer } from "@/generated/prisma/client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { createCustomer, updateCustomer } from "@/features/customers/actions";
import { customerSchema, type CustomerFormValues } from "@/features/customers/schemas";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";

export function CustomerDialog({
  customer,
  open,
  onOpenChange,
  activeRole,
  isSuperAdmin,
}: {
  customer?: Customer | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  activeRole?: string;
  isSuperAdmin?: boolean;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = typeof open === "boolean";
  const isOpen = isControlled ? open : internalOpen;

  const setOpen = (v: boolean) => {
    if (!isControlled) setInternalOpen(v);
    onOpenChange?.(v);
  };

  const [pending, startTransition] = useTransition();

  const defaultValues = useMemo<CustomerFormValues>(() => {
    return {
      fullName: customer?.fullName ?? "",
      phone: customer?.phone ?? "",
      address: customer?.address ?? "",
      notes: customer?.notes ?? "",
      creditLimit: customer ? Number(customer.creditLimit?.toString() || 0) : 0,
      isActive: customer?.isActive ?? true,
    };
  }, [customer]);

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema) as any,
    defaultValues,
  });

  useEffect(() => {
    form.reset(defaultValues);
  }, [defaultValues, form]);

  async function onSubmit(values: CustomerFormValues) {
    startTransition(async () => {
      let res;
      if (customer?.id) {
        res = await updateCustomer(customer.id, values);
      } else {
        res = await createCustomer(values);
      }

      if (res.success) {
        toast.success(customer ? "Customer updated successfully" : "Customer created successfully");
        setOpen(false);
        if (!customer) {
          form.reset(); // Reset form on successful create
        }
      } else {
        toast.error(res.error || "An error occurred");
      }
    });
  }

  return (
    <>
      {!customer && !isControlled ? (
        <Button onClick={() => setOpen(true)} disabled={pending}>
          Add customer
        </Button>
      ) : null}

      <Dialog open={isOpen} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{customer ? "Edit customer" : "Add customer"}</DialogTitle>
          </DialogHeader>

          <form className="grid gap-4" onSubmit={form.handleSubmit(onSubmit as any)}>
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input id="fullName" placeholder="John Doe" disabled={pending} {...form.register("fullName")} />
              {form.formState.errors.fullName && (
                <p className="text-xs text-destructive">{form.formState.errors.fullName.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input id="phone" type="tel" placeholder="+1234567890" disabled={pending} {...form.register("phone")} />
              {form.formState.errors.phone && (
                <p className="text-xs text-destructive">{form.formState.errors.phone.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address (Optional)</Label>
              <Input id="address" placeholder="123 Main St" disabled={pending} {...form.register("address")} />
              {form.formState.errors.address && (
                <p className="text-xs text-destructive">{form.formState.errors.address.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="creditLimit">Credit Limit</Label>
              <Input
                id="creditLimit"
                type="number"
                step="0.01"
                min="0"
                disabled={pending || (activeRole === "CASHIER" && !isSuperAdmin)}
                {...form.register("creditLimit")}
              />
              {activeRole === "CASHIER" && !isSuperAdmin && (
                <p className="text-[10px] text-muted-foreground">Cashiers are not authorized to modify credit limits.</p>
              )}
              {form.formState.errors.creditLimit && (
                <p className="text-xs text-destructive">{form.formState.errors.creditLimit.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Additional details..."
                disabled={pending}
                className="resize-none"
                {...form.register("notes")}
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <Checkbox
                id="isActive"
                checked={form.watch("isActive")}
                onCheckedChange={(v) => form.setValue("isActive", Boolean(v))}
                disabled={pending}
              />
              <Label htmlFor="isActive">Active Customer</Label>
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
