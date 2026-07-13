import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/features/auth/contexts/AuthContext";

/**
 * Shared, uncapped unread-notifications counter.
 *
 * Deliberately its own query — NOT derived from whatever capped preview
 * list a component happens to be rendering (that was a real bug: a badge
 * computed from a `limit(20)` list silently under-counted or showed 0 once
 * enough newer notifications pushed an unread one out of the window). Every
 * consumer (navbar avatar badge, notifications page header, etc.) shares
 * this single source of truth via one Firestore listener per mounted
 * instance, scoped to `where('read', '==', false)`.
 */
export function useUnreadNotifications() {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user?.id) {
      setUnreadCount(0);
      return;
    }

    const unreadQuery = query(
      collection(db, "users", user.id, "notifications"),
      where("read", "==", false)
    );

    const unsubscribe = onSnapshot(unreadQuery, (snapshot) => {
      setUnreadCount(snapshot.size);
    });

    return () => unsubscribe();
  }, [user?.id]);

  return unreadCount;
}
