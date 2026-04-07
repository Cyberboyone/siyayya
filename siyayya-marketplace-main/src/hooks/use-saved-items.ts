import { useState, useCallback, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";

const STORAGE_KEY = "siyayya-saved-items";

function getStored(): string[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

export function useSavedItems() {
  const { user, isAuthenticated } = useAuth();
  const [savedIds, setSavedIds] = useState<string[]>(getStored);

  useEffect(() => {
    // If user is logged in, fetch their saved items from Firestore
    const fetchSaved = async () => {
      if (!user) return;
      try {
        const userRef = doc(db, "users", user.id);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists() && userSnap.data().savedItems) {
          setSavedIds(userSnap.data().savedItems);
        }
      } catch (error) {
        console.error("Error fetching saved items:", error);
      }
    };
    
    if (isAuthenticated && user) {
      fetchSaved();
    }
  }, [isAuthenticated, user]);

  const toggle = useCallback(async (id: string) => {
    setSavedIds((prev) => {
      const isCurrentlySaved = prev.includes(id);
      const next = isCurrentlySaved ? prev.filter((x) => x !== id) : [...prev, id];
      
      // Update Local Storage
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      
      return next;
    });

    // Update Firestore if logged in
    if (isAuthenticated && user) {
      try {
        const userRef = doc(db, "users", user.id);
        const isCurrentlySaved = savedIds.includes(id);
        await updateDoc(userRef, {
          savedItems: isCurrentlySaved ? arrayRemove(id) : arrayUnion(id)
        });
      } catch (error) {
        console.error("Error updating saved items in Firestore:", error);
      }
    }
  }, [isAuthenticated, user, savedIds]);

  const isSaved = useCallback((id: string) => savedIds.includes(id), [savedIds]);

  return { savedIds, toggle, isSaved };
}
