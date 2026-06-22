import { VercelRequest, VercelResponse } from '@vercel/node';
import * as admin from 'firebase-admin';
import { getAdminAuth, getAdminDb } from './_lib/firebase-admin';
import { z } from 'zod';

const ReviewUpdateSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().min(1).max(500),
});

async function verifyToken(req: VercelRequest): Promise<admin.auth.DecodedIdToken> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    throw Object.assign(new Error('Missing token'), { status: 401 });
  }
  return getAdminAuth().verifyIdToken(authHeader.split('Bearer ')[1]);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  let decoded: admin.auth.DecodedIdToken;
  try {
    decoded = await verifyToken(req);
  } catch (err: any) {
    return res.status(err.status || 401).json({ message: 'Unauthorized.' });
  }

  const { uid } = decoded;
  const { id } = req.query;
  const db = getAdminDb();

  if (req.method === 'PUT') {
    const parsed = ReviewUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.errors[0]?.message || 'Invalid input' });
    }
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ message: 'Missing review ID.' });
    }

    try {
      const reviewRef = db.collection('reviews').doc(id);
      const reviewDoc = await reviewRef.get();
      if (!reviewDoc.exists) return res.status(404).json({ message: 'Review not found.' });
      if (reviewDoc.data()?.userId !== uid) {
        return res.status(403).json({ message: 'Forbidden.' });
      }
      await reviewRef.update({
        ...parsed.data,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      return res.status(200).json({ message: 'Review updated.' });
    } catch {
      return res.status(500).json({ message: 'Internal Server Error' });
    }
  }

  if (req.method === 'DELETE') {
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ message: 'Missing review ID.' });
    }
    try {
      const reviewRef = db.collection('reviews').doc(id);
      const reviewDoc = await reviewRef.get();
      if (!reviewDoc.exists) return res.status(404).json({ message: 'Review not found.' });

      const adminEmails = (process.env.ADMIN_EMAILS || '')
        .split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
      const isAdminUser = adminEmails.includes(decoded.email?.toLowerCase() || '');

      if (reviewDoc.data()?.userId !== uid && !isAdminUser) {
        return res.status(403).json({ message: 'Forbidden.' });
      }

      await reviewRef.delete();
      return res.status(200).json({ message: 'Review deleted.' });
    } catch {
      return res.status(500).json({ message: 'Internal Server Error' });
    }
  }

  return res.status(405).json({ message: 'Method Not Allowed' });
}
