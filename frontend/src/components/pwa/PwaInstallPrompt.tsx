'use client';

import { useEffect, useMemo, useState } from 'react';
import { Download, Share2, Smartphone, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms?: string[];
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

const DISMISS_KEY = 'pwa-install-dismissed-at';
const DISMISS_COOLDOWN_MS = 3 * 24 * 60 * 60 * 1000;

function isIosSafari() {
  if (typeof navigator === 'undefined') return false;
  const userAgent = navigator.userAgent;
  const isIos = /iPad|iPhone|iPod/.test(userAgent);
  const isWebKit = /WebKit/.test(userAgent);
  const isCriOS = /CriOS/.test(userAgent);
  const isFxiOS = /FxiOS/.test(userAgent);

  return isIos && isWebKit && !isCriOS && !isFxiOS;
}

function isStandalone() {
  if (typeof window === 'undefined') return false;

  return window.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
}

export default function PwaInstallPrompt({
  language,
  className = '',
}: {
  language: 'ka' | 'en';
  className?: string;
}) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(true);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mobileMediaQuery = window.matchMedia('(pointer: coarse), (max-width: 1024px)');
    const updateState = () => {
      setIsMobile(mobileMediaQuery.matches);
      setIsInstalled(isStandalone());
      setIsIos(isIosSafari());
      const dismissedAt = Number(window.localStorage.getItem(DISMISS_KEY) || 0);
      setDismissed(Boolean(dismissedAt && Date.now() - dismissedAt < DISMISS_COOLDOWN_MS));
    };

    const onBeforeInstallPrompt = (event: Event) => {
      const promptEvent = event as BeforeInstallPromptEvent;
      promptEvent.preventDefault();
      setDeferredPrompt(promptEvent);
      updateState();
    };

    const onInstalled = () => {
      setDeferredPrompt(null);
      setIsInstalled(true);
    };

    updateState();
    mobileMediaQuery.addEventListener?.('change', updateState);
    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onInstalled);

    return () => {
      mobileMediaQuery.removeEventListener?.('change', updateState);
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const content = useMemo(() => {
    if (language === 'ka') {
      return {
        eyebrow: 'აპის რეჟიმი',
        title: 'დაამატე მთავარ ეკრანზე',
        body: deferredPrompt
          ? 'გახსენი ComicBooksGeo როგორც აპი, სწრაფი დაბრუნებით და უფრო სუფთა მობილური ხედით.'
          : 'დაამატე ComicBooksGeo მთავარ ეკრანზე, რომ საიტი აპივით გაიხსნას.',
        button: deferredPrompt ? 'დაყენება' : 'ინსტრუქცია',
        iosHint: 'Safari-ში დააჭირე Share ღილაკს და შემდეგ Add to Home Screen.',
        later: 'მოგვიანებით',
      };
    }

    return {
      eyebrow: 'App Mode',
      title: 'Add this to your home screen',
      body: deferredPrompt
        ? 'Open ComicBooksGeo like an app with faster return access and a cleaner mobile view.'
        : 'Add ComicBooksGeo to your home screen so it launches like an app.',
      button: deferredPrompt ? 'Install App' : 'How to Install',
      iosHint: 'In Safari, tap Share and then choose Add to Home Screen.',
      later: 'Later',
    };
  }, [deferredPrompt, language]);

  const dismiss = () => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
    }
    setDismissed(true);
  };

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      try {
        await deferredPrompt.userChoice;
      } finally {
        setDeferredPrompt(null);
      }
      return;
    }

    dismiss();
  };

  if (!isMobile || isInstalled || dismissed || (!deferredPrompt && !isIos)) {
    return null;
  }

  return (
    <aside className={`pwa-install-card md:hidden ${className}`}>
      <div className="flex items-start gap-3">
        <div className="pwa-install-icon">
          {deferredPrompt ? <Download className="w-5 h-5" /> : <Smartphone className="w-5 h-5" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="pwa-install-eyebrow">{content.eyebrow}</p>
          <h2 className="pwa-install-title">{content.title}</h2>
          <p className="pwa-install-body">{content.body}</p>
          {!deferredPrompt && isIos && (
            <p className="pwa-install-hint">
              <Share2 className="w-3.5 h-3.5 shrink-0" />
              <span>{content.iosHint}</span>
            </p>
          )}
          <div className="mt-4 flex items-center gap-2">
            <button type="button" onClick={handleInstall} className="pwa-install-primary">
              {content.button}
            </button>
            <button type="button" onClick={dismiss} className="pwa-install-secondary">
              {content.later}
            </button>
          </div>
        </div>
        <button type="button" onClick={dismiss} className="pwa-install-close" aria-label="Dismiss install prompt">
          <X className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
}
