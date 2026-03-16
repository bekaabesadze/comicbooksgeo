'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { House, Trophy, User } from 'lucide-react';

const TAB_ITEMS = [
  { href: '/', label: 'Home', icon: House },
  { href: '/leaderboard', label: 'Leaderboard', icon: Trophy },
  { href: '/profile', label: 'Profile', icon: User },
];

export default function MobileTabBar() {
  const pathname = usePathname();

  return (
    <nav className="mobile-core-tabbar mobile-surface-blur md:hidden border border-neutral-200 bg-white/96 text-neutral-900 shadow-[0_24px_48px_rgba(15,23,42,0.12)] dark:border-white/8 dark:bg-[#06101d]/95 dark:text-white dark:shadow-[0_24px_48px_rgba(2,8,23,0.35)]">
      <div className="grid h-full grid-cols-3 gap-2">
        {TAB_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              className={`mobile-touch-target flex h-full flex-col items-center justify-center rounded-[1.1rem] px-2 transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white shadow-[0_12px_28px_rgba(37,99,235,0.32)]'
                  : 'text-neutral-500 dark:text-blue-100/70'
              }`}
            >
              <Icon className={`mb-1 h-4 w-4 ${isActive ? 'scale-105' : ''}`} />
              <span className="text-[10px] font-black uppercase tracking-[0.16em]">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
