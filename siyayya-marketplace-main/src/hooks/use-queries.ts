import { useQuery } from "@tanstack/react-query";
import { collection, getDocs, getDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Product, Service, ProductRequest } from "@/lib/mock-data";

export const useProducts = () => {
  return useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const snap = await getDocs(collection(db, "products"));
      return snap.docs.map(d => ({ id: d.id, _id: d.id, ...d.data() } as unknown as Product));
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

export const useServices = () => {
  return useQuery({
    queryKey: ["services"],
    queryFn: async () => {
      const snap = await getDocs(collection(db, "services"));
      return snap.docs.map(d => ({ id: d.id, _id: d.id, ...d.data() } as unknown as Service));
    },
    staleTime: 1000 * 60 * 5,
  });
};

export const useRequests = () => {
  return useQuery({
    queryKey: ["requests"],
    queryFn: async () => {
      const snap = await getDocs(collection(db, "requests"));
      return snap.docs.map(d => ({ id: d.id, _id: d.id, ...d.data() } as unknown as ProductRequest));
    },
    staleTime: 1000 * 60 * 5,
  });
};
