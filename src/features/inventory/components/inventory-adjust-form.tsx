"use client";

import { useState, useTransition } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { stockAdjustment, stockIn, stockOut } from "@/features/inventory/actions";
import { stockMovementCreateSchema } from "@/features/inventory/schemas";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

const schema = stockMovementCreateSchema;
type FormValues = z.infer<typeof schema>;

type ProductOption = { id: string; name: string; sku: string; stockQty: number };

export function InventoryAdjustForm({ products }: { products: ProductOption[] }) {
  const [pending, startTransition] = useTransition();
  const [tab, setTab] = useState<"in" | "out" | "adjust">("in");

  const form = useForm<FormValues>({
    resolver: zodResolver(schema) as any,
    defaultValues: { productId: "", quantity: 1, note: "" },
  });

  async function submit(values: FormValues) {
    startTransition(async () => {
      if (tab === "in") await stockIn(values);
      if (tab === "out") await stockOut(values);
      if (tab === "adjust") await stockAdjustment(values);
      form.reset({ productId: values.productId, quantity: 1, note: "" });
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Stock adjustment</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs
          value={tab}
          onValueChange={(v) => {
            if (v === "in" || v === "out" || v === "adjust") setTab(v);
          }}
        >
          <TabsList>
            <TabsTrigger value="in">Stock in</TabsTrigger>
            <TabsTrigger value="out">Stock out</TabsTrigger>
            <TabsTrigger value="adjust">Adjustment (+)</TabsTrigger>
          </TabsList>

          <TabsContent value={tab} className="pt-4">
            <form onSubmit={form.handleSubmit(submit as any)} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label>Product</Label>
                <Select
                  value={form.watch("productId")}
                  onValueChange={(v) => form.setValue("productId", v || "")}
                  disabled={pending}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a product" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} ({p.sku}) — stock: {p.stockQty}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.productId?.message ? (
                  <p className="text-sm text-destructive">{form.formState.errors.productId.message}</p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity</Label>
                <Input id="quantity" type="number" disabled={pending} {...form.register("quantity")} />
                {form.formState.errors.quantity?.message ? (
                  <p className="text-sm text-destructive">{form.formState.errors.quantity.message}</p>
                ) : null}
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="note">Note (optional)</Label>
                <Textarea id="note" disabled={pending} {...form.register("note")} />
              </div>

              <div className="sm:col-span-2 flex justify-end">
                <Button type="submit" disabled={pending}>
                  {pending ? "Saving..." : "Save"}
                </Button>
              </div>
            </form>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

