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
  // (Chrome/Edge/Android/Desktop) we can trigger directly. `isIOS` = no
  // native prompt exists on this platform at all, so the UI must fall back
  // to manual Share -> Add to Home Screen instructions.
  //
  // `isInstallable` is now ALWAYS true when the app isn't installed —
  // previously it required `!!deferredPrompt || isIOS`, so on Android/
  // Chrome the Install button/prompt only ever appeared if Chrome had
  // already decided (via its own internal, undocumented "engagement
  // heuristic" — roughly: the user must have tapped the page at least once
  // AND spent ~30s on the domain, but the exact scoring is opaque and can
  // simply never fire for a given visit) to dispatch
  // `beforeinstallprompt`. If that event never fired, the button silently
  // never showed up anywhere, with no fallback — exactly the bug reported
  // ("install button not visible on my phone"). Now the button/prompt is
  // always shown once not installed; if a real native prompt is available
  // it's used (one-tap install), and if not (Android Chrome that hasn't
  // fired the event yet, or any other browser), manual "tap the browser
  // menu -> Install app" instructions are shown instead — so there is
  // always some way to install, regardless of Chrome's internal timing.
  return {
    isInstallable: !isInstalled,
    canPromptInstall: !isInstalled && !!deferredPrompt,
    isIOS: !isInstalled && isIOS,
    isInstalled,
    handleInstall,
  };
}
