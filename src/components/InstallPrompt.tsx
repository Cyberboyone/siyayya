import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X } from 'lucide-react';
import { usePWAInstall } from '@/hooks/usePWAInstall';

export function InstallPrompt() {
  const { isInstallable, isInstalled, handleInstall } = usePWAInstall();
  const [showPrompt, setShowPrompt] = useState(false);

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
      
      // Trigger logic: > 45 seconds OR >= 2 page views
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
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shrink-0 shadow-lg">
              <Download className="h-6 w-6 text-white" />
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
          
          <div className="flex gap-3 mt-5">
            <button
              onClick={handleDismiss}
              className="flex-1 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest text-textMuted bg-black/5 hover:bg-black/10 transition-colors"
            >
              Maybe Later
            </button>
            <button
              onClick={onInstallClick}
              className="flex-1 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest text-white bg-primary hover:bg-primary/90 shadow-lg shadow-primary/30 transition-all"
            >
              Install Now
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
