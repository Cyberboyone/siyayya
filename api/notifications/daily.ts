import type { VercelRequest, VercelResponse } from '@vercel/node';
import admin from 'firebase-admin';
import { v2 as cloudinary } from 'cloudinary';
import { getAdminDb, getAdminMessaging } from '../_lib/firebase-admin.js';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

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

// 🗑️ Auto-cleanup of old listings
// A listing is deleted once it's been inactive for LISTING_MAX_AGE_DAYS,
// where "inactive" means it hasn't been created, edited, or boosted more
// recently than that. Sellers get a warning notification
// LISTING_WARNING_DAYS_BEFORE the deletion so they can boost/edit to keep it.
const LISTING_MAX_AGE_DAYS = 60;
const LISTING_WARNING_DAYS_BEFORE = 5;
const LISTING_COLLECTIONS = ['products', 'services', 'requests'] as const;

const toMillis = (value: any): number => {
  if (!value) return 0;
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (typeof value.toDate === 'function') return value.toDate().getTime();
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
};

/** Most recent of createdAt / updatedAt / boostedAt — the listing's true "last active" moment. */
const getLastActiveMs = (data: FirebaseFirestore.DocumentData): number =>
  Math.max(toMillis(data.createdAt), toMillis(data.updatedAt), toMillis(data.boostedAt));

const deleteCloudinaryAsset = async (publicId?: string, resourceType: string = 'image') => {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId, {
      resource_type: ['image', 'video', 'raw'].includes(resourceType) ? resourceType : 'image',
      invalidate: true,
    });
  } catch (error) {
    console.error('[Listing Cleanup] Cloudinary delete failed:', publicId, error);
  }
};

interface CleanupSummary {
  warned: number;
  deleted: number;
  imagesDeleted: number;
  reviewsDeleted: number;
}

