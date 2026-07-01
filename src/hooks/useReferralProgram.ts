import { useCallback, useEffect, useMemo, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { toast } from 'sonner';

const makeReferralCode = (uid: string) => `SIY${uid.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase()}`;

export function useReferralProgram() {
  const { user, updateProfile } = useAuth();
  const [referralCount, setReferralCount] = useState(user?.referralCount || 0);
  const [rewardCredits, setRewardCredits] = useState((user as any)?.referralRewardCredits || 0);
  const [isClaiming, setIsClaiming] = useState(false);

  const referralCode = useMemo(() => {
    if (!user?.id) return '';
    return ((user as any).referralCode || makeReferralCode(user.id)).toUpperCase();
  }, [user]);

  const inviteUrl = useMemo(() => {
    if (typeof window === 'undefined' || !referralCode) return '';
    return `${window.location.origin}/signin?ref=${encodeURIComponent(referralCode)}`;
  }, [referralCode]);

  useEffect(() => {
    if (!user?.id) return;
    const unsubscribe = onSnapshot(doc(db, 'users', user.id), (snap) => {
      const data = snap.data();
      if (!data) return;
      setReferralCount(data.referralCount || 0);
      setRewardCredits(data.referralRewardCredits || 0);
    });
    return () => unsubscribe();
  }, [user?.id]);

  const ensureReferralCode = useCallback(async () => {
    if (!user?.id || (user as any).referralCode) return;
    try {
      await updateProfile({ referralCode } as any);
    } catch (error) {
      console.warn('[Referral] Could not save referral code', error);
    }
  }, [user?.id, user, referralCode, updateProfile]);

  const claimStoredReferral = useCallback(async () => {
    if (!auth.currentUser || !user?.id || isClaiming) return;

    const storedCode = localStorage.getItem('siyayya_referral_code');
    if (!storedCode) {
      ensureReferralCode();
      return;
    }

    if (storedCode.toUpperCase() === referralCode) {
      localStorage.removeItem('siyayya_referral_code');
      ensureReferralCode();
      return;
    }

    setIsClaiming(true);
    try {
      const idToken = await auth.currentUser.getIdToken();
      const response = await fetch('/api/referrals/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken, referralCode: storedCode }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || 'Referral claim failed');

      localStorage.removeItem('siyayya_referral_code');
      if (result.claimed) {
        toast.success('Invite accepted — your friend earned referral credit.');
      }
    } catch (error) {
      console.warn('[Referral] claim failed', error);
    } finally {
      setIsClaiming(false);
    }
  }, [user?.id, referralCode, isClaiming, ensureReferralCode]);

  const shareInvite = useCallback(async () => {
    if (!inviteUrl) return;
    const text = `Join me on Siyayya, the campus marketplace for students. Use my invite link: ${inviteUrl}`;

    try {
      await ensureReferralCode();
      if (navigator.share) {
        await navigator.share({ title: 'Join Siyayya', text, url: inviteUrl });
        return;
      }
    } catch (error: any) {
      if (error?.name === 'AbortError') return;
    }

    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
  }, [inviteUrl, ensureReferralCode]);

  const copyInvite = useCallback(async () => {
    if (!inviteUrl) return;
    await ensureReferralCode();
    await navigator.clipboard.writeText(inviteUrl);
    toast.success('Invite link copied.');
  }, [inviteUrl, ensureReferralCode]);

  return {
    referralCode,
    inviteUrl,
    referralCount,
    rewardCredits,
    claimStoredReferral,
    shareInvite,
    copyInvite,
    ensureReferralCode,
    isClaiming,
  };
}
