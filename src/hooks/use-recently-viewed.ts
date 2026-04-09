import { useState, useCallback } from "react";

const STORAGE_KEY = "siyayya-recently-viewed";
const MAX_ITEMS = 10;

function getStored(): string[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

export function useRecentlyViewed() {
  const [viewedIds, setViewedIds] = useState<string[]>(getStored);

  const addViewed = useCallback((id: string) => {
    setViewedIds((prev) => {
      const next = [id, ...prev.filter((x) => x !== id)].slice(0, MAX_ITEMS);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  return { viewedIds, addViewed };
}
