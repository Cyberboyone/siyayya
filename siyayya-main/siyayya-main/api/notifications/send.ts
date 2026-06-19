import { VercelRequest, VercelResponse } from '@vercel/node';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin
if (!admin.apps.length) {
  try {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;

    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey: privateKey?.replace(/\\n/g, '\n'),
      }),
    });
  } catch (error) {
    console.error('[Notifications API] Firebase initialization error:', error);
  }
}

const db = admin.firestore();
const messaging = admin.messaging();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized. Missing authentication token.' });
  }

  const idToken = authHeader.split('Bearer ')[1];

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const { uid: senderId } = decodedToken;

    const { targetUserIds, title, body, data, notificationType } = req.body;

    if (!targetUserIds || !Array.isArray(targetUserIds) || targetUserIds.length === 0) {
      return res.status(400).json({ message: 'Missing or invalid targetUserIds.' });
    }

    if (!title || !body) {
      return res.status(400).json({ message: 'Missing title or body.' });
    }

    // Collect all FCM tokens for the target users
    const tokens: string[] = [];
    const userTokensMap: Record<string, string> = {}; // map token to userId for cleanup

    // In a real app, query in batches if targetUserIds is very large
    const usersSnap = await db.collection('users').where(admin.firestore.FieldPath.documentId(), 'in', targetUserIds.slice(0, 10)).get();

    usersSnap.docs.forEach(doc => {
      const userData = doc.data();
      const userTokens = userData.fcmTokens || [];
      const preferences = userData.notificationPreferences || {};
      
      // Check if user has disabled this notification type
      if (notificationType && preferences[notificationType] === false) {
        return; // skip this user
      }

      userTokens.forEach((token: string) => {
        tokens.push(token);
        userTokensMap[token] = doc.id;
      });
    });

    if (tokens.length === 0) {
      return res.status(200).json({ message: 'No valid FCM tokens found for target users.', successCount: 0 });
    }

    // Send the push notification
    const payload = {
      notification: {
        title,
        body,
      },
      data: {
        ...data,
        notificationType: notificationType || 'general',
      },
      tokens,
    };

    const response = await messaging.sendEachForMulticast(payload);

    // Clean up invalid tokens
    if (response.failureCount > 0) {
      const failedTokens: string[] = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          const error = resp.error;
          if (
            error?.code === 'messaging/invalid-registration-token' ||
            error?.code === 'messaging/registration-token-not-registered'
          ) {
            failedTokens.push(tokens[idx]);
          }
        }
      });

      if (failedTokens.length > 0) {
        // Remove failed tokens from their respective user documents
        const cleanupPromises = failedTokens.map(token => {
          const userId = userTokensMap[token];
          return db.collection('users').doc(userId).update({
            fcmTokens: admin.firestore.FieldValue.arrayRemove(token)
          });
        });
        await Promise.allSettled(cleanupPromises);
        console.log(`[Notifications API] Cleaned up ${failedTokens.length} invalid tokens.`);
      }
    }

    return res.status(200).json({ 
      message: 'Notifications processed successfully.',
      successCount: response.successCount,
      failureCount: response.failureCount
    });
  } catch (error: any) {
    console.error('[Notifications API Error]:', error.message || error);
    return res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
}
