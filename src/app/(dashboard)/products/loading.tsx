import { PageHeaderSkeleton, TableSkeleton } from "@/components/skeletons";

export default function Loading() {
  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <PageHeaderSkeleton />
      </div>
      <TableSkeleton rows={8} cols={5} />
    </div>
  );
}
