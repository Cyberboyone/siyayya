import { useEffect, useState, useCallback, useRef } from "react";
import { 
  collection, 
  query, 
  orderBy, 
  limit, 
  onSnapshot,
  startAfter,
  getDocs,
  QueryDocumentSnapshot,
  DocumentData
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Message } from "../types";

const MESSAGE_LIMIT = 30;

export const useMessages = (conversationId: string | null) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  
  // Track all messages by ID to prevent snapshot updates from overriding loaded history
  const messagesMapRef = useRef<Map<string, Message>>(new Map());

  const updateMessagesState = useCallback(() => {
    const msgsArray = Array.from(messagesMapRef.current.values());
    msgsArray.sort((a, b) => {
      // Handle pending messages with null createdAt
      const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : Date.now();
      const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : Date.now();
      return timeA - timeB;
    });
    setMessages(msgsArray);
  }, []);

  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      messagesMapRef.current.clear();
      setIsLoading(false);
      return;
    }

    // Reset state on conversation change
    messagesMapRef.current.clear();
    setMessages([]);
    setIsLoading(true);
    setHasMore(true);
    setLastDoc(null);

    const q = query(
      collection(db, "conversations", conversationId, "messages"),
      orderBy("createdAt", "desc"),
      limit(MESSAGE_LIMIT)
    );

    const unsubscribe = onSnapshot(q, { includeMetadataChanges: true }, (snap) => {
      const isFirstSnapshot = messagesMapRef.current.size === 0;
      
      snap.docs.forEach(doc => {
        // Use estimate to ensure pending messages have a timestamp for sorting
        const data = doc.data({ serverTimestamps: 'estimate' });
        messagesMapRef.current.set(doc.id, { id: doc.id, ...data } as Message);
      });
      
      // Only set the pagination cursor on the initial load
      if (isFirstSnapshot) {
        if (snap.docs.length > 0) {
          setLastDoc(snap.docs[snap.docs.length - 1]);
        }
        if (snap.docs.length < MESSAGE_LIMIT) {
          setHasMore(false);
        }
      }
      
      updateMessagesState();
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [conversationId, updateMessagesState]);

  const loadMore = useCallback(async () => {
    if (!hasMore || !lastDoc || !conversationId) return;

    const q = query(
      collection(db, "conversations", conversationId, "messages"),
      orderBy("createdAt", "desc"),
      startAfter(lastDoc),
      limit(MESSAGE_LIMIT)
    );

    const snap = await getDocs(q);
    
    snap.docs.forEach(doc => {
      const data = doc.data({ serverTimestamps: 'estimate' });
      messagesMapRef.current.set(doc.id, { id: doc.id, ...data } as Message);
    });

    if (snap.docs.length > 0) {
      setLastDoc(snap.docs[snap.docs.length - 1]);
    }
    
    if (snap.docs.length < MESSAGE_LIMIT) {
      setHasMore(false);
    }

    updateMessagesState();
  }, [hasMore, lastDoc, conversationId, updateMessagesState]);

  return { messages, isLoading, hasMore, loadMore };
};
