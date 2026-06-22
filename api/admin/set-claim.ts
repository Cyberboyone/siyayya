import { VercelRequest, VercelResponse } from '@vercel/node';
import { getAdminAuth, getAdminDb } from '../_lib/firebase-admin';
import { z } from 'zod';

const SetClaimSchema = z.object({
  targetUid: z.string().min(1).max(128),
  isAdmin: z.boolean(),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized.' });
  }

  const idToken = authHeader.split('Bearer ')[1];

  try {
    const auth = getAdminAuth();
    const decodedToken = await auth.verifyIdToken(idToken);

    const adminEmails = (process.env.ADMIN_EMAILS || '')
      .split(',').map(e => e.trim().toLowerCase()).filter(Boolean);

    const isEmailAdmin = adminEmails.includes(decodedToken.email?.toLowerCase() || '');
    const hasAdminClaim = decodedToken.admin === true;

    if (!isEmailAdmin && !hasAdminClaim) {
      return res.status(403).json({ message: 'Forbidden.' });
    }

    const parsed = SetClaimSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.errors[0]?.message || 'Invalid input' });
    }

    const { targetUid, isAdmin: makeAdmin } = parsed.data;

    await auth.setCustomUserClaims(targetUid, { admin: makeAdmin });
    await getAdminDb().collection('users').doc(targetUid).update({
      account_type: makeAdmin ? 'admin' : 'buyer',
    });

    return res.status(200).json({
      message: `Admin claim set to ${makeAdmin} for user ${targetUid}`,
    });
  } catch {
    return res.status(500).json({ message: 'Internal Server Error' });
  }
}
