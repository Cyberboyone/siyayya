import { VercelRequest, VercelResponse } from '@vercel/node';
import * as admin from 'firebase-admin';
import crypto from 'crypto';
import { getAdminDb } from '../_lib/firebase-admin';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) {
    console.error('[Webhook] PAYSTACK_SECRET_KEY not set');
    return res.status(500).json({ message: 'Server configuration error' });
  }

  const signature = req.headers['x-paystack-signature'];
  const hash = crypto
    .createHmac('sha512', secret)
    .update(JSON.stringify(req.body))
    .digest('hex');

  if (!signature || hash !== signature) {
    return res.status(400).json({ message: 'Invalid signature' });
  }

  const event = req.body;

  if (event.event === 'charge.success') {
    const paymentData = event.data;
    const orderId = paymentData.metadata?.order_id;
    const reference = paymentData.reference;

    if (!orderId) {
      return res.status(200).send('OK');
    }

    try {
      const db = getAdminDb();
      await db.collection('orders').doc(orderId).update({
        status: 'paid',
        paymentReference: reference,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      return res.status(200).send('OK');
    } catch {
      return res.status(500).json({ message: 'Error processing webhook' });
    }
  }

  return res.status(200).send('OK');
}
