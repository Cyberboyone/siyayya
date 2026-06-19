import { Skeleton } from "@/components/ui/skeleton";

export const ProductCardSkeleton = () => {
  return (
    <div className="rounded-[2rem] overflow-hidden bg-white dark:bg-surface border border-black/5 flex flex-col h-full">
      {/* Image Area Skeleton */}
      <div className="relative aspect-[4/5] sm:aspect-square w-full">
        <Skeleton className="h-full w-full rounded-none" />
        
        {/* Floating Badges Skeletons */}
        <div className="absolute top-3 left-3 flex gap-2">
          <Skeleton className="h-5 w-16 rounded-xl" />
          <Skeleton className="h-5 w-10 rounded-xl" />
        </div>
      </div>
      
      {/* Content Area Skeleton */}
      <div className="p-5 flex flex-col flex-1 space-y-4">
        {/* Title */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-full rounded-lg" />
          <Skeleton className="h-4 w-2/3 rounded-lg" />
        </div>
        
        <div className="mt-auto flex items-end justify-between gap-2">
          {/* Price Label & Value */}
          <div className="space-y-2">
            <Skeleton className="h-2 w-8 rounded-full" />
            <Skeleton className="h-6 w-24 rounded-lg" />
          </div>
          
          {/* Rating Badge */}
          <Skeleton className="h-6 w-12 rounded-lg" />
        </div>
      </div>
    </div>
  );
};
