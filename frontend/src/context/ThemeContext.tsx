'use client';

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';

type Theme = 'dark' | 'light';

interface ThemeContextType {
    theme: Theme;
    toggleTheme: (e?: React.MouseEvent) => void;
    isMobileOptimized: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setTheme] = useState<Theme>('dark');
    const [mounted, setMounted] = useState(false);
    const [isMobileOptimized, setIsMobileOptimized] = useState(false);
    const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
    const themeSwitchTimerRef = useRef<number | null>(null);
    const isMobileRef = useRef(false);

    const applyThemeClass = useCallback((nextTheme: Theme) => {
        document.documentElement.classList.toggle('dark', nextTheme === 'dark');
    }, []);

    const clearThemeSwitchState = useCallback(() => {
        if (themeSwitchTimerRef.current !== null) {
            window.clearTimeout(themeSwitchTimerRef.current);
            themeSwitchTimerRef.current = null;
        }
        document.documentElement.classList.remove('theme-switching');
        document.documentElement.classList.remove('theme-transition');
    }, []);

    const freezeThemeAnimations = useCallback(() => {
        clearThemeSwitchState();
        document.documentElement.classList.add('theme-switching');
        // Slower phones need more time before re-enabling transitions
        const timeout = isMobileRef.current ? 500 : 260;
        themeSwitchTimerRef.current = window.setTimeout(() => {
            clearThemeSwitchState();
        }, timeout);
    }, [clearThemeSwitchState]);

    useEffect(() => {
        // Load initial theme from localStorage or system preference
        const savedTheme = localStorage.getItem('theme') as Theme;
        if (savedTheme) {
            setTheme(savedTheme);
        } else if (window.matchMedia('(prefers-color-scheme: light)').matches) {
            // Default is dark as requested, but we could check preference
            // The user explicitly said "default should be dark theme"
            setTheme('dark');
        }
        setMounted(true);
    }, []);

    useEffect(() => {
        const coarsePointerMedia = window.matchMedia('(pointer: coarse)');
        const smallViewportMedia = window.matchMedia('(max-width: 1024px)');
        const reducedMotionMedia = window.matchMedia('(prefers-reduced-motion: reduce)');

        const updateDevicePreferences = () => {
            const nextIsMobileOptimized = coarsePointerMedia.matches || smallViewportMedia.matches;
            const nextPrefersReducedMotion = reducedMotionMedia.matches;

            setIsMobileOptimized(nextIsMobileOptimized);
            setPrefersReducedMotion(nextPrefersReducedMotion);
            isMobileRef.current = nextIsMobileOptimized;

            document.documentElement.classList.toggle('mobile-optimized', nextIsMobileOptimized);
            document.documentElement.classList.toggle('reduced-motion', nextPrefersReducedMotion);
        };

        const addListener = (mediaQuery: MediaQueryList, listener: () => void) => {
            if (typeof mediaQuery.addEventListener === 'function') {
                mediaQuery.addEventListener('change', listener);
                return () => mediaQuery.removeEventListener('change', listener);
            }

            mediaQuery.addListener(listener);
            return () => mediaQuery.removeListener(listener);
        };

        updateDevicePreferences();

        const removeCoarsePointerListener = addListener(coarsePointerMedia, updateDevicePreferences);
        const removeSmallViewportListener = addListener(smallViewportMedia, updateDevicePreferences);
        const removeReducedMotionListener = addListener(reducedMotionMedia, updateDevicePreferences);

        return () => {
            removeCoarsePointerListener();
            removeSmallViewportListener();
            removeReducedMotionListener();
            clearThemeSwitchState();
            document.documentElement.classList.remove('mobile-optimized');
            document.documentElement.classList.remove('reduced-motion');
        };
    }, [clearThemeSwitchState]);

    useEffect(() => {
        if (mounted) {
            localStorage.setItem('theme', theme);
            applyThemeClass(theme);
        }
    }, [theme, mounted, applyThemeClass]);

    const toggleTheme = (e?: React.MouseEvent) => {
        const newTheme = theme === 'dark' ? 'light' : 'dark';
        const canUseRichTransition = Boolean(
            typeof document.startViewTransition === 'function' &&
            e &&
            !isMobileOptimized &&
            !prefersReducedMotion
        );

        freezeThemeAnimations();

        if (!canUseRichTransition || !e) {
            if (isMobileRef.current) {
                // On mobile, avoid flushSync to prevent forced synchronous layout
                setTheme(newTheme);
                requestAnimationFrame(() => {
                    applyThemeClass(newTheme);
                });
            } else {
                flushSync(() => {
                    setTheme(newTheme);
                });
                applyThemeClass(newTheme);
            }
            return;
        }

        const x = e.clientX;
        const y = e.clientY;
        const endRadius = Math.hypot(
            Math.max(x, window.innerWidth - x),
            Math.max(y, window.innerHeight - y)
        );

        document.documentElement.classList.add('theme-transition');

        const transition = document.startViewTransition(() => {
            flushSync(() => {
                setTheme(newTheme);
            });
            applyThemeClass(newTheme);
        });

        transition.ready.then(() => {
            const clipPath = [
                `circle(0px at ${x}px ${y}px)`,
                `circle(${endRadius}px at ${x}px ${y}px)`,
            ];

            document.documentElement.animate(
                {
                    clipPath: clipPath,
                },
                {
                    duration: 420,
                    easing: 'ease-in-out',
                    pseudoElement: '::view-transition-new(root)',
                }
            );
        });

        transition.finished.finally(() => {
            clearThemeSwitchState();
        });
    };

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme, isMobileOptimized }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}
