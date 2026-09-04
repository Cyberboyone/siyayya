import type { VercelRequest, VercelResponse } from '@vercel/node';
import { v2 as cloudinary } from 'cloudinary';
import { getAdminAuth, getAdminDb } from '../_lib/firebase-admin.js';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized. Missing token.' });
  }

  const { public_id, resource_type = 'image' } = req.body;

  if (!public_id || typeof public_id !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid public_id' });
  }

  const allowedResourceTypes = ['image', 'video', 'raw'];
  if (!allowedResourceTypes.includes(resource_type)) {
    return res.status(400).json({ error: 'Invalid resource_type' });
  }

  let decoded;
  try {
    decoded = await getAdminAuth().verifyIdToken(authHeader.replace('Bearer ', '').trim());

    // Authorization: only admins (super admin or admin) may delete assets,
    // or the owner of a listing that references this public_id.
    const db = getAdminDb();
    const collections = ['products', 'services', 'requests'];

    const adminEmails = (process.env.ADMIN_EMAILS || '')
      .split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
    const isAdminUser = adminEmails.includes(decoded.email?.toLowerCase() || '');

    if (!isAdminUser) {
      // Look up whether the caller owns a listing referencing this asset.
      const snapshots = await Promise.all(
        collections.map((coll) =>
          db.collection(coll)
            .where('ownerId', '==', decoded.uid)
            .get()
            .then((s) => s.docs)
            .catch(() => [] as any[])
        )
      );

      const ownsAsset = snapshots.flat().some((doc) => {
        const data = doc.data();
        const mediaData = Array.isArray(data.mediaData) ? (data.mediaData as any[]) : [];
        return mediaData.some((m: any) => m?.publicId === public_id) ||
          data.public_id === public_id ||
          data.videoPublicId === public_id;
      });

      if (!ownsAsset) {
        return res.status(403).json({ error: 'Forbidden. You do not own this asset.' });
      }
    }
  } catch {
    return res.status(401).json({ error: 'Unauthorized. Invalid token.' });
  }

  try {
    const result = await cloudinary.uploader.destroy(public_id, {
      resource_type,
      invalidate: true,
    });

    if (result.result === 'ok' || result.result === 'not_found') {
      return res.status(200).json({ success: true, result: result.result });
    }

    return res.status(500).json({ error: 'Deletion failed' });
  } catch (error) {
    console.error('[Cloudinary Delete] Failed:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
