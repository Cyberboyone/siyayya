import { useEffect } from 'react';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { useReferralProgram } from '@/hooks/useReferralProgram';

export function ReferralBootstrap() {
  const { user, isLoading } = useAuth();
  const { claimStoredReferral, ensureReferralCode } = useReferralProgram();

  useEffect(() => {
    if (isLoading || !user) return;
    ensureReferralCode();
    claimStoredReferral();
  }, [user, isLoading, ensureReferralCode, claimStoredReferral]);

  return null;
}
