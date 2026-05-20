import { Suspense } from "react";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { getSession, getShopScope } from "@/lib/session";
import { PosInterface } from "@/features/sales/components/pos-interface";
import { PosSkeleton } from "@/components/skeletons";
import { GlobalBanner } from "@/components/global-banner";
import { convertFromBase } from "@/lib/currency";

export const metadata = {
  title: "Point of Sale | DI-CMS",
  description: "Create new sales and checkout.",
};

// ─── Page Shell — renders INSTANTLY ─────────────────────────────────────────
export default async function SalesPage() {
  try {
    await requireRole(["SUPER_ADMIN", "CASHIER"]);
  } catch (err) {
    redirect("/");
  }

  return (
    <div className="space-y-2 h-[calc(100vh-65px)]">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Point of Sale</h1>
      </div>

      <Suspense fallback={<PosSkeleton />}>
        <SalesData />
      </Suspense>
    </div>
  );
}

// ─── Async Data Component — loads in background ──────────────────────────────
async function SalesData() {
  const session = await getSession();
  const { whereShop, isGlobal } = getShopScope(session);

  if (!session?.user?.activeShopId) {
    return <p className="text-muted-foreground">Unauthorized.</p>;
  }

  if (isGlobal) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
        <GlobalBanner />
        <p className="text-muted-foreground text-center max-w-md">
          The Point of Sale interface requires a specific physical branch to process transactions. 
          Please select a branch from the top-right menu to continue.
        </p>
      </div>
    );
  }

  const [products, customers] = await Promise.all([
    prisma.product.findMany({
      where: { ...whereShop, isActive: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        sku: true,
        sellingPrice: true,
        costPrice: true,
        stockQty: true,
        categoryId: true,
      },
    }),
    prisma.customer.findMany({
      where: { ...whereShop, isActive: true },
      select: {
        id: true,
        fullName: true,
        phone: true,
        creditLimit: true,
        creditAccount: {
          select: { outstandingBalance: true },
        },
      },
      orderBy: { fullName: "asc" },
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

  const serializedCustomers = customers.map((c) => ({
    ...c,
    creditLimit: c.creditLimit ? convertFromBase(c.creditLimit.toString(), displayCurrency) : null,
    creditAccount: c.creditAccount
      ? {
          ...c.creditAccount,
          outstandingBalance: convertFromBase(c.creditAccount.outstandingBalance.toString(), displayCurrency),
        }
      : null,
  }));

  return (
    <PosInterface
      products={serializedProducts as any}
      customers={serializedCustomers as any}
      currency={displayCurrency}
    />
  );
}
