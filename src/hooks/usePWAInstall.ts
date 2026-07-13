import { useState, useEffect } from 'react';

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

type PromptListener = (prompt: BeforeInstallPromptEvent | null) => void;
type InstalledListener = (installed: boolean) => void;

let globalDeferredPrompt: BeforeInstallPromptEvent | null = null;
let promptListeners: PromptListener[] = [];
let installedListeners: InstalledListener[] = [];

const INSTALL_STORAGE_KEY = 'siyayya_pwa_installed';

const isStandaloneDisplayMode = () => {
  if (typeof window === 'undefined') return false;

  const navigatorWithStandalone = window.navigator as Navigator & { standalone?: boolean };

  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    window.matchMedia('(display-mode: minimal-ui)').matches ||
    navigatorWithStandalone.standalone === true ||
    document.referrer.startsWith('android-app://')
  );
};

const hasInstallMarker = () => {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(INSTALL_STORAGE_KEY) === 'true';
};

const getInitialInstalledState = () => isStandaloneDisplayMode() || hasInstallMarker();

let globalIsInstalled = getInitialInstalledState();

// iOS Safari (and other iOS browsers, since they all use WebKit) never fires
// `beforeinstallprompt` — there is no native install API at all. The only
// way to install there is the manual Share -> "Add to Home Screen" flow, so
// we detect the platform up front and surface it separately from
// `isInstallable`, letting the UI show instructions instead of a native
// prompt button when there's no other way to trigger installation.
const detectIsIOS = () => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || (navigator as any).vendor || (window as any).opera || '';
  const isIOSDevice = /iPad|iPhone|iPod/.test(ua);
  // iPadOS 13+ reports as "Macintosh" but exposes touch support, unlike a
  // real Mac.
  const isIPadOS13Plus = navigator.platform === 'MacIntel' && (navigator as any).maxTouchPoints > 1;
  return isIOSDevice || isIPadOS13Plus;
};

const isIOS = detectIsIOS();

const notifyPromptListeners = () => {
  promptListeners.forEach(listener => listener(globalDeferredPrompt));
};

const notifyInstalledListeners = () => {
  installedListeners.forEach(listener => listener(globalIsInstalled));
};

const setInstalled = (installed: boolean) => {
  globalIsInstalled = installed;

  if (typeof window !== 'undefined' && installed) {
    localStorage.setItem(INSTALL_STORAGE_KEY, 'true');
    globalDeferredPrompt = null;
    notifyPromptListeners();
  }

  notifyInstalledListeners();
};

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault();

    if (getInitialInstalledState()) {
      setInstalled(true);
      return;
    }

    globalDeferredPrompt = e as BeforeInstallPromptEvent;
    notifyPromptListeners();
  });

  window.addEventListener('appinstalled', () => {
    setInstalled(true);
  });
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(globalDeferredPrompt);
  const [isInstalled, setIsInstalled] = useState(globalIsInstalled);

  useEffect(() => {
    const promptListener: PromptListener = (p) => setDeferredPrompt(p);
    const installedListener: InstalledListener = (installed) => setIsInstalled(installed);

    promptListeners.push(promptListener);
    installedListeners.push(installedListener);

    const updateInstalledState = () => {
      if (getInitialInstalledState()) {
        setInstalled(true);
      }
    };

    updateInstalledState();

    const mediaQueries = [
      window.matchMedia('(display-mode: standalone)'),
      window.matchMedia('(display-mode: fullscreen)'),
      window.matchMedia('(display-mode: minimal-ui)'),
    ];

    mediaQueries.forEach(query => query.addEventListener('change', updateInstalledState));

    return () => {
      promptListeners = promptListeners.filter(listener => listener !== promptListener);
      installedListeners = installedListeners.filter(listener => listener !== installedListener);
      mediaQueries.forEach(query => query.removeEventListener('change', updateInstalledState));
    };
  }, []);

  const handleInstall = async (): Promise<boolean> => {
    if (isInstalled || !deferredPrompt) return false;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    globalDeferredPrompt = null;
    notifyPromptListeners();

    if (outcome === 'accepted') {
      setInstalled(true);
      return true;
    }

    return false;
  };

  // `canPromptInstall` = the browser gave us a real native install prompt
  // (Chrome/Edge/Android). `isIOS` = no native prompt exists on this
  // platform at all, so the UI must fall back to manual instructions.
  // `isInstallable` stays true for either case so any existing "should I
  // show an install CTA at all" check keeps working without changes.
  return {
    isInstallable: !isInstalled && (!!deferredPrompt || isIOS),
    canPromptInstall: !isInstalled && !!deferredPrompt,
    isIOS: !isInstalled && isIOS,
    isInstalled,
    handleInstall,
  };
}
