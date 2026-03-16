'use client';

import type { ReactNode } from 'react';
import MobileTabBar from '@/components/mobile/MobileTabBar';

export default function MobileScreenShell({
  topBar,
  children,
  showTabs = true,
  immersive = false,
  className = '',
  contentClassName = '',
}: {
  topBar?: ReactNode;
  children: ReactNode;
  showTabs?: boolean;
  immersive?: boolean;
  className?: string;
  contentClassName?: string;
}) {
  return (
    <div className={`mobile-core-screen standalone-mobile-fill md:hidden ${className}`}>
      {topBar}
      <main
        className={`mobile-core-content ${showTabs ? 'mobile-core-content-with-tabs' : ''} ${
          immersive ? 'px-0' : ''
        } ${contentClassName}`}
      >
        {children}
      </main>
      {showTabs ? <MobileTabBar /> : null}
    </div>
  );
}
