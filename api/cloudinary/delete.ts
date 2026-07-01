import type { VercelRequest, VercelResponse } from '@vercel/node';
import { v2 as cloudinary } from 'cloudinary';
import { getAdminAuth } from '../_lib/firebase-admin';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized. Missing token.' });
  }

  try {
    const idToken = authHeader.split('Bearer ')[1];
    await getAdminAuth().verifyIdToken(idToken);
  } catch {
    return res.status(401).json({ error: 'Unauthorized. Invalid token.' });
  }

  const { public_id, resource_type = 'image' } = req.body;

  if (!public_id || typeof public_id !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid public_id' });
  }

  const allowedResourceTypes = ['image', 'video', 'raw'];
  if (!allowedResourceTypes.includes(resource_type)) {
    return res.status(400).json({ error: 'Invalid resource_type' });
  }

  try {
    const result = await cloudinary.uploader.destroy(public_id, {
      resource_type,
      invalidate: true,
    });

    if (result.result === 'ok' || result.result === 'not_found') {
      return res.status(200).json({ success: true, result: result.result });
    }

    return res.status(500).json({ error: 'Deletion failed' });
  } catch {
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
