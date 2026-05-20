"use client";

import { useMemo, useState, useTransition } from "react";
import type { Category, Product } from "@/generated/prisma/client";
import { Pencil, Trash2 } from "lucide-react";

import { deleteProduct } from "@/features/products/actions";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ProductDialog } from "@/features/products/components/product-dialog";
import { formatPrice } from "@/lib/utils";

type ProductRow = Product & { category?: Category | null; shop?: { name: string } | null };

export function ProductTable({
  products,
  categories,
  isGlobal,
  currency = "USD",
}: {
  products: ProductRow[];
  categories: Category[];
  isGlobal?: boolean;
  currency?: string;
}) {
  const [editing, setEditing] = useState<ProductRow | null>(null);
  const [pending, startTransition] = useTransition();

  const categoryById = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of categories) m.set(c.id, c.name);
    return m;
  }, [categories]);

  return (
    <div className="space-y-4">
      {!isGlobal && (
        <div className="flex justify-end">
          <ProductDialog categories={categories} />
        </div>
      )}

      <ProductDialog
        open={!!editing}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
        categories={categories}
        product={editing}
      />

      <div className="rounded-md border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Category</TableHead>
              {isGlobal && <TableHead>Branch</TableHead>}
              <TableHead className="text-right">Stock</TableHead>
              <TableHead className="text-right">Reorder</TableHead>
              <TableHead className="text-right">Selling</TableHead>
              <TableHead>Status</TableHead>
              {!isGlobal && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.name}</TableCell>
                <TableCell>{p.sku}</TableCell>
                <TableCell>{p.categoryId ? categoryById.get(p.categoryId) ?? "—" : "—"}</TableCell>
                {isGlobal && (
                  <TableCell>
                    <Badge variant="outline" className="text-xs bg-muted/50">{p.shop?.name || "Unknown"}</Badge>
                  </TableCell>
                )}
                <TableCell className="text-right tabular-nums">{p.stockQty}</TableCell>
                <TableCell className="text-right tabular-nums">{p.reorderLevel}</TableCell>
                <TableCell className="text-right tabular-nums">{formatPrice(Number(p.sellingPrice), currency)}</TableCell>
                <TableCell>
                  {p.isActive ? <Badge variant="secondary">Active</Badge> : <Badge variant="outline">Inactive</Badge>}
                </TableCell>
                {!isGlobal && (
                  <TableCell className="text-right">
                    <div className="inline-flex gap-2">
                      <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditing(p)}
                      disabled={pending}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() =>
                        startTransition(async () => {
                          await deleteProduct(p.id);
                        })
                      }
                      disabled={pending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
                )}
              </TableRow>
            ))}
            {products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isGlobal ? 9 : 8} className="py-10 text-center text-muted-foreground">
                  No products yet.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

