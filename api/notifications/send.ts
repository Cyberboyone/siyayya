import { VercelRequest, VercelResponse } from '@vercel/node';
import * as admin from 'firebase-admin';
import { getAdminAuth, getAdminDb, getAdminMessaging } from '../_lib/firebase-admin';
import { z } from 'zod';

const SendSchema = z.object({
  targetUserIds: z.array(z.string().min(1)).min(1).max(10),
  title: z.string().min(1).max(100),
  body: z.string().min(1).max(300),
  data: z.record(z.string()).optional(),
  notificationType: z.string().max(50).optional(),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized.' });
  }

  let decoded: admin.auth.DecodedIdToken;
  try {
    decoded = await getAdminAuth().verifyIdToken(authHeader.split('Bearer ')[1]);
  } catch {
    return res.status(401).json({ message: 'Unauthorized. Invalid token.' });
  }

  const parsed = SendSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.errors[0]?.message || 'Invalid input' });
  }

  const { targetUserIds, title, body, data, notificationType } = parsed.data;
  const db = getAdminDb();

  try {
    const usersSnap = await db.collection('users')
      .where(admin.firestore.FieldPath.documentId(), 'in', targetUserIds)
      .get();

    const tokens: string[] = [];
    const tokenUserMap: Record<string, string> = {};

    usersSnap.docs.forEach(doc => {
      const userData = doc.data();
      const userTokens: string[] = userData.fcmTokens || [];
      const preferences: Record<string, boolean> = userData.notificationPreferences || {};

      if (notificationType && preferences[notificationType] === false) return;

      userTokens.forEach(token => {
        tokens.push(token);
        tokenUserMap[token] = doc.id;
      });
    });

    if (tokens.length === 0) {
      return res.status(200).json({ message: 'No FCM tokens found.', successCount: 0 });
    }

    const messaging = getAdminMessaging();
    const response = await messaging.sendEachForMulticast({
      notification: { title, body },
      data: { ...(data || {}), notificationType: notificationType || 'general' },
      tokens,
    });

    if (response.failureCount > 0) {
      const invalidTokens = response.responses
        .map((r, i) => ({ r, token: tokens[i] }))
        .filter(({ r }) =>
          !r.success &&
          (r.error?.code === 'messaging/invalid-registration-token' ||
           r.error?.code === 'messaging/registration-token-not-registered')
        )
        .map(({ token }) => token);

      if (invalidTokens.length > 0) {
        await Promise.allSettled(
          invalidTokens.map(token =>
            db.collection('users').doc(tokenUserMap[token]).update({
              fcmTokens: admin.firestore.FieldValue.arrayRemove(token),
            })
          )
        );
      }
    }

    return res.status(200).json({
      message: 'Notifications processed.',
      successCount: response.successCount,
      failureCount: response.failureCount,
    });
  } catch {
    return res.status(500).json({ message: 'Internal Server Error' });
  }
}
