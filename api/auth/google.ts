import { VercelRequest, VercelResponse } from '@vercel/node';
import * as admin from 'firebase-admin';

if (!admin.apps || admin.apps.length === 0) {
  try {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (!projectId || !clientEmail || !privateKey) {
      const missing = [];
      if (!projectId) missing.push('FIREBASE_PROJECT_ID');
      if (!clientEmail) missing.push('FIREBASE_CLIENT_EMAIL');
      if (!privateKey) missing.push('FIREBASE_PRIVATE_KEY');
      console.error(`[Auth Admin] Missing variables: ${missing.join(', ')}`);
    } else {
      let formattedKey = privateKey.trim();
      if (formattedKey.startsWith('"') && formattedKey.endsWith('"')) {
        formattedKey = formattedKey.slice(1, -1);
      }
      formattedKey = formattedKey.replace(/\\n/g, '\n');

      admin.initializeApp({
        credential: admin.credential.cert({ projectId, clientEmail, privateKey: formattedKey }),
        databaseURL: `https://${projectId}.firebaseio.com`
      });
    }
  } catch (error: any) {
    console.error('[Auth Admin] Init error:', error.message || error);
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  // If Firebase Admin isn't initialised, skip gracefully — client handles auth
  if (!admin.apps || admin.apps.length === 0) {
    return res.status(200).json({ skipped: true, message: 'Admin not configured' });
  }

  const { idToken } = req.body;
  if (!idToken) {
    return res.status(400).json({ message: 'Missing idToken' });
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const { uid, email, name, picture } = decodedToken;

    if (!email) throw new Error('Email not provided');

    const db = admin.firestore();
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
        name: name || userDoc.data()?.name,
        email: email || userDoc.data()?.email,
        avatar: picture || userDoc.data()?.avatar,
      });
      if (!userDoc.data()?.businessName) isNewUser = true;
    }

    // Claim any guest requests — best-effort, non-blocking
    try {
      const snap = await db.collection('requests')
        .where('isGuest', '==', true)
        .where('guestEmail', '==', email)
        .get();

      if (!snap.empty) {
        const batch = db.batch();
        snap.docs.forEach(d => batch.update(d.ref, {
          ownerId: uid,
          ownerName: name || 'Unknown User',
          isGuest: false,
          ownerIsVerified: false
        }));
        await batch.commit();
      }
    } catch (e) {
      console.error('[Auth] Guest claim error:', e);
    }

    return res.status(200).json({ uid, email, isNewUser });
  } catch (error: any) {
    console.error('[Auth] Error:', error.message || error);
    const isPermission = error.message?.includes('permission') || error.code?.includes('permission');
    return res.status(isPermission ? 403 : 401).json({
      message: isPermission ? 'Insufficient permissions' : 'Authentication failed',
      error: error.message,
    });
  }
}
