import { Suspense } from "react";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { getSession, getShopScope } from "@/lib/session";
import { CustomerTable } from "@/features/customers/components/customer-table";
import { TableSkeleton } from "@/components/skeletons";
import { GlobalBanner } from "@/components/global-banner";
import { convertFromBase } from "@/lib/currency";

export const metadata = {
  title: "Customers | DI-CMS",
  description: "Manage your customers and credit accounts.",
};

// ─── Page Shell — renders INSTANTLY ─────────────────────────────────────────
export default async function CustomersPage() {
  try {
    await requireRole(["SUPER_ADMIN", "CASHIER", "INVENTORY"]);
  } catch (err) {
    redirect("/");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Customers</h1>
          <p className="text-sm text-muted-foreground">
            Manage customer profiles, contact info, and track credit balances.
          </p>
        </div>
      </div>

      <Suspense fallback={<TableSkeleton rows={7} cols={5} />}>
        <CustomersData />
      </Suspense>
    </div>
  );
}

// ─── Async Data Component — loads in background ──────────────────────────────
async function CustomersData() {
  const session = await getSession();
  const { whereShop, isGlobal } = getShopScope(session);

  if (!session?.user?.activeShopId) {
    return <p className="text-muted-foreground">Unauthorized.</p>;
  }

  const customers = await prisma.customer.findMany({
    where: whereShop,
    select: {
      id: true,
      shopId: true,
      fullName: true,
      phone: true,
      address: true,
      isActive: true,
      creditLimit: true,
      createdAt: true,
      updatedAt: true,
      shop: { select: { name: true } },
      creditAccount: {
        select: {
          id: true,
          outstandingBalance: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const org = await prisma.organization.findUnique({
    where: { id: session.user.organizationId! },
    select: { currency: true },
  });
  const displayCurrency = org?.currency || "USD";

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

  const activeRole = session?.user?.activeRole;
  const isSuperAdmin = session?.user?.globalRole === "SUPER_ADMIN";

  return (
    <>
      {isGlobal && <GlobalBanner />}
      <CustomerTable 
        customers={serializedCustomers as any} 
        isGlobal={isGlobal} 
        currency={displayCurrency} 
        activeRole={activeRole}
        isSuperAdmin={isSuperAdmin}
      />
    </>
  );
}
