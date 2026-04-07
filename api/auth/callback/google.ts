import { VercelRequest, VercelResponse } from '@vercel/node';
import { OAuth2Client } from 'google-auth-library';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
      databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}.firebaseio.com`
    });
  } catch (error) {
    console.error('Firebase admin initialization error', error);
  }
}

const client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5173/api/auth/callback/google'
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { code } = req.query;

  if (!code) {
    return res.status(400).send('Authorization code missing');
  }

  try {
    // 1. Exchange code for tokens
    const { tokens } = await client.getToken(code as string);
    client.setCredentials(tokens);

    // 2. Get user info from Google
    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token!,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();

    if (!payload || !payload.email) {
      throw new Error('Invalid token payload');
    }

    const { sub: googleId, email, name, picture } = payload;

    // 3. Create or update user in Firestore
    const db = admin.firestore();
    const userRef = db.collection('users').doc(googleId);
    const userDoc = await userRef.get();

    let isNewUser = false;
    if (!userDoc.exists) {
      isNewUser = true;
      const assignedRole = email === "muhammadmusab372@gmail.com" ? "admin" : "user";
      
      await userRef.set({
        id: googleId,
        name: name || 'Unknown User',
        email: email,
        avatar: picture || '',
        businessName: '', // Mandatory field to be filled later
        role: assignedRole,
        status: 'active',
        rating: 0,
        reviewCount: 0,
        isVerified: true,
        joinedAt: new Date().toISOString(),
      });
    } else {
      const assignedRole = email === "muhammadmusab372@gmail.com" ? "admin" : "user";
      
      // Update existing user info and enforce role
      await userRef.update({
        name: name || userDoc.data()?.name,
        avatar: picture || userDoc.data()?.avatar,
        role: assignedRole
      });
      // Check if businessName is still missing
      if (!userDoc.data()?.businessName) {
        isNewUser = true;
      }
    }

    // --- NEW: Claim Guest Requests ---
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
            ownerId: googleId,
            ownerName: name || 'Unknown User',
            isGuest: false,
            // We can optionally nullify guestEmail, or keep it
            ownerIsVerified: true // Set to true since Google auth users start verified in this system
          });
        });
        await batch.commit();
        console.log(`Successfully claimed ${guestRequestsQuery.size} guest requests for ${email}`);
      }
    } catch (claimError) {
      console.error('Error claiming guest requests:', claimError);
      // We don't fail the login if claiming fails
    }

    // 4. Create Firebase Custom Token
    const customToken = await admin.auth().createCustomToken(googleId);

    // 5. Redirect back to frontend with the token
    const frontendUrl = process.env.VITE_APP_URL || 'http://localhost:5173';
    const redirectUrl = new URL(`${frontendUrl}/signin`);
    redirectUrl.searchParams.set('token', customToken);
    if (isNewUser) {
      redirectUrl.searchParams.set('new', 'true');
    }

    return res.redirect(redirectUrl.toString());
  } catch (error) {
    console.error('OAuth Callback Error:', error);
    return res.status(500).send('Authentication failed');
  }
}
