import { useEffect, useState } from "react";
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot 
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Conversation } from "../types";
import { useMessagingStore } from "../store/useMessagingStore";

export const useConversations = (userId: string | undefined) => {
  const [isLoading, setIsLoading] = useState(true);
  const { setConversations } = useMessagingStore();

  useEffect(() => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const q = query(
      collection(db, "conversations"),
      where("participantIds", "array-contains", userId)
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      const convs = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Conversation[];
      
      // Sort client-side to bypass Firestore composite index requirement
      convs.sort((a, b) => {
        const timeA = a.updatedAt?.toMillis ? a.updatedAt.toMillis() : 0;
        const timeB = b.updatedAt?.toMillis ? b.updatedAt.toMillis() : 0;
        return timeB - timeA;
      });
      
      setConversations(convs);
      
      // Calculate total unread count for this user
      const total = convs.reduce((acc, conv) => {
        return acc + (conv.unreadCounts?.[userId] || 0);
      }, 0);
      
      useMessagingStore.getState().setTotalUnreadCount(total);
      
      setIsLoading(false);
    }, (error) => {
      console.error("Inbox listener error:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [userId, setConversations]);

  return { isLoading };
};
