import { VercelRequest, VercelResponse } from '@vercel/node';
import * as admin from 'firebase-admin';
import { getAdminDb, getAdminMessaging } from '../_lib/firebase-admin';

const DAILY_MESSAGES = [
  {
    title: 'Fresh campus deals are waiting 🔥',
    body: 'Check today’s latest phones, laptops, fashion, services and hostel deals on Siyayya.',
  },
  {
    title: 'What’s new around your campus?',
    body: 'Open Siyayya to discover new listings and student offers posted today.',
  },
  {
    title: 'Find a buyer faster today',
    body: 'Got something to sell? Post it on Siyayya and reach students around your campus.',
  },
  {
    title: 'Don’t miss today’s campus marketplace updates',
    body: 'Browse new listings, save items, and connect with trusted students on Siyayya.',
  },
];

const getLagosDateKey = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Lagos',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

const getDailyMessage = () => {
  const day = new Date().getUTCDate();
  return DAILY_MESSAGES[day % DAILY_MESSAGES.length];
};

const chunk = <T,>(items: T[], size: number) => {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = req.headers.authorization;
    if (authHeader !== `Bearer ${cronSecret}`) {
      return res.status(401).json({ message: 'Unauthorized.' });
    }
  }

  const db = getAdminDb();
  const messaging = getAdminMessaging();
  const todayKey = getLagosDateKey();
  const message = getDailyMessage();
  const maxUsers = Math.min(Number(req.query.limit || 1000), 5000);

  try {
    const usersSnap = await db.collection('users').limit(maxUsers).get();

    const tokenUserMap: Record<string, string> = {};
    const tokens: string[] = [];
    const notificationWrites: FirebaseFirestore.WriteBatch[] = [];
    let currentBatch = db.batch();
    let batchOps = 0;
    let eligibleUsers = 0;

    const commitBatchIfNeeded = () => {
      if (batchOps >= 450) {
        notificationWrites.push(currentBatch);
        currentBatch = db.batch();
        batchOps = 0;
      }
    };

    usersSnap.docs.forEach((userDoc) => {
      const data = userDoc.data();
      const userTokens = Array.isArray(data.fcmTokens) ? data.fcmTokens.filter(Boolean) : [];
      if (userTokens.length === 0) return;
      if (data.status === 'banned' || data.status === 'suspended' || data.isBanned === true) return;
      if (data.dailyNotificationLastSentDate === todayKey) return;

      const preferences: Record<string, boolean> = data.notificationPreferences || {};
      if (preferences.dailyDigest === false || preferences.announcement === false) return;

      eligibleUsers += 1;
      userTokens.forEach((token: string) => {
        tokens.push(token);
        tokenUserMap[token] = userDoc.id;
      });

      const notifRef = userDoc.ref.collection('notifications').doc();
      currentBatch.set(notifRef, {
        userId: userDoc.id,
        title: message.title,
        body: message.body,
        type: 'announcement',
        link: '/',
        read: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        senderId: 'system',
        senderName: 'Siyayya',
        senderAvatar: '',
        metadata: {
          campaign: 'daily_engagement',
          dateKey: todayKey,
        },
      });
      batchOps += 1;

      currentBatch.update(userDoc.ref, {
        dailyNotificationLastSentDate: todayKey,
        dailyNotificationLastSentAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      batchOps += 1;
      commitBatchIfNeeded();
    });

    if (batchOps > 0) notificationWrites.push(currentBatch);

    let successCount = 0;
    let failureCount = 0;
    const invalidTokens: string[] = [];

    for (const tokenChunk of chunk(tokens, 500)) {
      const response = await messaging.sendEachForMulticast({
        notification: message,
        data: {
          link: '/',
          notificationType: 'announcement',
          campaign: 'daily_engagement',
          dateKey: todayKey,
        },
        webpush: {
          fcmOptions: { link: '/' },
          notification: {
            icon: '/pwa-192x192.png',
            badge: '/pwa-192x192.png',
            tag: `siyayya-daily-${todayKey}`,
            requireInteraction: false,
          },
        },
        tokens: tokenChunk,
      });

      successCount += response.successCount;
      failureCount += response.failureCount;

      response.responses.forEach((r, i) => {
        if (
          !r.success &&
          (r.error?.code === 'messaging/invalid-registration-token' ||
            r.error?.code === 'messaging/registration-token-not-registered')
        ) {
          invalidTokens.push(tokenChunk[i]);
        }
      });
    }

    await Promise.all(notificationWrites.map(batch => batch.commit()));

    if (invalidTokens.length > 0) {
      await Promise.allSettled(
        invalidTokens.map(token =>
          db.collection('users').doc(tokenUserMap[token]).update({
            fcmTokens: admin.firestore.FieldValue.arrayRemove(token),
          })
        )
      );
    }

    return res.status(200).json({
      message: 'Daily notifications processed.',
      dateKey: todayKey,
      eligibleUsers,
      tokenCount: tokens.length,
      successCount,
      failureCount,
      invalidTokenCount: invalidTokens.length,
    });
  } catch (error) {
    console.error('[Daily Notifications] Failed:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
}
