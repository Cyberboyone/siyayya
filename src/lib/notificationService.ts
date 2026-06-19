import { db } from '@/lib/firebase';
import { collection, doc, setDoc, updateDoc, serverTimestamp, query, where, getDocs, writeBatch, limit, orderBy } from 'firebase/firestore';
import { NotificationType, AppNotification } from '@/lib/mock-data';
import { getAuth } from 'firebase/auth';

interface SendNotificationOptions {
  targetUserIds: string[];
  title: string;
  body: string;
  type: NotificationType;
  link?: string;
  senderId?: string;
  senderName?: string;
  senderAvatar?: string;
  metadata?: Record<string, any>;
}

export const notificationService = {
  /**
   * Send a notification. This saves to Firestore and triggers a push notification via the API.
   */
  sendNotification: async (options: SendNotificationOptions) => {
    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;
      const idToken = currentUser ? await currentUser.getIdToken() : null;

      const { targetUserIds, title, body, type, link, senderId, senderName, senderAvatar, metadata } = options;

      // 1. Write to Firestore for the in-app notification center
      const batch = writeBatch(db);
      
      for (const targetId of targetUserIds) {
        // Skip sending notification to self
        if (targetId === senderId) continue;

        const notifRef = doc(collection(db, 'users', targetId, 'notifications'));
        batch.set(notifRef, {
          userId: targetId,
          title,
          body,
          type,
          link: link || '',
          read: false,
          createdAt: serverTimestamp(),
          senderId: senderId || '',
          senderName: senderName || '',
          senderAvatar: senderAvatar || '',
          metadata: metadata || {}
        });
      }

      await batch.commit();

      // 2. Dispatch push notification via backend API
      if (idToken && targetUserIds.length > 0) {
        await fetch('/api/notifications/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`
          },
          body: JSON.stringify({
            targetUserIds,
            title,
            body,
            notificationType: type,
            data: {
              link: link || '',
              type,
              senderId: senderId || ''
            }
          })
        });
      }

      return true;
    } catch (error) {
      console.error('[NotificationService] Error sending notification:', error);
      return false;
    }
  },

  /**
   * Mark a specific notification as read
   */
  markAsRead: async (userId: string, notificationId: string) => {
    try {
      const ref = doc(db, 'users', userId, 'notifications', notificationId);
      await updateDoc(ref, { read: true });
    } catch (error) {
      console.error('[NotificationService] Error marking as read:', error);
    }
  },

  /**
   * Mark all unread notifications as read for a user
   */
  markAllAsRead: async (userId: string) => {
    try {
      const q = query(
        collection(db, 'users', userId, 'notifications'),
        where('read', '==', false),
        limit(50) // Batch limits
      );
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) return;

      const batch = writeBatch(db);
      snapshot.docs.forEach((docSnap) => {
        batch.update(docSnap.ref, { read: true });
      });

      await batch.commit();
    } catch (error) {
      console.error('[NotificationService] Error marking all as read:', error);
    }
  }
};
