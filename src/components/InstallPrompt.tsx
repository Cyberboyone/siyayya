import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Share, PlusSquare, MoreVertical } from 'lucide-react';
import { usePWAInstall } from '@/hooks/usePWAInstall';

export function InstallPrompt() {
  const { isInstallable, isInstalled, isIOS, canPromptInstall, handleInstall } = usePWAInstall();
  const [showPrompt, setShowPrompt] = useState(false);
  // True once we know there's no native one-tap prompt available (and it's
  // not iOS, which already gets its own dedicated instructions) — Android/
  // desktop Chrome only ever grants a real prompt once its own opaque
  // engagement heuristic decides to fire `beforeinstallprompt`, which can
  // simply never happen on a given visit. Without this fallback the button
  // rendered (thanks to isInstallable now always being true when not
  // installed) but tapping "Install Now" would silently no-op.
  const showManualAndroidSteps = !isIOS && !canPromptInstall;

  useEffect(() => {
    // Do not prompt when the app is already installed or running as a PWA.
    if (isInstalled) {
      setShowPrompt(false);
      return;
    }

    // Check cooldown
    const lastDismissed = localStorage.getItem('siyayya_install_dismissed');
    if (lastDismissed) {
      const dismissedDate = new Date(lastDismissed).getTime();
      const sevenDays = 7 * 24 * 60 * 60 * 1000;
      if (Date.now() - dismissedDate < sevenDays) {
        return; // Still in cooldown period
      }
    }



    // Engagement Tracking
    let timeSpent = 0;
    const timer = setInterval(() => {
      timeSpent += 5;
      
      const pageViews = parseInt(sessionStorage.getItem('siyayya_page_views') || '0', 10);
      
      // Trigger logic: > 45 seconds OR >= 2 page views. `isInstallable` now
      // covers both the native-prompt (Chrome/Edge/Android) and iOS
      // manual-instructions cases, so this prompt reaches users on either
      // platform instead of silently never firing on iOS (which never
      // fires `beforeinstallprompt` at all).
      if ((timeSpent >= 45 || pageViews >= 2) && isInstallable && !showPrompt) {
        setShowPrompt(true);
        clearInterval(timer);
      }
    }, 5000);

    return () => {
      clearInterval(timer);
    };
  }, [isInstallable, isInstalled, showPrompt]);

  const onInstallClick = async () => {
    if (isIOS) return; // iOS has no programmatic install — instructions are shown inline instead.
    const success = await handleInstall();
    if (success) {
      setShowPrompt(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('siyayya_install_dismissed', new Date().toISOString());
  };

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-20 left-4 right-4 md:left-auto md:right-8 md:w-96 z-50 glass rounded-3xl p-5 shadow-2xl border border-white/20"
        >
          <button 
            onClick={handleDismiss}
            className="absolute top-3 right-3 text-textMuted hover:text-textPrimary"
          >
            <X className="h-5 w-5" />
          </button>
          
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shrink-0 shadow-lg overflow-hidden">
              <img src="/pwa-192x192.png" alt="" className="h-full w-full object-cover" />
            </div>
            
            <div>
              <h3 className="font-black text-sm uppercase tracking-wider text-textPrimary">
                Install Siyayya
              </h3>
              <p className="text-xs text-textMuted mt-1 leading-relaxed">
                Get faster access to campus deals, instant notifications, and a better marketplace experience.
              </p>
            </div>
          </div>

          {isIOS ? (
            <div className="mt-4 rounded-2xl bg-black/5 p-4 space-y-2.5">
              <div className="flex items-center gap-2.5 text-xs font-bold text-textPrimary">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-white text-[10px] font-black">1</span>
                Tap the <Share className="h-3.5 w-3.5 inline mx-0.5" /> Share icon in your browser toolbar
              </div>
              <div className="flex items-center gap-2.5 text-xs font-bold text-textPrimary">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-white text-[10px] font-black">2</span>
                Scroll down and tap <PlusSquare className="h-3.5 w-3.5 inline mx-0.5" /> "Add to Home Screen"
              </div>
            </div>
          ) : showManualAndroidSteps ? (
            <div className="mt-4 rounded-2xl bg-black/5 p-4 space-y-2.5">
              <div className="flex items-center gap-2.5 text-xs font-bold text-textPrimary">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-white text-[10px] font-black">1</span>
                Tap the <MoreVertical className="h-3.5 w-3.5 inline mx-0.5" /> menu (⋮) in your browser toolbar
              </div>
              <div className="flex items-center gap-2.5 text-xs font-bold text-textPrimary">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-white text-[10px] font-black">2</span>
                Tap "Install app" or "Add to Home screen"
              </div>
            </div>
          ) : null}
          
          <div className="flex gap-3 mt-5">
            <button
              onClick={handleDismiss}
              className="flex-1 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest text-textMuted bg-black/5 hover:bg-black/10 transition-colors"
            >
              Maybe Later
            </button>
            {!isIOS && !showManualAndroidSteps && (
              <button
                onClick={onInstallClick}
                className="flex-1 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest text-white bg-primary hover:bg-primary/90 shadow-lg shadow-primary/30 transition-all"
              >
                Install Now
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
