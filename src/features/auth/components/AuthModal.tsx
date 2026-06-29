import React, { useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, ShieldCheck } from "lucide-react";
import { useAuth } from "@/features/auth/contexts/AuthContext";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { loginWithGoogle } = useAuth();
  const [isSigningIn, setIsSigningIn] = useState(false);

  const handleGoogleSignIn = async () => {
    try {
      setIsSigningIn(true);
      const result = await loginWithGoogle();
      onSuccess?.();
      onClose();
    } catch {
      // Error handled in context
    } finally {
      setIsSigningIn(false);
    }
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed inset-x-4 bottom-4 md:bottom-auto md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 z-[101] w-auto md:w-full md:max-w-sm"
          >
            <div className="rounded-3xl bg-white dark:bg-surface border border-black/5 dark:border-white/10 shadow-2xl overflow-hidden p-6 md:p-8 text-center relative">
              <button
                onClick={onClose}
                className="absolute top-4 right-4 h-8 w-8 rounded-full bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors z-10"
              >
                <X className="h-4 w-4 text-textMuted" />
              </button>

              <>
                <h3 className="text-xl font-black text-textPrimary tracking-tight mb-2">
                  Quick Sign In
                </h3>
                <p className="text-sm text-textMuted leading-relaxed mb-6">
                  Sign in with Google to message sellers, negotiate prices, and save your favorite items.
                </p>

                <div className="space-y-3">
                  <button
                    onClick={handleGoogleSignIn}
                    disabled={isSigningIn}
                    className="w-full flex items-center justify-center gap-3 px-6 py-3.5 rounded-2xl bg-textPrimary text-white dark:bg-white dark:text-textPrimary font-bold text-sm hover:opacity-90 transition-all disabled:opacity-50"
                  >
                    {isSigningIn ? "Signing in..." : "Continue with Google"}
                  </button>
                </div>
                
                <div className="mt-5 flex items-center justify-center gap-2 text-[10px] text-textMuted">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                  <span>Secure Google authentication</span>
                </div>
              </>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
};
