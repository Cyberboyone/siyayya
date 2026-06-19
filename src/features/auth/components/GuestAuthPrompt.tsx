import React, { useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, ShieldCheck, MessageCircle, Heart, Package } from "lucide-react";
import { useAuth } from "@/features/auth/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

type PromptAction = "chat" | "save" | "post";

interface GuestAuthPromptProps {
  isOpen: boolean;
  onClose: () => void;
  action?: PromptAction;
}

const actionConfig: Record<PromptAction, { icon: React.ElementType; title: string; description: string }> = {
  chat: {
    icon: MessageCircle,
    title: "Chat with Sellers",
    description: "Sign in to message sellers and negotiate prices directly.",
  },
  save: {
    icon: Heart,
    title: "Save Items",
    description: "Sign in to save items to your wishlist and get notified of price changes.",
  },
  post: {
    icon: Package,
    title: "Post Products",
    description: "Sign in to list your items for sale to thousands of campus buyers.",
  },
};

export const GuestAuthPrompt: React.FC<GuestAuthPromptProps> = ({
  isOpen,
  onClose,
  action = "save",
}) => {
  const { loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const config = actionConfig[action];
  const ActionIcon = config.icon;

  const handleGoogleSignIn = async () => {
    try {
      setIsSigningIn(true);
      await loginWithGoogle();
      onClose();
    } catch {
      // Error toast is handled in AuthContext
    } finally {
      setIsSigningIn(false);
    }
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-x-4 bottom-4 md:bottom-auto md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 z-[101] w-auto md:w-full md:max-w-sm"
          >
            <div className="rounded-3xl bg-white dark:bg-surface border border-black/5 dark:border-white/10 shadow-2xl overflow-hidden">
              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 h-8 w-8 rounded-full bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors z-10"
              >
                <X className="h-4 w-4 text-textMuted" />
              </button>

              <div className="p-6 md:p-8 text-center">
                {/* Icon */}
                <div className="mx-auto mb-5 h-16 w-16 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                  <ActionIcon className="h-8 w-8 text-primary" />
                </div>

                {/* Title & description */}
                <h3 className="text-lg font-black text-textPrimary tracking-tight mb-2">
                  {config.title}
                </h3>
                <p className="text-sm text-textMuted leading-relaxed mb-6">
                  {config.description}
                </p>

                {/* Google Sign In Button */}
                <button
                  onClick={handleGoogleSignIn}
                  disabled={isSigningIn}
                  className="w-full flex items-center justify-center gap-3 px-6 py-3.5 rounded-2xl bg-textPrimary text-white dark:bg-white dark:text-textPrimary font-bold text-sm hover:opacity-90 active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSigningIn ? (
                    <div className="h-5 w-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  ) : (
                    <svg className="h-5 w-5" viewBox="0 0 24 24">
                      <path
                        fill="currentColor"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                        opacity="0.6"
                      />
                      <path
                        fill="currentColor"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        opacity="0.8"
                      />
                      <path
                        fill="currentColor"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        opacity="0.6"
                      />
                      <path
                        fill="currentColor"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                  )}
                  {isSigningIn ? "Signing in..." : "Continue with Google"}
                </button>

                {/* Trust indicators */}
                <div className="mt-5 flex items-center justify-center gap-2 text-[10px] text-textMuted">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                  <span>Trusted by 1000+ campus students</span>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
};
