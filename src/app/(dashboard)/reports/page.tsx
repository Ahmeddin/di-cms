import { Suspense } from "react";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/rbac";
import { getReportsData } from "@/features/reports/actions";
import { getSession, getShopScope } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/utils";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { DollarSign, TrendingUp, Users, Package, AlertCircle } from "lucide-react";
import { CardGridSkeleton, TableSkeleton } from "@/components/skeletons";
import { Skeleton } from "@/components/ui/skeleton";
import { GlobalBanner } from "@/components/global-banner";

export const metadata = {
  title: "Reports | DI-CMS",
  description: "Detailed financial and inventory reports.",
};

// ─── Page Shell — renders INSTANTLY ─────────────────────────────────────────
export default async function ReportsPage() {
  try {
    await requireRole(["SUPER_ADMIN", "INVENTORY"]);
  } catch (err) {
    redirect("/");
  }

  const session = await getSession();
  const { isGlobal } = getShopScope(session);

  return (
    <div className="space-y-8 pb-12">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Business Reports</h1>
        <p className="text-muted-foreground">
          Comprehensive overview of your business health and performance.
        </p>
      </div>

      {isGlobal && <GlobalBanner />}

      <Suspense fallback={<CardGridSkeleton count={3} />}>
        <ReportsSummaryCards />
      </Suspense>

      <Suspense
        fallback={
          <div className="grid gap-8 lg:grid-cols-2">
            <TableSkeleton rows={5} cols={3} />
            <Skeleton className="h-64 rounded-xl" />
          </div>
        }
      >
        <ReportsDetail />
      </Suspense>
    </div>
  );
}

// ─── Summary Cards ───────────────────────────────────────────────────────────
async function ReportsSummaryCards() {
  const res = await getReportsData();
  if (!res.success || !res.data) return null;
  const { inventory, debt, sales } = res.data;

  const session = await getSession();
  if (!session?.user?.organizationId) return null;
  const isInventory = session.user.activeRole === "INVENTORY" && session.user.globalRole !== "SUPER_ADMIN";

  const org = await prisma.organization.findUnique({
    where: { id: session.user.organizationId },
    select: { currency: true },
  });
  const displayCurrency = org?.currency || "USD";

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {!isInventory && (
        <>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <TrendingUp className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatPrice(sales.totalRevenue, displayCurrency)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Collected: {formatPrice(sales.totalCollected, displayCurrency)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Outstanding Debt</CardTitle>
              <Users className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatPrice(debt.totalOutstanding, displayCurrency)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Total credit issued to customers
              </p>
            </CardContent>
          </Card>
        </>
      )}

      <Card className={isInventory ? "md:col-span-2 lg:col-span-3" : ""}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Inventory Asset Value</CardTitle>
          <Package className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatPrice(inventory.retailValue, displayCurrency)}</div>
          <p className="text-xs text-muted-foreground mt-1">
            At retail price (Cost: {formatPrice(inventory.costValue, displayCurrency)})
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Detail Tables ───────────────────────────────────────────────────────────
async function ReportsDetail() {
  const res = await getReportsData();
  if (!res.success || !res.data) {
    return (
      <div className="p-8 text-center border-2 border-dashed rounded-lg">
        <AlertCircle className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold">Could not load reports</h2>
        <p className="text-muted-foreground">{res.error}</p>
      </div>
    );
  }

  const { inventory, debt } = res.data;

  const session = await getSession();
  if (!session?.user?.organizationId) return null;
  const isInventory = session.user.activeRole === "INVENTORY" && session.user.globalRole !== "SUPER_ADMIN";

  const org = await prisma.organization.findUnique({
    where: { id: session.user.organizationId },
    select: { currency: true },
  });
  const displayCurrency = org?.currency || "USD";

  return (
    <div className={isInventory ? "grid gap-8 grid-cols-1" : "grid gap-8 lg:grid-cols-2"}>
      {!isInventory && (
        <Card>
          <CardHeader>
            <CardTitle>Top Debtors</CardTitle>
            <CardDescription>
              Customers with the highest outstanding balances.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>Utilization</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {debt.topDebtors.map((debtor) => (
                  <TableRow key={debtor.id}>
                    <TableCell className="font-medium">{debtor.name}</TableCell>
                    <TableCell>{formatPrice(debtor.balance, displayCurrency)}</TableCell>
                    <TableCell className="w-[150px]">
                      <div className="space-y-1">
                        <Progress value={debtor.utilization} className="h-1.5" />
                        <p className="text-[10px] text-muted-foreground">
                          {debtor.utilization.toFixed(1)}% of limit
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {debt.topDebtors.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      className="text-center py-4 text-muted-foreground text-sm"
                    >
                      No outstanding debts found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Inventory Profit Potential</CardTitle>
          <CardDescription>
            Estimated profit if all current stock is sold.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-8">
          <div className="relative h-40 w-40 flex items-center justify-center rounded-full border-8 border-emerald-500/20">
            <div className="text-center">
              <p className="text-xs text-muted-foreground uppercase font-semibold">
                Total Margin
              </p>
              <p className="text-2xl font-bold text-emerald-600">
                {formatPrice(inventory.potentialProfit, displayCurrency)}
              </p>
            </div>
          </div>
          <div className="mt-8 grid grid-cols-2 gap-8 w-full text-center">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Cost</p>
              <p className="text-lg font-bold">{formatPrice(inventory.costValue, displayCurrency)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Retail</p>
              <p className="text-lg font-bold">{formatPrice(inventory.retailValue, displayCurrency)}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
