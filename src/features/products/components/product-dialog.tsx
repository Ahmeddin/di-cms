"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import type { Category, Product } from "@/generated/prisma/client";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { upsertProduct } from "@/features/products/actions";
import { productUpsertSchema, type ProductUpsertInput } from "@/features/products/schemas";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

const formSchema = productUpsertSchema.extend({
  stockQty: z.coerce.number().int().nonnegative(),
});

type FormValues = z.infer<typeof formSchema>;

export function ProductDialog({
  product,
  categories,
  open,
  onOpenChange,
}: {
  product?: Product | null;
  categories: Category[];
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = typeof open === "boolean";
  const isOpen = isControlled ? open : internalOpen;

  const setOpen = (v: boolean) => {
    if (!isControlled) setInternalOpen(v);
    onOpenChange?.(v);
  };

  const [pending, startTransition] = useTransition();

  const defaultValues = useMemo<FormValues>(() => {
    return {
      id: product?.id,
      name: product?.name ?? "",
      sku: product?.sku ?? "",
      barcode: product?.barcode ?? "",
      categoryId: product?.categoryId ?? "",
      costPrice: product ? Number(product.costPrice.toString()) : 0,
      sellingPrice: product ? Number(product.sellingPrice.toString()) : 0,
      stockQty: product?.stockQty ?? 0,
      reorderLevel: product?.reorderLevel ?? 0,
      isActive: product?.isActive ?? true,
    };
  }, [product]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues,
  });

  useEffect(() => {
    form.reset(defaultValues as any);
  }, [defaultValues, form]);

  async function onSubmit(values: FormValues) {
    const payload: ProductUpsertInput = {
      ...values,
      barcode: values.barcode || undefined,
      categoryId: values.categoryId || undefined,
    };

    startTransition(async () => {
      await upsertProduct(payload);
      setOpen(false);
    });
  }

  return (
    <>
      {!product && !isControlled ? (
        <Button onClick={() => setOpen(true)} disabled={pending}>
          Add product
        </Button>
      ) : null}

      <Dialog open={isOpen} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{product ? "Edit product" : "Add product"}</DialogTitle>
          </DialogHeader>

          <form className="grid grid-cols-1 gap-4 sm:grid-cols-2" onSubmit={form.handleSubmit(onSubmit as any)}>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" disabled={pending} {...form.register("name")} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sku">SKU</Label>
              <Input id="sku" disabled={pending} {...form.register("sku")} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="barcode">Barcode (optional)</Label>
              <Input id="barcode" disabled={pending} {...form.register("barcode")} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category (optional)</Label>
              <Select
                value={form.watch("categoryId") || ""}
                onValueChange={(v) => form.setValue("categoryId", v || undefined)}
                disabled={pending}
              >
                <SelectTrigger id="category">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No category</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="costPrice">Cost price</Label>
              <Input id="costPrice" type="number" step="0.01" disabled={pending} {...form.register("costPrice")} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sellingPrice">Selling price</Label>
              <Input
                id="sellingPrice"
                type="number"
                step="0.01"
                disabled={pending}
                {...form.register("sellingPrice")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="stockQty">Stock quantity</Label>
              <Input id="stockQty" type="number" disabled={pending} {...form.register("stockQty")} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reorderLevel">Reorder level</Label>
              <Input id="reorderLevel" type="number" disabled={pending} {...form.register("reorderLevel")} />
            </div>

            <div className="flex items-center gap-2 sm:col-span-2 pt-2">
              <Checkbox
                id="isActive"
                checked={form.watch("isActive")}
                onCheckedChange={(v) => form.setValue("isActive", Boolean(v))}
                disabled={pending}
              />
              <Label htmlFor="isActive">Active</Label>
            </div>

            <DialogFooter className="sm:col-span-2">
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

