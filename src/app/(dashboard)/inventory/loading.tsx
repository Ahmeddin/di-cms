import { PageHeaderSkeleton, TableSkeleton } from "@/components/skeletons";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <PageHeaderSkeleton />
      <Skeleton className="h-20 w-full rounded-lg" />
      <div className="space-y-2">
        <Skeleton className="h-6 w-40" />
        <TableSkeleton rows={5} cols={5} />
      </div>
    </div>
  );
}
