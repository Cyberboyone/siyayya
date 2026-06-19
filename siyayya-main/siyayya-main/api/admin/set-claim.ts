import { VercelRequest, VercelResponse } from '@vercel/node';
import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  try {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;

    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey: privateKey?.replace(/\\n/g, '\n'),
      }),
    });
  } catch (error) {
    console.error('[Set-Claim API] Firebase initialization error:', error);
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized. Missing token.' });
  }

  const idToken = authHeader.split('Bearer ')[1];

  try {
    // 1. Verify who is making the request
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const callerUid = decodedToken.uid;
    const callerEmail = decodedToken.email;

    // 2. Check if caller is authorized to set claims
    // Allow if they already have the admin claim, OR if they are in the hardcoded ADMIN_EMAILS list
    const adminEmails = (process.env.ADMIN_EMAILS || "")
      .split(",")
      .map(e => e.trim().toLowerCase())
      .filter(Boolean);

    const isEmailAdmin = adminEmails.includes(callerEmail?.toLowerCase() || "");
    const hasAdminClaim = decodedToken.admin === true;

    if (!isEmailAdmin && !hasAdminClaim) {
      return res.status(403).json({ message: 'Forbidden. You do not have permission to set admin claims.' });
    }

    // 3. Set the claim for the requested user
    const { targetUid, isAdmin } = req.body;
    
    if (!targetUid || typeof targetUid !== 'string') {
      return res.status(400).json({ message: 'Missing or invalid targetUid.' });
    }

    await admin.auth().setCustomUserClaims(targetUid, { admin: !!isAdmin });

    // Update the firestore user document to reflect the change as well (for UI convenience)
    await admin.firestore().collection('users').doc(targetUid).update({
      account_type: isAdmin ? 'admin' : 'buyer'
    });

    return res.status(200).json({ 
      message: `Successfully set admin claim to ${!!isAdmin} for user ${targetUid}` 
    });
  } catch (error: any) {
    console.error('[Set-Claim API Error]:', error.message || error);
    // Do not expose internal error details to client
    return res.status(500).json({ message: 'Internal Server Error' });
  }
}
