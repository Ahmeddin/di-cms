import { Skeleton } from "@/components/ui/skeleton";

// ─── Generic Table Skeleton ─────────────────────────────────────────────────
export function TableSkeleton({ rows = 6, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="rounded-lg border overflow-hidden">
      <div className="bg-muted/50 px-4 py-3 flex gap-4">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="border-t px-4 py-3 flex gap-4 items-center">
          {Array.from({ length: cols }).map((_, j) => (
            <Skeleton key={j} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

// ─── Page Header Skeleton ────────────────────────────────────────────────────
export function PageHeaderSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-72" />
    </div>
  );
}

// ─── Stats Grid Skeleton ─────────────────────────────────────────────────────
export function StatsGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-32 w-full rounded-xl" />
      ))}
    </div>
  );
}

// ─── Card Grid Skeleton ──────────────────────────────────────────────────────
export function CardGridSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-28 w-full rounded-xl" />
      ))}
    </div>
  );
}

// ─── Full Dashboard Skeleton ─────────────────────────────────────────────────
export function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      <StatsGridSkeleton count={4} />
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-7">
        <Skeleton className="lg:col-span-4 h-[400px] rounded-xl" />
        <Skeleton className="lg:col-span-3 h-[400px] rounded-xl" />
      </div>
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-7">
        <Skeleton className="lg:col-span-4 h-[300px] rounded-xl" />
        <div className="lg:col-span-3" />
      </div>
    </div>
  );
}

// ─── POS Interface Skeleton ──────────────────────────────────────────────────
export function PosSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[calc(100vh-130px)]">
      <div className="lg:col-span-2 space-y-3">
        <Skeleton className="h-10 w-full rounded-lg" />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
      </div>
      <div className="space-y-3">
        <Skeleton className="h-10 w-full rounded-lg" />
        <Skeleton className="h-48 w-full rounded-lg" />
        <Skeleton className="h-32 w-full rounded-lg" />
        <Skeleton className="h-12 w-full rounded-lg" />
      </div>
    </div>
  );
}

// ─── Admin / Profile Skeleton ────────────────────────────────────────────────
export function AdminPanelSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-28 rounded-lg" />
        ))}
      </div>
      <TableSkeleton rows={5} cols={5} />
    </div>
  );
}
