import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  serverTimestamp, 
  query, 
  where, 
  orderBy, 
  limit, 
  onSnapshot,
  setDoc,
  getDocs,
  getDoc,
  increment,
  writeBatch
} from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { Conversation, Message, Participant } from "../types";

import { spamDetectionService } from "./spamDetection";

// Helper: wait for Firebase Auth to be ready before making Firestore calls
// This prevents "Missing or insufficient permissions" on fresh logins
const waitForAuth = async (maxMs = 3000): Promise<boolean> => {
  let waited = 0;
  while (!auth.currentUser && waited < maxMs) {
    await new Promise(r => setTimeout(r, 150));
    waited += 150;
  }
  return !!auth.currentUser;
};

export const chatService = {
  // 🟢 Create or get existing conversation
  async getOrCreateConversation(participants: Participant[], context?: Conversation['context']) {
    // Ensure Firebase Auth is fully ready before querying Firestore
    const authReady = await waitForAuth();
    if (!authReady) {
      throw new Error("Authentication not ready. Please try again.");
    }

    // Validate participants to prevent Firestore crashes with undefined values
    if (participants.some(p => !p.uid)) {
      throw new Error("Invalid participant: Missing UID");
    }

    const participantIds = participants.map(p => p.uid).sort();
    
    // The current user should be the first participant passed from the UI
    const currentUserId = participants[0].uid;
    
    // Use array-contains to satisfy Firestore security rules (allow read if auth.uid in participantIds)
    const q = query(
      collection(db, "conversations"),
      where("participantIds", "array-contains", currentUserId),
      where("type", "==", "individual")
    );
    
    const snap = await getDocs(q);
    
    // Filter locally to find the exact match for all participantIds
    const existing = snap.docs.find(doc => {
      const data = doc.data();
      return data.participantIds && 
             data.participantIds.length === participantIds.length &&
             participantIds.every((id: string) => data.participantIds.includes(id));
    });

    if (existing) {
      return existing.id;
    }

    // Create new
    const participantsMap: Record<string, any> = {};
    const unreadCounts: Record<string, number> = {};
    participants.forEach(p => {
      participantsMap[p.uid] = p;
      unreadCounts[p.uid] = 0;
    });

    const newConv = await addDoc(collection(db, "conversations"), {
      type: "individual",
      participantIds,
      participants: participantsMap,
      unreadCounts,
      context: context || null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return newConv.id;
  },

  // 🟢 Send Message
  async sendMessage(conversationId: string, senderId: string, text: string, type: 'text' | 'image' = 'text', mediaUrl?: string) {
    if (type === 'text') {
      if (!spamDetectionService.checkRateLimit(senderId)) {
        throw new Error("You are sending messages too fast. Please wait a moment.");
      }
      if (spamDetectionService.detectSpam(text)) {
        throw new Error("Your message contains blocked keywords and cannot be sent.");
      }
    }

    const messageData = {
      conversationId,
      senderId,
      text,
      type,
      mediaUrl: mediaUrl || null,
      status: 'sent',
      createdAt: serverTimestamp(),
    };

    const batch = writeBatch(db);
    
    // 1. Add message to sub-collection
    const msgRef = doc(collection(db, "conversations", conversationId, "messages"));
    batch.set(msgRef, messageData);

    // 2. Fetch conversation to get participant IDs
    const convRef = doc(db, "conversations", conversationId);
    const convSnap = await getDoc(convRef);
    
    const updates: any = {
      lastMessage: {
        text: type === 'image' ? 'Sent an image' : text,
        senderId,
        type,
        createdAt: serverTimestamp(),
      },
      updatedAt: serverTimestamp(),
    };

    if (convSnap.exists()) {
      const data = convSnap.data() as Conversation;
      data.participantIds.forEach(pid => {
        if (pid !== senderId) {
          updates[`unreadCounts.${pid}`] = increment(1);
        }
      });
    }

    // 3. Apply single update to conversation summary
    batch.update(convRef, updates);

    await batch.commit();
    return msgRef.id;
  },

  // 🟢 Mark as Seen
  async markAsSeen(conversationId: string, userId: string) {
    const convRef = doc(db, "conversations", conversationId);
    await updateDoc(convRef, {
      [`unreadCounts.${userId}`]: 0
    });
  },

  // 🟢 Set Typing Status
  async setTypingStatus(conversationId: string, userId: string, isTyping: boolean) {
    const convRef = doc(db, "conversations", conversationId);
    await updateDoc(convRef, {
      [`typing.${userId}`]: isTyping
    });
  }
};
