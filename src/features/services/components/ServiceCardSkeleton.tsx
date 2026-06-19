import { Skeleton } from "@/components/ui/skeleton";

export const ServiceCardSkeleton = () => {
  return (
    <div className="rounded-[2.5rem] overflow-hidden bg-white dark:bg-surface border border-black/5 flex flex-col h-full">
      {/* Image Area Skeleton */}
      <div className="relative aspect-[3/4] w-full">
        <Skeleton className="h-full w-full rounded-none" />
        
        {/* Floating Badges */}
        <div className="absolute top-4 left-4 flex flex-col gap-2">
          <Skeleton className="h-6 w-20 rounded-xl" />
          <Skeleton className="h-6 w-14 rounded-xl" />
        </div>

        {/* Provider Info overlay */}
        <div className="absolute bottom-4 left-4 right-4 flex items-center gap-2">
          <Skeleton className="h-8 w-8 rounded-full" />
          <div className="space-y-1">
            <Skeleton className="h-2 w-20 rounded-full" />
            <Skeleton className="h-2 w-12 rounded-full" />
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="p-6 flex flex-col flex-1 space-y-4">
        {/* Title */}
        <div className="space-y-2">
          <Skeleton className="h-5 w-full rounded-lg" />
          <Skeleton className="h-5 w-2/3 rounded-lg" />
        </div>

        <div className="mt-auto flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-2 w-16 rounded-full" />
            <Skeleton className="h-6 w-24 rounded-lg" />
          </div>
          <Skeleton className="h-10 w-10 rounded-2xl" />
        </div>
      </div>
    </div>
  );
};
