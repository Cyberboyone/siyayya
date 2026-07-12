import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAdminAuth, getAdminDb } from '../_lib/firebase-admin.js';
import { z } from 'zod';

// Only this single account may grant or revoke admin access. Every other
// admin (even ones promoted through this very endpoint) can manage users,
// listings, and reports, but must never be able to escalate anyone's
// privileges — including their own — so this stays hardcoded rather than
// reading from the ADMIN_EMAILS list, which can contain multiple people.
const SUPER_ADMIN_EMAIL = 'muhammadmusab372@gmail.com';

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

    const callerEmail = (decodedToken.email || '').toLowerCase();
    const isCallerSuperAdmin = callerEmail === SUPER_ADMIN_EMAIL;

    if (!isCallerSuperAdmin) {
      return res.status(403).json({ message: 'Only the super admin can grant or revoke admin access.' });
    }

    const parsed = SetClaimSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.errors[0]?.message || 'Invalid input' });
    }

    const { targetUid, isAdmin: makeAdmin } = parsed.data;

    // The super admin account can never be demoted, including by itself.
    const targetUser = await auth.getUser(targetUid).catch(() => null);
    if (!makeAdmin && (targetUser?.email || '').toLowerCase() === SUPER_ADMIN_EMAIL) {
      return res.status(400).json({ message: 'The super admin account cannot be demoted.' });
    }

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
