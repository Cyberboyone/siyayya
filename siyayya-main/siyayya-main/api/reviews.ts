import { VercelRequest, VercelResponse } from '@vercel/node';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin
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
    console.error('[Reviews API] Firebase initialization error:', error);
  }
}

const db = admin.firestore();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { id } = req.query; // Review ID
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized. Missing authentication token.' });
  }

  const idToken = authHeader.split('Bearer ')[1];

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const { uid } = decodedToken;

    if (req.method === 'PUT') {
      const { rating, comment } = req.body;
      
      if (!id || typeof id !== 'string') return res.status(400).json({ message: 'Missing review ID.' });
      if (!rating || !comment) return res.status(400).json({ message: 'Missing rating or comment.' });

      const reviewRef = db.collection('reviews').doc(id);
      const reviewDoc = await reviewRef.get();

      if (!reviewDoc.exists) return res.status(404).json({ message: 'Review not found.' });
      
      const data = reviewDoc.data();
      if (data?.userId !== uid) {
        return res.status(403).json({ message: 'Forbidden. You can only edit your own reviews.' });
      }

      await reviewRef.update({
        rating,
        comment,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return res.status(200).json({ message: 'Review updated successfully.' });
    }

    if (req.method === 'DELETE') {
      if (!id || typeof id !== 'string') return res.status(400).json({ message: 'Missing review ID.' });

      const reviewRef = db.collection('reviews').doc(id);
      const reviewDoc = await reviewRef.get();

      if (!reviewDoc.exists) return res.status(404).json({ message: 'Review not found.' });

      const data = reviewDoc.data();
      
      // Allow the review owner OR an admin to delete
      const adminEmails = (process.env.ADMIN_EMAILS || "")
        .split(",")
        .map(e => e.trim().toLowerCase())
        .filter(Boolean);
      const isUserAdmin = adminEmails.includes(decodedToken.email?.toLowerCase() || "");
      
      if (data?.userId !== uid && !isUserAdmin) {
        return res.status(403).json({ message: 'Forbidden. You can only delete your own reviews.' });
      }

      await reviewRef.delete();
      return res.status(200).json({ message: 'Review deleted successfully.' });
    }

    return res.status(405).json({ message: 'Method Not Allowed' });
  } catch (error: any) {
    console.error('[Reviews API Error]:', error.message || error);
    return res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
}
