import { PageHeaderSkeleton, CardGridSkeleton, TableSkeleton } from "@/components/skeletons";

export default function Loading() {
  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <PageHeaderSkeleton />
      <CardGridSkeleton count={3} />
      <div className="grid gap-8 lg:grid-cols-2">
        <TableSkeleton rows={5} cols={3} />
        <TableSkeleton rows={5} cols={3} />
      </div>
    </div>
  );
}
