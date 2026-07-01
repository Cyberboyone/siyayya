import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as admin from 'firebase-admin';
import { getAdminAuth, getAdminDb } from '../_lib/firebase-admin';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { idToken } = req.body;
  if (!idToken || typeof idToken !== 'string') {
    return res.status(400).json({ message: 'Missing idToken' });
  }

  let auth: admin.auth.Auth;
  let db: admin.firestore.Firestore;

  try {
    auth = getAdminAuth();
    db = getAdminDb();
  } catch {
    return res.status(200).json({ skipped: true, message: 'Admin not configured' });
  }

  try {
    const decoded = await auth.verifyIdToken(idToken);
    const { uid, email, name, picture } = decoded;

    if (!email) throw new Error('Email not provided');

    const userRef = db.collection('users').doc(uid);
    const userDoc = await userRef.get();
    let isNewUser = false;

    if (!userDoc.exists) {
      isNewUser = true;
      await userRef.set({
        id: uid,
        name: name || 'Unknown User',
        email,
        avatar: picture || '',
        businessName: '',
        status: 'active',
        rating: 0,
        reviewCount: 0,
        isVerified: false,
        joinedAt: new Date().toISOString(),
      });
    } else {
      await userRef.update({
        id: uid,
        name: name || userDoc.data()?.name,
        email: email || userDoc.data()?.email,
        avatar: picture || userDoc.data()?.avatar,
      });
      if (!userDoc.data()?.businessName) isNewUser = true;
    }

    // Claim guest requests — best-effort
    try {
      const snap = await db.collection('requests')
        .where('isGuest', '==', true)
        .where('guestEmail', '==', email)
        .get();

      if (!snap.empty) {
        const batch = db.batch();
        snap.docs.forEach(d =>
          batch.update(d.ref, {
            ownerId: uid,
            ownerName: name || 'Unknown User',
            isGuest: false,
            ownerIsVerified: false,
          })
        );
        await batch.commit();
      }
    } catch { /* non-critical */ }

    return res.status(200).json({ uid, email, isNewUser });
  } catch {
    return res.status(401).json({ message: 'Authentication failed' });
  }
}
