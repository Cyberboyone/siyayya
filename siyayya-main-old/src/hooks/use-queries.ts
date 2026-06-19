import { useQuery } from "@tanstack/react-query";
import { collection, getDocs, getDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Product, Service, ProductRequest } from "@/lib/mock-data";

export const useProducts = () => {
  return useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      try {
        const snap = await getDocs(collection(db, "products"));
        return snap.docs.map(d => ({ id: d.id, _id: d.id, ...d.data() } as unknown as Product));
      } catch (error: any) {
        console.error("[Queries] Error fetching products:", error);
        // Handle common Firebase errors gracefully
        if (error.code === 'permission-denied') {
          console.warn("[Queries] Permission denied for products. Returning empty array.");
          return [];
        }
        throw error;
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

export const useServices = () => {
  return useQuery({
    queryKey: ["services"],
    queryFn: async () => {
      try {
        const snap = await getDocs(collection(db, "services"));
        return snap.docs.map(d => ({ id: d.id, _id: d.id, ...d.data() } as unknown as Service));
      } catch (error: any) {
        console.error("[Queries] Error fetching services:", error);
        if (error.code === 'permission-denied') return [];
        throw error;
      }
    },
    staleTime: 1000 * 60 * 5,
  });
};

export const useRequests = () => {
  return useQuery({
    queryKey: ["requests"],
    queryFn: async () => {
      try {
        const snap = await getDocs(collection(db, "requests"));
        return snap.docs.map(d => ({ id: d.id, _id: d.id, ...d.data() } as unknown as ProductRequest));
      } catch (error: any) {
        console.error("[Queries] Error fetching requests:", error);
        if (error.code === 'permission-denied') return [];
        throw error;
      }
    },
    staleTime: 1000 * 60 * 5,
  });
};
