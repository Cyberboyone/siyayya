import { VercelRequest, VercelResponse } from '@vercel/node';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  try {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;

    console.log("[Auth Admin] Diagnostics - Project ID:", !!projectId);
    console.log("[Auth Admin] Diagnostics - Client Email:", !!clientEmail);
    console.log("[Auth Admin] Diagnostics - Private Key Present:", !!privateKey);

    if (!privateKey || privateKey.length < 100) {
      console.error('[Auth Admin] FIREBASE_PRIVATE_KEY is missing or too short. Check Vercel environment variables.');
    } else {
      console.log("[Auth Admin] Private Key found, length:", privateKey.length);
    }

    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey: privateKey?.replace(/\\n/g, '\n'),
      }),
      databaseURL: `https://${projectId}.firebaseio.com`
    });
    console.log('[Auth Admin] Firebase admin initialized successfully.');
  } catch (error) {
    console.error('[Auth Admin] Initialisation error:', error);
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

    // 2. Create or update user in Firestore
    const db = admin.firestore();
    const userRef = db.collection('users').doc(uid);
    const userDoc = await userRef.get();

    let isNewUser = false;

    // Read admin emails from environment variable
    const adminEmails = (process.env.ADMIN_EMAILS || "")
      .split(",")
      .map(e => e.trim().toLowerCase())
      .filter(Boolean);
    const assignedRole = adminEmails.includes(email.toLowerCase()) ? "admin" : (userDoc.data()?.role || "user");
    console.log(`[Auth Verification] Handshake - Email: ${email}, Role: ${assignedRole}`);
 
    if (!userDoc.exists) {
      isNewUser = true;
      
      await userRef.set({
        id: uid,
        name: name || 'Unknown User',
        email: email,
        avatar: picture || '',
        businessName: '',
        role: assignedRole,
        status: 'active',
        rating: 0,
        reviewCount: 0,
        isVerified: false,
        joinedAt: new Date().toISOString(),
      });
      console.log(`[Auth Verification] New user created: ${email}`);
    } else {
      // Update existing user info and enforce role from config
      await userRef.update({
        name: name || userDoc.data()?.name,
        email: email || userDoc.data()?.email, 
        avatar: picture || userDoc.data()?.avatar,
        role: assignedRole,
      });
      
      // Check if businessName is still missing
      if (!userDoc.data()?.businessName) {
        isNewUser = true;
      }
      console.log(`[Auth Verification] Existing user session refreshed: ${email}`);
    }
 
    // 3. Claim Guest Requests (Reuse logic from callback)
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
        console.log(`Successfully claimed ${guestRequestsQuery.size} guest requests for ${email}`);
      }
    } catch (claimError) {
      console.error('Error claiming guest requests:', claimError);
    }
 
    // 4. Return success response
    return res.status(200).json({
      uid,
      email,
      isNewUser,
      role: existingRole
    });

  } catch (error: any) {
    console.error('[Auth Verification ERROR]:', error.message || error);
    return res.status(401).json({ 
      message: 'Authentication failed', 
      error: error.message 
    });
  }
}
