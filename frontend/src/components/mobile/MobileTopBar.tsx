'use client';

import type { ReactNode } from 'react';

export default function MobileTopBar({
  title,
  subtitle,
  leading,
  actions,
  className = '',
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  leading?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header className={`mobile-core-header md:hidden ${className}`}>
      <div className="mobile-core-header-inner mobile-surface-blur-soft border border-neutral-200 bg-white/92 px-3.5 py-2.5 text-neutral-900 shadow-[0_18px_40px_rgba(15,23,42,0.08)] dark:border-white/8 dark:bg-[#071120]/92 dark:text-white dark:shadow-[0_18px_40px_rgba(3,7,18,0.32)]">
        <div className="flex items-center gap-3">
          {leading ? <div className="shrink-0">{leading}</div> : null}
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-black tracking-tight">{title}</div>
            {subtitle ? (
              <div className="truncate pt-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-blue-700/60 dark:text-blue-200/70">
                {subtitle}
              </div>
            ) : null}
          </div>
          {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
        </div>
      </div>
    </header>
  );
}
