import { Suspense } from "react";
import { getDashboardStats } from "@/features/dashboard/actions";
import { getSession } from "@/lib/session";
import {
  DashboardHeader,
  StatCard,
  SalesChart,
  InventoryStatus,
  RecentSalesList,
} from "@/features/dashboard/components/dashboard-ui";
import { formatPrice } from "@/lib/utils";
import { DashboardSkeleton, StatsGridSkeleton } from "@/components/skeletons";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata = {
  title: "Dashboard | DI-CMS",
  description: "Overview of your business performance.",
};

// ─── Page Shell — renders INSTANTLY ─────────────────────────────────────────
export default function DashboardPage() {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <DashboardHeader
        title="Dashboard"
        description="Here's what's happening in your business today."
      />

      {/* Stats load first — small and fast */}
      <Suspense fallback={<StatsGridSkeleton count={4} />}>
        <DashboardStats />
      </Suspense>

      {/* Charts and recent activity load together */}
      <Suspense
        fallback={
          <div className="space-y-4">
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-7">
              <Skeleton className="lg:col-span-4 h-[400px] rounded-xl" />
              <Skeleton className="lg:col-span-3 h-[400px] rounded-xl" />
            </div>
            <div className="grid gap-4 grid-cols-1 lg:grid-cols-7">
              <Skeleton className="lg:col-span-4 h-[300px] rounded-xl" />
              <div className="lg:col-span-3" />
            </div>
          </div>
        }
      >
        <DashboardCharts />
      </Suspense>
    </div>
  );
}

// ─── KPI Stats Row ───────────────────────────────────────────────────────────
async function DashboardStats() {
  const res = await getDashboardStats();
  if (!res.success || !res.data) return null;

  const { kpis, currency } = res.data;

  const session = await getSession();
  const isInventory = session?.user?.activeRole === "INVENTORY" && session?.user?.globalRole !== "SUPER_ADMIN";
  const isCashier = session?.user?.activeRole === "CASHIER" && session?.user?.globalRole !== "SUPER_ADMIN";

  if (isInventory) {
    return (
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
        <StatCard
          title="Active Products"
          value={kpis.activeProducts.toString()}
          icon="package"
          description="Unique products in catalog"
        />
        <StatCard
          title="Stock Alerts"
          value={(kpis.lowStockCount + kpis.outOfStockCount).toString()}
          icon="alert"
          description={`${kpis.outOfStockCount} out of stock`}
        />
      </div>
    );
  }

  if (isCashier) {
    return (
      <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
        <StatCard
          title="Today's Revenue"
          value={formatPrice(kpis.todayRevenue, currency)}
          icon="dollar"
          description="Total sales made today"
        />
        <StatCard
          title="Active Products"
          value={kpis.activeProducts.toString()}
          icon="package"
          description="Unique products in catalog"
        />
        <StatCard
          title="Stock Alerts"
          value={(kpis.lowStockCount + kpis.outOfStockCount).toString()}
          icon="alert"
          description={`${kpis.outOfStockCount} out of stock`}
        />
      </div>
    );
  }

  // SUPER_ADMIN
  return (
    <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Today's Revenue"
        value={formatPrice(kpis.todayRevenue, currency)}
        icon="dollar"
        description="Total sales made today"
      />
      <StatCard
        title="Outstanding Debt"
        value={formatPrice(kpis.totalOutstandingDebt, currency)}
        icon="credit"
        description="Money owed by customers"
      />
      <StatCard
        title="Active Products"
        value={kpis.activeProducts.toString()}
        icon="package"
        description="Unique products in catalog"
      />
      <StatCard
        title="Stock Alerts"
        value={(kpis.lowStockCount + kpis.outOfStockCount).toString()}
        icon="alert"
        description={`${kpis.outOfStockCount} out of stock`}
      />
    </div>
  );
}

// ─── Charts + Recent Sales ───────────────────────────────────────────────────
async function DashboardCharts() {
  const res = await getDashboardStats();
  if (!res.success || !res.data) return null;

  const { chartData, recentSales, inventoryAlerts, currency } = res.data;

  const session = await getSession();
  const isInventory = session?.user?.activeRole === "INVENTORY" && session?.user?.globalRole !== "SUPER_ADMIN";

  if (isInventory) {
    return (
      <div className="grid gap-4 grid-cols-1">
        <InventoryStatus alerts={inventoryAlerts} />
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-7">
        <SalesChart data={chartData} currency={currency} />
        <InventoryStatus alerts={inventoryAlerts} />
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-7">
        <RecentSalesList sales={recentSales} currency={currency} />
        <div className="lg:col-span-3 hidden lg:block" />
      </div>
    </>
  );
}
