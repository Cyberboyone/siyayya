import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAdminDb } from '../_lib/firebase-admin.js';
import admin from 'firebase-admin';
import { z } from 'zod';

const GuestRequestSchema = z.object({
  title: z.string().min(5).max(100),
  description: z.string().min(10).max(2000),
  category: z.string().min(1).max(50),
  price: z.number().min(0).max(10_000_000).optional(),
  contactPhone: z.string().min(10).max(15),
  whatsapp: z.string().max(15).optional(),
  email: z.string().email().max(200),
  name: z.string().min(2).max(100),
  captchaAnswer: z.number().int().min(2).max(20),
  honeypot: z.string().max(0, 'Bot detected').optional(),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const parsed = GuestRequestSchema.safeParse({
    ...req.body,
    price: Number(req.body.price) || 0,
    captchaAnswer: Number(req.body.captchaAnswer),
  });

  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.errors[0]?.message || 'Invalid input' });
  }

  const { title, description, category, price, contactPhone, whatsapp, email, name, captchaAnswer, honeypot } = parsed.data;

  if (honeypot) {
    return res.status(200).json({ success: true });
  }

  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
    || req.socket.remoteAddress
    || 'unknown';

  try {
    const db = getAdminDb();

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentSnap = await db.collection('requests')
      .where('isGuest', '==', true)
      .where('ip', '==', ip)
      .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(oneHourAgo))
      .get();

    if (recentSnap.size >= 3) {
      return res.status(429).json({ error: 'Too many requests. Please try again later.' });
    }

    const docRef = await db.collection('requests').add({
      title,
      description,
      category,
      budget: price || 0,
      contactPhone,
      whatsapp: whatsapp || contactPhone,
      isGuest: true,
      guestEmail: email,
      guestName: name,
      ownerId: 'guest',
      ownerName: name,
      ownerIsVerified: false,
      status: 'open',
      ip,
      captchaScore: captchaAnswer,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return res.status(200).json({ success: true, id: docRef.id });
  } catch {
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
