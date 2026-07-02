import type { VercelRequest, VercelResponse } from '@vercel/node';
import admin from 'firebase-admin';
import { getAdminDb } from '../_lib/firebase-admin.js';

type ListingCollection = 'products' | 'services';

const isCollection = (value: unknown): value is ListingCollection => value === 'products' || value === 'services';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const { listingId, collection, action = 'whatsapp' } = req.body || {};

    if (!listingId || typeof listingId !== 'string') {
      return res.status(400).json({ message: 'Missing listing ID.' });
    }

    if (!isCollection(collection)) {
      return res.status(400).json({ message: 'Invalid listing collection.' });
    }

    const db = getAdminDb();
    const ref = db.collection(collection).doc(listingId);

    const updateData = action === 'view'
      ? {
          views: admin.firestore.FieldValue.increment(1),
          lastViewedAt: admin.firestore.FieldValue.serverTimestamp(),
        }
      : {
          whatsappClicks: admin.firestore.FieldValue.increment(1),
          lastWhatsappClickAt: admin.firestore.FieldValue.serverTimestamp(),
        };

    await ref.set(updateData, { merge: true });

    return res.status(200).json({ message: action === 'view' ? 'View tracked.' : 'WhatsApp click tracked.' });
  } catch (error: any) {
    console.error('[Track WhatsApp] Error:', error);
    return res.status(500).json({ message: error?.message || 'Failed to track click.' });
  }
}
