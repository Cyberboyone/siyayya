import { VercelRequest, VercelResponse } from '@vercel/node';
import * as admin from 'firebase-admin';
import crypto from 'crypto';

// Initialize Firebase Admin
if (!admin.apps.length) {
  try {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (!projectId || !clientEmail || !privateKey) {
      const missing = [
        !projectId && 'FIREBASE_PROJECT_ID',
        !clientEmail && 'FIREBASE_CLIENT_EMAIL',
        !privateKey && 'FIREBASE_PRIVATE_KEY',
      ].filter(Boolean);
      console.error(`[Webhook API] Missing Firebase env vars: ${missing.join(', ')}. Admin SDK not initialized.`);
    } else {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey: privateKey.replace(/\\n/g, '\n'),
        }),
      });
    }
  } catch (error) {
    console.error('[Webhook API] Firebase initialization error:', error);
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) {
    console.error('PAYSTACK_SECRET_KEY is not defined');
    return res.status(500).json({ message: 'Server configuration error' });
  }

  // Verify Paystack Signature
  const hash = crypto.createHmac('sha512', secret).update(JSON.stringify(req.body)).digest('hex');
  if (hash !== req.headers['x-paystack-signature']) {
    console.warn('Invalid Paystack signature');
    return res.status(400).json({ message: 'Invalid signature' });
  }

  const event = req.body;

  if (event.event === 'charge.success') {
    const paymentData = event.data;
    const orderId = paymentData.metadata?.order_id;
    const reference = paymentData.reference;

    if (!orderId) {
      console.warn('Webhook received charge.success but no order_id in metadata');
      return res.status(200).send('OK - No order_id'); // Acknowledge to stop retries
    }

    try {
      // Update order status to paid in Firestore using Admin SDK
      const orderRef = admin.firestore().collection('orders').doc(orderId);
      
      await orderRef.update({
        status: 'paid',
        paymentReference: reference,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      console.log(`Successfully updated order ${orderId} to paid`);
      return res.status(200).send('OK');
    } catch (error) {
      console.error('Error updating order:', error);
      return res.status(500).json({ message: 'Error processing webhook' });
    }
  }

  // Acknowledge other events
  return res.status(200).send('OK');
}
