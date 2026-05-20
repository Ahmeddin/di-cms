import { Suspense } from "react";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession, getShopScope } from "@/lib/session";
import { requireRole } from "@/lib/rbac";
import { ProductTable } from "@/features/products/components/product-table";
import { TableSkeleton } from "@/components/skeletons";
import { GlobalBanner } from "@/components/global-banner";
import { convertFromBase } from "@/lib/currency";

export const metadata = {
  title: "Products | DI-CMS",
  description: "Manage your product catalog.",
};

// ─── Page Shell — renders INSTANTLY ─────────────────────────────────────────
export default async function ProductsPage() {
  try {
    await requireRole(["SUPER_ADMIN", "INVENTORY"]);
  } catch (err) {
    redirect("/");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Products</h1>
          <p className="text-sm text-muted-foreground">
            Manage your product catalog and pricing.
          </p>
        </div>
      </div>

      <Suspense fallback={<TableSkeleton rows={8} cols={5} />}>
        <ProductsData />
      </Suspense>
    </div>
  );
}

// ─── Async Data Component — loads in background ──────────────────────────────
async function ProductsData() {
  const session = await getSession();
  const { whereShop, isGlobal } = getShopScope(session);

  if (!session?.user?.activeShopId) {
    return <p className="text-muted-foreground">Unauthorized.</p>;
  }

  const [products, categories] = await Promise.all([
    prisma.product.findMany({
      where: whereShop,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        shopId: true,
        categoryId: true,
        name: true,
        sku: true,
        barcode: true,
        costPrice: true,
        sellingPrice: true,
        stockQty: true,
        reorderLevel: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        shop: { select: { name: true } },
      },
      take: 100,
    }),
    prisma.category.findMany({
      where: whereShop,
      select: {
        id: true,
        shopId: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { name: "asc" },
    }),
  ]);

  const org = await prisma.organization.findUnique({
    where: { id: session.user.organizationId! },
    select: { currency: true },
  });
  const displayCurrency = org?.currency || "USD";

  const serializedProducts = products.map((p) => ({
    ...p,
    costPrice: convertFromBase(p.costPrice.toString(), displayCurrency),
    sellingPrice: convertFromBase(p.sellingPrice.toString(), displayCurrency),
  }));

  return (
    <>
      {isGlobal && <GlobalBanner />}
      <ProductTable products={serializedProducts as any} categories={categories} isGlobal={isGlobal} currency={displayCurrency} />
    </>
  );
}
