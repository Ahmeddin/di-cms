import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header Skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>

      {/* Stats Grid Skeleton */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-32 w-full rounded-xl" />
        ))}
      </div>

      {/* Main Grid Skeleton */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-7">
        <Skeleton className="lg:col-span-4 h-[400px] rounded-xl" />
        <Skeleton className="lg:col-span-3 h-[400px] rounded-xl" />
      </div>

      {/* Bottom Section Skeleton */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-7">
        <Skeleton className="lg:col-span-4 h-[300px] rounded-xl" />
        <div className="lg:col-span-3" />
      </div>
    </div>
  );
}
