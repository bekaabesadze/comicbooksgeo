'use client';

import { useEffect } from 'react';

function isStandaloneDisplayMode() {
  if (typeof window === 'undefined') return false;

  return window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    ('standalone' in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
}

export default function PwaBoot() {
  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    const updateStandaloneClass = () => {
      document.documentElement.classList.toggle('pwa-standalone', isStandaloneDisplayMode());
    };

    updateStandaloneClass();
    const standaloneMediaQuery = window.matchMedia('(display-mode: standalone)');
    const fullscreenMediaQuery = window.matchMedia('(display-mode: fullscreen)');

    const onModeChange = () => updateStandaloneClass();
    standaloneMediaQuery.addEventListener?.('change', onModeChange);
    fullscreenMediaQuery.addEventListener?.('change', onModeChange);

    const isLocalhost = /^(localhost|127(?:\.\d+){3}|\[::1\])$/.test(window.location.hostname);
    const canRegisterServiceWorker = 'serviceWorker' in navigator && (window.isSecureContext || isLocalhost);

    if (canRegisterServiceWorker) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch((error) => {
          console.error('Service worker registration failed', error);
        });
      }, { once: true });
    }

    return () => {
      standaloneMediaQuery.removeEventListener?.('change', onModeChange);
      fullscreenMediaQuery.removeEventListener?.('change', onModeChange);
    };
  }, []);

  return null;
}
