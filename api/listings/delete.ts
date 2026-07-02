import type { VercelRequest, VercelResponse } from '@vercel/node';
import admin from 'firebase-admin';
import { v2 as cloudinary } from 'cloudinary';
import { getAdminAuth, getAdminDb } from '../_lib/firebase-admin.js';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

type ListingCollection = 'products' | 'services';

const isCollection = (value: unknown): value is ListingCollection => value === 'products' || value === 'services';

const deleteCloudinaryAsset = async (publicId?: string, resourceType: string = 'image') => {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId, {
      resource_type: ['image', 'video', 'raw'].includes(resourceType) ? resourceType : 'image',
      invalidate: true,
    });
  } catch (error) {
    console.error('[Listings Delete] Cloudinary delete failed:', publicId, error);
  }
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const { idToken, listingId, collection } = req.body || {};

    if (!idToken || typeof idToken !== 'string') {
      return res.status(401).json({ message: 'Please sign in again before deleting.' });
    }

    if (!listingId || typeof listingId !== 'string') {
      return res.status(400).json({ message: 'Missing listing ID.' });
    }

    if (!isCollection(collection)) {
      return res.status(400).json({ message: 'Invalid listing collection.' });
    }

    const auth = getAdminAuth();
    const db = getAdminDb();
    const decoded = await auth.verifyIdToken(idToken);
    const uid = decoded.uid;

    const listingRef = db.collection(collection).doc(listingId);
    const listingSnap = await listingRef.get();

    if (!listingSnap.exists) {
      return res.status(404).json({ message: 'Listing not found.' });
    }

    const listing = listingSnap.data() || {};
    const ownerId = String(listing.ownerId || '');
    const isAdmin = decoded.admin === true || (decoded.email || '').toLowerCase() === 'muhammadmusab372@gmail.com';

    if (ownerId !== uid && !isAdmin) {
      return res.status(403).json({ message: 'You can only delete your own listing.' });
    }

    const mediaData = Array.isArray(listing.mediaData) ? listing.mediaData : [];
    await Promise.allSettled(
      mediaData.map((m: any) => deleteCloudinaryAsset(m?.publicId, m?.resourceType || 'image'))
    );

    if (typeof listing.public_id === 'string' && listing.public_id) {
      await deleteCloudinaryAsset(listing.public_id, listing.resource_type || 'image');
    }

    await listingRef.delete();

    const reviewsSnap = await db.collection('reviews')
      .where('listingId', '==', listingId)
      .get();

    if (!reviewsSnap.empty) {
      const batch = db.batch();
      reviewsSnap.docs.forEach((reviewDoc) => batch.delete(reviewDoc.ref));
      await batch.commit();
    }

    return res.status(200).json({
      message: collection === 'products' ? 'Product deleted successfully.' : 'Service deleted successfully.',
      id: listingId,
      collection,
    });
  } catch (error: any) {
    console.error('[Listings Delete] Error:', error);
    const message = error?.code === 'auth/id-token-expired'
      ? 'Your session expired. Please sign in again.'
      : error?.message || 'Failed to delete listing.';

    return res.status(500).json({ message });
  }
}
