import { PageHeaderSkeleton, CardGridSkeleton, TableSkeleton } from "@/components/skeletons";

export default function Loading() {
  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <PageHeaderSkeleton />
      <CardGridSkeleton count={3} />
      <TableSkeleton rows={6} cols={5} />
    </div>
  );
}
