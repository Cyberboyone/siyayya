import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as admin from 'firebase-admin';
import { getAdminAuth, getAdminDb } from '../_lib/firebase-admin';

type ListingType = 'product' | 'service' | 'request';

const sanitizeText = (value: unknown, max = 2000) =>
  String(value || '')
    .trim()
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/javascript:/gi, '')
    .slice(0, max);

const makeSlug = (title: string) => {
  const base = title
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '') || 'listing';

  return `${base}-${Math.floor(1000 + Math.random() * 9000)}`;
};

const isValidPhone = (phone: string) => /^[+()\d\s-]{10,20}$/.test(phone.trim());

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  let auth: admin.auth.Auth;
  let db: admin.firestore.Firestore;

  try {
    auth = getAdminAuth();
    db = getAdminDb();
  } catch (error: any) {
    console.error('[Listings Create] Firebase Admin not configured:', error);
    return res.status(500).json({ message: 'Server is not configured for listing creation.' });
  }

  try {
    const {
      idToken,
      type,
      title: rawTitle,
      description: rawDescription,
      price,
      category,
      condition,
      images = [],
      mediaData = [],
      contactPhone: rawContactPhone,
      whatsapp: rawWhatsapp,
      properties = {},
      videoId = null,
      youtubeUrl = '',
    } = req.body || {};

    if (!idToken || typeof idToken !== 'string') {
      return res.status(401).json({ message: 'Please sign in again before posting.' });
    }

    if (!['product', 'service', 'request'].includes(type)) {
      return res.status(400).json({ message: 'Invalid listing type.' });
    }

    const decoded = await auth.verifyIdToken(idToken);
    const uid = decoded.uid;

    const userRef = db.collection('users').doc(uid);
    const userSnap = await userRef.get();
    const user = userSnap.exists ? userSnap.data() || {} : {};

    if (user.status === 'banned' || user.status === 'suspended' || user.isBanned === true) {
      return res.status(403).json({ message: 'You cannot post. Account banned or suspended.' });
    }

    const title = sanitizeText(rawTitle, 120);
    const description = sanitizeText(rawDescription, 2000);
    const contactPhone = sanitizeText(rawContactPhone, 25);
    const whatsapp = sanitizeText(rawWhatsapp || rawContactPhone, 25);
    const numericPrice = Number(price) || 0;
    const listingType = type as ListingType;

    if (title.length < 3) return res.status(400).json({ message: 'Title must be at least 3 characters.' });
    if (description.length < 10) return res.status(400).json({ message: 'Description must be at least 10 characters.' });
    if (!category || typeof category !== 'string') return res.status(400).json({ message: 'Please select a category.' });
    if (!contactPhone || !isValidPhone(contactPhone)) return res.status(400).json({ message: 'Please enter a valid phone number.' });
    if (numericPrice < 0) return res.status(400).json({ message: 'Price cannot be negative.' });
    if (listingType !== 'request' && numericPrice <= 0) return res.status(400).json({ message: 'Price is required for listings.' });
    if (!Array.isArray(images) || images.length > 5) return res.status(400).json({ message: 'You can upload up to 5 images.' });
    if (listingType === 'product' && images.length === 0) return res.status(400).json({ message: 'Please upload at least one image for your product.' });

    const campusId = String(user.campusId || req.body.campusId || '').trim().toLowerCase();
    if (!campusId) {
      return res.status(400).json({ message: 'Please complete your campus profile before posting.' });
    }

    const ownerName = user.businessName || user.name || decoded.name || 'Unknown';
    const slug = makeSlug(title);
    const collectionName = listingType === 'product' ? 'products' : listingType === 'service' ? 'services' : 'requests';

    const baseData: Record<string, any> = {
      title,
      slug,
      description,
      category,
      price: numericPrice,
      contactPhone,
      whatsapp: whatsapp || contactPhone,
      properties: typeof properties === 'object' && properties !== null ? properties : {},
      videoId: videoId || null,
      youtubeUrl: sanitizeText(youtubeUrl, 300),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      campusId,
      ownerId: uid,
      ownerName,
      ownerIsVerified: user.isVerified || false,
      status: listingType === 'request' ? 'open' : 'approved',
    };

    if (listingType === 'product') {
      Object.assign(baseData, {
        ownerPhone: contactPhone,
        ownerRating: user.rating || 5.0,
        condition: condition || 'New',
        images,
        image: images[0] || '',
        mediaData: Array.isArray(mediaData) ? mediaData : [],
        isSold: false,
        isFeatured: false,
        views: 0,
      });
    } else if (listingType === 'service') {
      Object.assign(baseData, {
        ownerPhone: contactPhone,
        ownerRating: user.rating || 5.0,
        rating: 0,
        reviews: 0,
        images,
        image: images[0] || '',
        mediaData: Array.isArray(mediaData) ? mediaData : [],
        mediaUrl: images[0] || '',
        mediaType: 'image',
        priceLabel: 'Starting from',
        isFeatured: false,
        views: 0,
      });
    } else {
      Object.assign(baseData, {
        budget: numericPrice,
      });
    }

    const docRef = await db.collection(collectionName).add(baseData);

    // Repair older profiles where the saved id did not match Firebase Auth UID.
    if (user.id !== uid) {
      await userRef.set({ id: uid }, { merge: true });
    }

    return res.status(200).json({
      message: 'Listing published successfully.',
      id: docRef.id,
      slug,
      type: listingType,
      collection: collectionName,
    });
  } catch (error: any) {
    console.error('[Listings Create] Error:', error);
    const message = error?.code === 'auth/id-token-expired'
      ? 'Your session expired. Please sign in again.'
      : error?.message || 'Failed to publish listing.';

    return res.status(500).json({ message });
  }
}
