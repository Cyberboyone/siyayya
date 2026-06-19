import { useState, useEffect, useRef, useCallback } from "react";

interface UseInfiniteScrollOptions {
  /** Total items available */
  totalItems: number;
  /** Items per page/batch */
  batchSize?: number;
  /** Root margin for IntersectionObserver */
  rootMargin?: string;
}

interface UseInfiniteScrollReturn {
  /** Ref to attach to the sentinel element */
  sentinelRef: React.RefObject<HTMLDivElement | null>;
  /** Number of items currently visible */
  visibleCount: number;
  /** Whether there are more items to load */
  hasMore: boolean;
  /** Manually load more items */
  loadMore: () => void;
  /** Reset the scroll state */
  reset: () => void;
}

export const useInfiniteScroll = ({
  totalItems,
  batchSize = 20,
  rootMargin = "200px",
}: UseInfiniteScrollOptions): UseInfiniteScrollReturn => {
  const [visibleCount, setVisibleCount] = useState(batchSize);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const hasMore = visibleCount < totalItems;

  const loadMore = useCallback(() => {
    setVisibleCount((prev) => Math.min(prev + batchSize, totalItems));
  }, [batchSize, totalItems]);

  const reset = useCallback(() => {
    setVisibleCount(batchSize);
  }, [batchSize]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          loadMore();
        }
      },
      { rootMargin }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadMore, rootMargin]);

  // Reset when totalItems changes significantly (e.g., filter change)
  useEffect(() => {
    setVisibleCount(Math.min(batchSize, totalItems));
  }, [totalItems, batchSize]);

  return { sentinelRef, visibleCount, hasMore, loadMore, reset };
};
