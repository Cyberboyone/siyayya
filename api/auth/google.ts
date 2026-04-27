import { VercelRequest, VercelResponse } from '@vercel/node';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  try {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (!projectId || !clientEmail || !privateKey) {
      const missing = [];
      if (!projectId) missing.push('FIREBASE_PROJECT_ID');
      if (!clientEmail) missing.push('FIREBASE_CLIENT_EMAIL');
      if (!privateKey) missing.push('FIREBASE_PRIVATE_KEY');
      console.error(`[Auth Admin] CRITICAL: Missing environment variables: ${missing.join(', ')}`);
    } else {
      // 🔴 Robust normalization for private key
      // 1. Remove double quotes if present at start/end
      let formattedKey = privateKey.trim();
      if (formattedKey.startsWith('"') && formattedKey.endsWith('"')) {
        formattedKey = formattedKey.substring(1, formattedKey.length - 1);
      }
      // 2. Fix newline characters
      formattedKey = formattedKey.replace(/\\n/g, '\n');

      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey: formattedKey,
        }),
        databaseURL: `https://${projectId}.firebaseio.com`
      });
      console.log('[Auth Admin] Firebase admin initialized successfully.');
    }
  } catch (error: any) {
    console.error('[Auth Admin] Initialisation error:', error.message || error);
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST requests for token verification
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed. Use POST.' });
  }

  const { idToken } = req.body;

  if (!idToken) {
    return res.status(400).json({ message: 'Missing idToken' });
  }

  try {
    console.log('[Auth Verification] Verifying ID token...');
    
    // 1. Verify the ID token using Firebase Admin
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const { uid, email, name, picture } = decodedToken;

    if (!email) {
      throw new Error('Email not provided by Google');
    }

    console.log(`[Auth Verification] token verified for: ${email}`);

    // 2. Create or update user in Firestore (SIMPLIFIED)
    // We no longer manage roles here. Roles are handled by the frontend whitelist.
    const db = admin.firestore();
    const userRef = db.collection('users').doc(uid);
    const userDoc = await userRef.get();

    let isNewUser = false;

    if (!userDoc.exists) {
      isNewUser = true;
      
      await userRef.set({
        id: uid,
        name: name || 'Unknown User',
        email: email,
        avatar: picture || '',
        businessName: '',
        status: 'active',
        rating: 0,
        reviewCount: 0,
        isVerified: false,
        joinedAt: new Date().toISOString(),
      });
      console.log(`[Auth Verification] New user created: ${email}`);
    } else {
      // Update basic profile info only
      await userRef.update({
        name: name || userDoc.data()?.name,
        email: email || userDoc.data()?.email, 
        avatar: picture || userDoc.data()?.avatar,
      });
      
      // Check if businessName is still missing
      if (!userDoc.data()?.businessName) {
        isNewUser = true;
      }
      console.log(`[Auth Verification] Profile updated: ${email}`);
    }

    // 3. Claim Guest Requests
    try {
      const requestsRef = db.collection('requests');
      const guestRequestsQuery = await requestsRef
        .where('isGuest', '==', true)
        .where('guestEmail', '==', email)
        .get();

      if (!guestRequestsQuery.empty) {
        const batch = db.batch();
        guestRequestsQuery.docs.forEach((doc) => {
          batch.update(doc.ref, {
            ownerId: uid,
            ownerName: name || 'Unknown User',
            isGuest: false,
            ownerIsVerified: false
          });
        });
        await batch.commit();
      }
    } catch (claimError) {
      console.error('Error claiming guest requests:', claimError);
    }

    // 4. Return success response (Simplified)
    console.log(`[Auth Verification] Final response for ${email}: isNewUser=${isNewUser}, uid=${uid}`);
    return res.status(200).json({
      uid,
      email,
      isNewUser
    });

  } catch (error: any) {
    console.error('[Auth Verification ERROR]:', error.message || error);
    
    // Provide more specific error message for permission issues
    const isPermissionError = error.message?.includes('permission') || error.code?.includes('permission');
    
    return res.status(isPermissionError ? 403 : 401).json({ 
      message: isPermissionError ? 'Insufficient permissions on server' : 'Authentication failed', 
      error: error.message,
      code: error.code
    });
  }
}
