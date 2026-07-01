import type { VercelRequest, VercelResponse } from '@vercel/node';
import admin from 'firebase-admin';
import { getAdminAuth, getAdminDb } from '../_lib/firebase-admin.js';

const makeReferralCode = (uid: string) =>
  `SIY${uid.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase()}`;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const { idToken, referralCode: rawReferralCode } = req.body || {};
    if (!idToken || typeof idToken !== 'string') {
      return res.status(401).json({ message: 'Missing auth token' });
    }

    const auth = getAdminAuth();
    const db = getAdminDb();
    const decoded = await auth.verifyIdToken(idToken);
    const uid = decoded.uid;
    const referralCode = String(rawReferralCode || '').trim().toUpperCase();

    const userRef = db.collection('users').doc(uid);
    const userSnap = await userRef.get();
    const user = userSnap.exists ? userSnap.data() || {} : {};
    const ownCode = user.referralCode || makeReferralCode(uid);

    const baseUpdate: Record<string, any> = {
      referralCode: ownCode,
    };

    if (!referralCode || referralCode === ownCode || user.referredBy) {
      await userRef.set(baseUpdate, { merge: true });
      return res.status(200).json({ claimed: false, referralCode: ownCode });
    }

    const referrerSnap = await db.collection('users')
      .where('referralCode', '==', referralCode)
      .limit(1)
      .get();

    if (referrerSnap.empty) {
      await userRef.set(baseUpdate, { merge: true });
      return res.status(200).json({ claimed: false, referralCode: ownCode, reason: 'not_found' });
    }

    const referrerDoc = referrerSnap.docs[0];
    if (referrerDoc.id === uid) {
      await userRef.set(baseUpdate, { merge: true });
      return res.status(200).json({ claimed: false, referralCode: ownCode, reason: 'self' });
    }

    const referralRef = db.collection('referrals').doc(`${referrerDoc.id}_${uid}`);
    const referralSnap = await referralRef.get();
    if (referralSnap.exists) {
      await userRef.set(baseUpdate, { merge: true });
      return res.status(200).json({ claimed: false, referralCode: ownCode, reason: 'duplicate' });
    }

    const batch = db.batch();
    batch.set(userRef, {
      ...baseUpdate,
      referredBy: referrerDoc.id,
      referredByCode: referralCode,
      referredAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    batch.set(referralRef, {
      referrerId: referrerDoc.id,
      referredUserId: uid,
      referredUserName: user.businessName || user.name || decoded.name || decoded.email || 'New user',
      referredUserEmail: decoded.email || user.email || '',
      referralCode,
      status: 'completed',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    batch.set(referrerDoc.ref, {
      referralCount: admin.firestore.FieldValue.increment(1),
      referralRewardCredits: admin.firestore.FieldValue.increment(1),
      badges: admin.firestore.FieldValue.arrayUnion('Campus Builder'),
    }, { merge: true });

    await batch.commit();

    return res.status(200).json({ claimed: true, referralCode: ownCode });
  } catch (error: any) {
    console.error('[Referrals Claim] Error:', error);
    return res.status(500).json({ message: error?.message || 'Failed to claim referral' });
  }
}
