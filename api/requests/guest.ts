import { VercelRequest, VercelResponse } from '@vercel/node';
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const db = admin.firestore();
    const { title, description, category, price, contactPhone, whatsapp, email, name, expectedMathResult, actualMathResult } = req.body;
    
    // IP tracking for rate limiting
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown-ip';

    // Basic Input Validation
    if (!title || !description || !category || !email || !name) {
      return res.status(400).json({ error: 'Missing required fields: Title, description, category, email, and name are required.' });
    }

    // Math CAPTCHA validation
    if (expectedMathResult === undefined || actualMathResult === undefined || parseInt(actualMathResult) !== parseInt(expectedMathResult)) {
      return res.status(400).json({ error: 'CAPTCHA verification failed. Please check your math.' });
    }

    // Rate Limiting (max 3 requests per hour per IP)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentRequestsQuery = await db.collection('requests')
      .where('isGuest', '==', true)
      .where('ip', '==', ip)
      .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(oneHourAgo))
      .get();

    if (recentRequestsQuery.size >= 3) {
      return res.status(429).json({ error: 'Too many requests recently. Please try again later.' });
    }

    // Store Request
    const requestDoc = {
      title,
      description,
      category,
      budget: Number(price) || 0,
      contactPhone,
      whatsapp: whatsapp || contactPhone,
      isGuest: true,
      guestEmail: email,
      guestName: name,
      ownerId: 'guest',
      ownerName: name,
      ownerIsVerified: false,
      status: 'open',
      ip: ip, // Store IP for rate limit checks
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const docRef = await db.collection('requests').add(requestDoc);

    return res.status(200).json({ success: true, id: docRef.id });
  } catch (error: any) {
    console.error('Guest request submission error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
