import { PageHeaderSkeleton, PosSkeleton } from "@/components/skeletons";

export default function Loading() {
  return (
    <div className="space-y-2 animate-in fade-in duration-300">
      <PageHeaderSkeleton />
      <PosSkeleton />
    </div>
  );
}
