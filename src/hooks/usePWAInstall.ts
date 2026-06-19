import { useState, useEffect } from 'react';

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

let globalDeferredPrompt: BeforeInstallPromptEvent | null = null;
let listeners: Array<(prompt: BeforeInstallPromptEvent | null) => void> = [];

const notifyListeners = () => {
  listeners.forEach(listener => listener(globalDeferredPrompt));
};

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault();
    globalDeferredPrompt = e as BeforeInstallPromptEvent;
    notifyListeners();
  });
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(globalDeferredPrompt);

  useEffect(() => {
    const listener = (p: BeforeInstallPromptEvent | null) => setDeferredPrompt(p);
    listeners.push(listener);
    return () => {
      listeners = listeners.filter(l => l !== listener);
    };
  }, []);

  const handleInstall = async (): Promise<boolean> => {
    if (!deferredPrompt) return false;
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      globalDeferredPrompt = null;
      notifyListeners();
      return true;
    }
    return false;
  };

  return { isInstallable: !!deferredPrompt, handleInstall };
}
