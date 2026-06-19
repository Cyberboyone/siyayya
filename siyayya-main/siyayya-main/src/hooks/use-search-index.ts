import { useEffect, useMemo, useState } from "react";
import { Index } from "flexsearch";
import { Product, Service } from "@/lib/mock-data";

export function useSearchIndex(products: Product[], services: Service[]) {
  const [index, setIndex] = useState<Index | null>(null);

  useEffect(() => {
    // Create an index with "proximity" enabled for better relevance
    const newIndex = new Index({
      tokenize: "forward",
      resolution: 9,
      cache: true,
    });

    // Add products to index
    products.forEach((p) => {
      newIndex.add(p.id, `${p.title} ${p.description} ${p.category}`);
    });

    // Add services to index
    services.forEach((s) => {
      newIndex.add(s.id, `${s.title} ${s.description} ${s.category}`);
    });

    setIndex(newIndex);
  }, [products, services]);

  const searchIndex = useMemo(() => {
    return (query: string) => {
      if (!index || !query) return null;
      return index.search(query, { suggest: true });
    };
  }, [index]);

  return { searchIndex };
}
