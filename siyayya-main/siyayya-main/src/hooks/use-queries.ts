import { useQuery } from "@tanstack/react-query";
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Product, Service, ProductRequest } from "@/lib/mock-data";

/** Normalize campusId: Default to 'fuk' if missing, and ensure lowercase */
const normalizeCampusId = (data: any) => {
  let campusId = data.campusId || data.university || "fuk";
  return String(campusId).toLowerCase();
};

export const useProducts = () => {
  return useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      try {
        const q = query(
          collection(db, "products"),
          orderBy("createdAt", "desc"),
          limit(100)
        );
        const snap = await getDocs(q);
        return snap.docs.map(d => {
          const data = d.data();
          data.campusId = normalizeCampusId(data);
          data.university = data.campusId; // Sync legacy field
          return { id: d.id, _id: d.id, ...data } as unknown as Product;
        });
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
    staleTime: 1000 * 60 * 15, // 15 minutes
  });
};

export const useServices = () => {
  return useQuery({
    queryKey: ["services"],
    queryFn: async () => {
      try {
        const q = query(
          collection(db, "services"),
          orderBy("createdAt", "desc"),
          limit(50)
        );
        const snap = await getDocs(q);
        return snap.docs.map(d => {
          const data = d.data();
          data.campusId = normalizeCampusId(data);
          data.university = data.campusId;
          return { id: d.id, _id: d.id, ...data } as unknown as Service;
        });
      } catch (error: any) {
        console.error("[Queries] Error fetching services:", error);
        if (error.code === 'permission-denied') return [];
        throw error;
      }
    },
    staleTime: 1000 * 60 * 15, // 15 minutes
  });
};

export const useRequests = () => {
  return useQuery({
    queryKey: ["requests"],
    queryFn: async () => {
      try {
        const q = query(
          collection(db, "requests"),
          orderBy("createdAt", "desc"),
          limit(50)
        );
        const snap = await getDocs(q);
        return snap.docs.map(d => {
          const data = d.data();
          data.campusId = normalizeCampusId(data);
          data.university = data.campusId;
          return { id: d.id, _id: d.id, ...data } as unknown as ProductRequest;
        });
      } catch (error: any) {
        console.error("[Queries] Error fetching requests:", error);
        if (error.code === 'permission-denied') return [];
        throw error;
      }
    },
    staleTime: 1000 * 60 * 5,
  });
};
