import { Suspense } from "react";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession, getShopScope } from "@/lib/session";
import { requireRole } from "@/lib/rbac";
import { InventoryAdjustForm } from "@/features/inventory/components/inventory-adjust-form";
import { TableSkeleton } from "@/components/skeletons";
import { Skeleton } from "@/components/ui/skeleton";
import { GlobalBanner } from "@/components/global-banner";

export const metadata = {
  title: "Inventory | DI-CMS",
  description: "Manage stock levels and adjustments.",
};

export default async function InventoryPage() {
  try {
    await requireRole(["SUPER_ADMIN", "INVENTORY"]);
  } catch (err) {
    redirect("/");
  }

  const session = await getSession();
  const { isGlobal } = getShopScope(session);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Inventory</h1>
          <p className="text-sm text-muted-foreground">
            Manage stock levels and view historical movements.
          </p>
        </div>
      </div>

      {isGlobal && <GlobalBanner />}

      {!isGlobal && (
        <Suspense fallback={<Skeleton className="h-20 w-full rounded-lg" />}>
          <InventoryForm />
        </Suspense>
      )}

      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Recent stock movements</h2>
        <Suspense fallback={<TableSkeleton rows={5} cols={5} />}>
          <MovementsTable />
        </Suspense>
      </div>
    </div>
  );
}

// ─── Adjust Form Component ───────────────────────────────────────────────────
async function InventoryForm() {
  const session = await getSession();
  const shopId = session?.user.activeShopId;

  if (!shopId) return null;

  const products = await prisma.product.findMany({
    where: { shopId, isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, sku: true, stockQty: true },
    take: 500,
  });

  return <InventoryAdjustForm products={products} />;
}

// ─── Movements Table Component ───────────────────────────────────────────────
async function MovementsTable() {
  const session = await getSession();
  const { whereShop, isGlobal } = getShopScope(session);

  if (!session?.user?.activeShopId) return null;

  const movements = await prisma.stockMovement.findMany({
    where: whereShop,
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      product: { select: { name: true, sku: true } },
      createdBy: { select: { email: true } },
      shop: { select: { name: true } },
    },
  });

  if (movements.length === 0) {
    return (
      <div className="rounded-md border px-4 py-10 text-center text-sm text-muted-foreground">
        No stock movements yet.
      </div>
    );
  }

  return (
    <div className="rounded-md border overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr className="text-left">
            <th className="px-4 py-2">When</th>
            <th className="px-4 py-2">Product</th>
            {isGlobal && <th className="px-4 py-2">Branch</th>}
            <th className="px-4 py-2">Type</th>
            <th className="px-4 py-2 text-right">Delta</th>
            <th className="px-4 py-2">By</th>
          </tr>
        </thead>
        <tbody>
          {movements.map((m) => (
            <tr key={m.id} className="border-t">
              <td className="px-4 py-2 whitespace-nowrap">
                {m.createdAt.toLocaleString()}
              </td>
              <td className="px-4 py-2">
                {m.product.name} ({m.product.sku})
              </td>
              {isGlobal && (
                <td className="px-4 py-2 text-muted-foreground">{m.shop.name}</td>
              )}
              <td className="px-4 py-2">{m.type}</td>
              <td className="px-4 py-2 text-right tabular-nums">
                {m.quantityDelta}
              </td>
              <td className="px-4 py-2">{m.createdBy.email ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