async function runListingCleanup(
  db: FirebaseFirestore.Firestore,
  messaging: admin.messaging.Messaging
): Promise<CleanupSummary> {
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const expireBeforeMs = now - LISTING_MAX_AGE_DAYS * dayMs;
  const warnBeforeMs = now - (LISTING_MAX_AGE_DAYS - LISTING_WARNING_DAYS_BEFORE) * dayMs;

  const summary: CleanupSummary = { warned: 0, deleted: 0, imagesDeleted: 0, reviewsDeleted: 0 };

  // Owner ids needing a push notification, keyed by ownerId -> { title, body }.
  // Collected while scanning, sent in one batch per push after Firestore
  // writes are committed so a push failure never blocks the actual cleanup.
  const pushQueue: { ownerId: string; title: string; body: string; link: string }[] = [];

  for (const collectionName of LISTING_COLLECTIONS) {
    // Firestore can't query on a derived "last active" field, so we scan
    // everything old enough by createdAt and re-check the real last-active
    // time (including boosts/edits) in memory before acting on each one.
    const snap = await db.collection(collectionName)
      .where('createdAt', '<=', admin.firestore.Timestamp.fromMillis(warnBeforeMs))
      .get();

    let batch = db.batch();
    let batchOps = 0;
    const commitIfNeeded = async () => {
      if (batchOps >= 450) {
        await batch.commit();
        batch = db.batch();
        batchOps = 0;
      }
    };

    for (const docSnap of snap.docs) {
      const data = docSnap.data();
      const lastActiveMs = getLastActiveMs(data);
      if (lastActiveMs > warnBeforeMs) continue; // Edited/boosted recently enough — skip entirely

      const ownerId = data.ownerId || data.guestEmail;
      const listingTitle = data.title || 'your listing';

      if (lastActiveMs <= expireBeforeMs) {
        // Past the deadline — delete the listing, its media, and its reviews.
        const mediaData = Array.isArray(data.mediaData) ? data.mediaData : [];
        await Promise.allSettled(
          mediaData.map((m: any) => deleteCloudinaryAsset(m?.publicId, m?.resourceType || 'image'))
        );
        if (typeof data.public_id === 'string' && data.public_id) {
          await deleteCloudinaryAsset(data.public_id, data.resource_type || 'image');
        }
        summary.imagesDeleted += mediaData.length;

        if (collectionName !== 'requests') {
          const reviewsSnap = await db.collection('reviews').where('listingId', '==', docSnap.id).get();
          reviewsSnap.docs.forEach((r) => {
            batch.delete(r.ref);
            batchOps += 1;
          });
          summary.reviewsDeleted += reviewsSnap.size;
        }

        batch.delete(docSnap.ref);
        batchOps += 1;
        summary.deleted += 1;

        if (data.ownerId) {
          const notifRef = db.collection('users').doc(data.ownerId).collection('notifications').doc();
          const pushTitle = 'Listing removed for inactivity';
          const pushBody = `"${listingTitle}" was automatically removed after ${LISTING_MAX_AGE_DAYS} days with no activity.`;
          batch.set(notifRef, {
            userId: data.ownerId,
            title: pushTitle,
            body: pushBody,
            type: 'listing_expired',
            link: '/dashboard?tab=listings',
            read: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            senderId: 'system',
            senderName: 'Siyayya',
            senderAvatar: '',
            metadata: { collection: collectionName, listingTitle },
          });
          batchOps += 1;
          pushQueue.push({ ownerId: data.ownerId, title: pushTitle, body: pushBody, link: '/dashboard?tab=listings' });
        }

        await commitIfNeeded();
      } else if (data.ownerId && toMillis(data.expiryWarningAt) < lastActiveMs) {
        // Within the warning window and hasn't been warned since the listing
        // was last active (a stale warning from before an edit/boost doesn't
        // count — this lets the same listing be warned again in the future
        // if it goes inactive a second time).
        const daysLeft = Math.max(1, Math.ceil((lastActiveMs + LISTING_MAX_AGE_DAYS * dayMs - now) / dayMs));
        const notifRef = db.collection('users').doc(data.ownerId).collection('notifications').doc();
        const pushTitle = 'Your listing is about to be removed';
        const pushBody = `"${listingTitle}" will be automatically deleted in ${daysLeft} day${daysLeft === 1 ? '' : 's'} unless you edit or boost it.`;
        batch.set(notifRef, {
          userId: data.ownerId,
          title: pushTitle,
          body: pushBody,
          type: 'listing_expiring',
          link: '/dashboard?tab=listings',
          read: false,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          senderId: 'system',
          senderName: 'Siyayya',
          senderAvatar: '',
          metadata: { collection: collectionName, listingTitle, daysLeft },
        });
        batch.update(docSnap.ref, {
          expiryWarningAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        batchOps += 2;
        summary.warned += 1;
        pushQueue.push({ ownerId: data.ownerId, title: pushTitle, body: pushBody, link: '/dashboard?tab=listings' });

        await commitIfNeeded();
      }
    }

    if (batchOps > 0) await batch.commit();
  }

  // Send actual push notifications for everything queued above. Firestore
  // writes already succeeded regardless of push outcome, so a push failure
  // here never affects the cleanup/warning bookkeeping.
  if (pushQueue.length > 0) {
    const ownerIds = Array.from(new Set(pushQueue.map((p) => p.ownerId)));
    const ownerDocs = await Promise.all(
      ownerIds.map((id) => db.collection('users').doc(id).get())
    );
    const tokensByOwner: Record<string, string[]> = {};
    ownerDocs.forEach((snap) => {
      const tokens = Array.isArray(snap.data()?.fcmTokens) ? snap.data()!.fcmTokens.filter(Boolean) : [];
      if (tokens.length > 0) tokensByOwner[snap.id] = tokens;
    });

    for (const item of pushQueue) {
      const tokens = tokensByOwner[item.ownerId];
      if (!tokens || tokens.length === 0) continue;
      try {
        // Data-only payload (see api/notifications/send.ts for why) so the
        // service worker's onBackgroundMessage is the single source of
        // truth for display and this never double-shows.
        await messaging.sendEachForMulticast({
          data: {
            title: item.title,
            body: item.body,
            link: item.link,
            notificationType: 'listing_lifecycle',
            icon: '/pwa-192x192.png',
            badge: '/pwa-192x192.png',
          },
          webpush: {
            fcmOptions: { link: item.link },
          },
          tokens,
        });
      } catch (pushError) {
        console.error('[Listing Cleanup] Push send failed for owner:', item.ownerId, pushError);
      }
    }
  }

  return summary;
}

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
      // Data-only payload (see api/notifications/send.ts for why) — avoids
      // the daily digest push rendering twice (once auto-displayed by the
      // browser from a `notification` payload, once from our SW's
      // onBackgroundMessage handler).
      const response = await messaging.sendEachForMulticast({
        data: {
          title: message.title,
          body: message.body,
          link: '/',
          notificationType: 'announcement',
          campaign: 'daily_engagement',
          dateKey: todayKey,
          icon: '/pwa-192x192.png',
          badge: '/pwa-192x192.png',
          tag: `siyayya-daily-${todayKey}`,
        },
        webpush: {
          fcmOptions: { link: '/' },
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

    let cleanupSummary: CleanupSummary | { error: string } = { warned: 0, deleted: 0, imagesDeleted: 0, reviewsDeleted: 0 };
    try {
      cleanupSummary = await runListingCleanup(db, messaging);
    } catch (cleanupError) {
      console.error('[Listing Cleanup] Failed:', cleanupError);
      cleanupSummary = { error: 'Listing cleanup failed, see server logs.' };
    }

    return res.status(200).json({
      message: 'Daily notifications processed.',
      dateKey: todayKey,
      eligibleUsers,
      tokenCount: tokens.length,
      successCount,
      failureCount,
      invalidTokenCount: invalidTokens.length,
      listingCleanup: cleanupSummary,
    });
  } catch (error) {
    console.error('[Daily Notifications] Failed:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
}
