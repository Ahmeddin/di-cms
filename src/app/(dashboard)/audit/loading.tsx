import { PageHeaderSkeleton, TableSkeleton } from "@/components/skeletons";

export default function Loading() {
  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <PageHeaderSkeleton />
      <TableSkeleton rows={10} cols={5} />
    </div>
  );
}
