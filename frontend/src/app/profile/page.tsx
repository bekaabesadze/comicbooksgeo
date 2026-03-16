'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import { useGamification, AVAILABLE_BADGES } from '@/lib/useGamification';
import { Trophy, Star, Award, GraduationCap, ArrowLeft, Loader2, BookOpen, Clock, School, Lock, X } from 'lucide-react';
import Link from 'next/link';
import MobileScreenShell from '@/components/mobile/MobileScreenShell';
import MobileTopBar from '@/components/mobile/MobileTopBar';

const SCHOOLS = [
    { en: 'Tbilisi Classical Gymnasium', ka: 'თბილისის კლასიკური გიმნაზია' },
    { en: 'Komarovi Physics-Mathematics School', ka: 'კომაროვის ფიზიკა-მათემატიკის სკოლა' },
    { en: 'Vekua Physics-Mathematics School', ka: 'ვეკუას ფიზიკა-მათემატიკის სკოლა' },
    { en: 'Guivy Zaldastanishvili American Academy', ka: 'გივი ზალდასტანიშვილის ამერიკული აკადემია' },
    { en: 'British-Georgian Academy', ka: 'ბრიტანულ-ქართული აკადემია' }
];

export default function ProfilePage() {
    const { user, loading: authLoading } = useAuth();
    const { t, language } = useLanguage();
    const { theme, isMobileOptimized } = useTheme();
    const { stats, loading: statsLoading, setSchool } = useGamification();
    const [isUpdatingSchool, setIsUpdatingSchool] = useState(false);
    const [selectedBadgeId, setSelectedBadgeId] = useState<string | null>(null);

    const isDark = theme === 'dark';

    if (authLoading || statsLoading) {
        if (isMobileOptimized) {
            return (
                <MobileScreenShell
                    className={`${isDark ? 'bg-[#07111d] text-white' : 'bg-[#f3f7fb] text-neutral-900'}`}
                    topBar={(
                        <MobileTopBar
                            title={t.profile}
                            leading={(
                                <Link
                                    href="/"
                                    className={`mobile-touch-target flex h-11 w-11 items-center justify-center rounded-2xl border ${isDark ? 'border-white/10 bg-white/6 text-white' : 'border-neutral-200 bg-white text-neutral-900 shadow-sm'}`}
                                >
                                    <ArrowLeft className="h-4 w-4" />
                                </Link>
                            )}
                        />
                    )}
                >
                    <div className={`mobile-card border p-8 text-center shadow-sm ${isDark ? 'border-white/10 bg-[#0d1829]' : 'border-white bg-white'}`}>
                        <Loader2 className="mx-auto h-7 w-7 animate-spin text-blue-500" />
                    </div>
                </MobileScreenShell>
            );
        }
        return (
            <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-[#0d0d0d]' : 'bg-neutral-50'}`}>
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        );
    }

    if (!user && !isMobileOptimized) {
        return (
            <div className={`min-h-screen flex flex-col items-center justify-center p-6 ${isDark ? 'bg-[#0d0d0d] text-white' : 'bg-neutral-50 text-neutral-900'}`}>
                <h1 className="text-2xl font-black mb-4">{t.profile}</h1>
                <p className="mb-6 opacity-60">{t.loginToSeeProfile}</p>
                <Link href="/" className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold">{t.backHome}</Link>
            </div>
        );
    }

    const formatTime = (totalSeconds: number) => {
        const hrs = Math.floor(totalSeconds / 3600);
        const mins = Math.floor((totalSeconds % 3600) / 60);
        if (hrs > 0) return `${hrs}h ${mins}m`;
        return `${mins}m`;
    };

    const xpToNextLevel = (stats?.level || 1) * (stats?.level || 1) * 100;
    const currentLevelXP = ((stats?.level || 1) - 1) * ((stats?.level || 1) - 1) * 100;
    const progressXP = (stats?.xp || 0) - currentLevelXP;
    const totalNeededXP = xpToNextLevel - currentLevelXP;
    const progressPercent = Math.min(100, Math.max(0, (progressXP / totalNeededXP) * 100));
    const uniqueCompletedBooks = new Set((stats?.completedChapters || []).map((chapterKey) => chapterKey.split('_')[0])).size;
    const translationMap = t as unknown as Record<string, unknown>;

    const getBadgeIcon = (icon: string) => {
        if (icon === 'Trophy') return Trophy;
        if (icon === 'Star') return Star;
        if (icon === 'BookOpen') return BookOpen;
        if (icon === 'Award') return Award;
        return Clock;
    };

    const getBadgeName = (nameKey: string, fallbackId: string) => {
        const translation = translationMap[nameKey];
        return typeof translation === 'string' ? translation : fallbackId;
    };

    const getBadgeRequirement = (requirementKey: string) => {
        const translation = translationMap[requirementKey];
        return typeof translation === 'string' ? translation : '';
    };

    const getBadgeProgressValue = (requirementType: string) => {
        if (requirementType === 'chapters') return stats?.completedChapters.length || 0;
        if (requirementType === 'totalTime') return stats?.totalReadingTime || 0;
        if (requirementType === 'uniqueBooks') return uniqueCompletedBooks;
        return stats?.completedBooks.length || 0;
    };

    const getBadgeProgressLabel = (requirementType: string, current: number, threshold: number) => {
        if (requirementType === 'totalTime') {
            return `${formatTime(current)} / ${formatTime(threshold)}`;
        }
        if (requirementType === 'chapters') {
            return `${current} / ${threshold} ${t.chapters.toLowerCase()}`;
        }
        const booksLabel = language === 'ka' ? 'წიგნი' : 'books';
        return `${current} / ${threshold} ${booksLabel}`;
    };

    const getColorTheme = (color: string) => {
        if (color === 'yellow') {
            return {
                card: 'from-yellow-500/20 via-amber-500/20 to-orange-500/20 border-yellow-400/40',
                iconBg: 'bg-yellow-500/20',
                icon: 'text-yellow-400',
                glow: 'shadow-yellow-500/30',
                popupBorder: 'border-yellow-400/40',
                popupBg: 'from-yellow-500/15 via-amber-500/10 to-orange-500/10',
                progress: 'from-yellow-500 to-amber-500'
            };
        }
        if (color === 'blue') {
            return {
                card: 'from-blue-500/20 via-cyan-500/20 to-sky-500/20 border-blue-400/40',
                iconBg: 'bg-blue-500/20',
                icon: 'text-blue-400',
                glow: 'shadow-blue-500/30',
                popupBorder: 'border-blue-400/40',
                popupBg: 'from-blue-500/15 via-cyan-500/10 to-sky-500/10',
                progress: 'from-blue-500 to-cyan-500'
            };
        }
        if (color === 'green') {
            return {
                card: 'from-green-500/20 via-emerald-500/20 to-lime-500/20 border-green-400/40',
                iconBg: 'bg-green-500/20',
                icon: 'text-green-400',
                glow: 'shadow-green-500/30',
                popupBorder: 'border-green-400/40',
                popupBg: 'from-green-500/15 via-emerald-500/10 to-lime-500/10',
                progress: 'from-green-500 to-emerald-500'
            };
        }
        if (color === 'orange') {
            return {
                card: 'from-orange-500/20 via-amber-500/20 to-yellow-500/20 border-orange-400/40',
                iconBg: 'bg-orange-500/20',
                icon: 'text-orange-400',
                glow: 'shadow-orange-500/30',
                popupBorder: 'border-orange-400/40',
                popupBg: 'from-orange-500/15 via-amber-500/10 to-yellow-500/10',
                progress: 'from-orange-500 to-amber-500'
            };
        }
        return {
            card: 'from-purple-500/20 via-fuchsia-500/20 to-violet-500/20 border-purple-400/40',
            iconBg: 'bg-purple-500/20',
            icon: 'text-purple-400',
            glow: 'shadow-purple-500/30',
            popupBorder: 'border-purple-400/40',
            popupBg: 'from-purple-500/15 via-fuchsia-500/10 to-violet-500/10',
            progress: 'from-purple-500 to-fuchsia-500'
        };
    };

    const selectedBadge = AVAILABLE_BADGES.find((badge) => badge.id === selectedBadgeId) || null;
    const selectedBadgeProgress = selectedBadge ? getBadgeProgressValue(selectedBadge.requirementType) : 0;
    const selectedBadgeThreshold = selectedBadge?.threshold || 1;
    const selectedBadgeProgressPercent = Math.min(100, Math.max(0, (selectedBadgeProgress / selectedBadgeThreshold) * 100));
    const selectedBadgeUnlocked = selectedBadge ? !!stats?.badges.includes(selectedBadge.id) : false;
    const selectedBadgeTheme = selectedBadge ? getColorTheme(selectedBadge.color) : null;
    const readerName = user?.displayName || 'Reader';

    if (isMobileOptimized) {
        return (
            <MobileScreenShell
                className={`${isDark ? 'bg-[#07111d] text-white' : 'bg-[#f3f7fb] text-neutral-900'}`}
                topBar={(
                    <MobileTopBar
                        title={t.profile}
                        subtitle={user ? readerName : t.backHome}
                        leading={(
                            <Link
                                href="/"
                                className={`mobile-touch-target flex h-11 w-11 items-center justify-center rounded-2xl border ${isDark ? 'border-white/10 bg-white/6 text-white' : 'border-neutral-200 bg-white text-neutral-900 shadow-sm'}`}
                            >
                                <ArrowLeft className="h-4 w-4" />
                            </Link>
                        )}
                        actions={user ? (
                            <div className={`rounded-2xl border px-3 py-2 text-right ${isDark ? 'border-white/10 bg-white/6' : 'border-neutral-200 bg-white shadow-sm'}`}>
                                <div className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-500">{t.level}</div>
                                <div className="text-xs font-black">{stats?.level || 1}</div>
                            </div>
                        ) : null}
                    />
                )}
            >
                {!user ? (
                    <section className={`mobile-card border p-6 text-center shadow-sm ${isDark ? 'border-white/10 bg-[#0d1829]' : 'border-white bg-white'}`}>
                        <h1 className="text-xl font-black">{t.profile}</h1>
                        <p className={`mt-3 text-sm ${isDark ? 'text-white/70' : 'text-neutral-600'}`}>{t.loginToSeeProfile}</p>
                        <Link href="/" className="mt-5 inline-flex min-h-[48px] items-center justify-center rounded-2xl bg-blue-600 px-5 text-sm font-black uppercase tracking-[0.16em] text-white">
                            {t.backHome}
                        </Link>
                    </section>
                ) : (
                    <div className="space-y-4">
                        <section className={`mobile-card border p-4 shadow-sm ${isDark ? 'border-white/10 bg-[#0d1829]' : 'border-white bg-white'}`}>
                            <div className="flex items-center gap-4">
                                <div className={`flex h-20 w-20 shrink-0 items-center justify-center rounded-[1.8rem] border text-2xl font-black ${isDark ? 'border-blue-500/30 bg-blue-500/10 text-blue-300' : 'border-blue-200 bg-blue-50 text-blue-700'}`}>
                                    {stats?.level || 1}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center justify-between gap-3">
                                    <h1 className="truncate text-xl font-black">{readerName}</h1>
                                        <span className="shrink-0 text-[10px] font-black uppercase tracking-[0.16em] text-blue-500">{stats?.xp || 0} XP</span>
                                    </div>
                                    <div className={`mt-3 h-3 overflow-hidden rounded-full ${isDark ? 'bg-white/8' : 'bg-neutral-100'}`}>
                                        <div className="h-full bg-blue-600" style={{ width: `${progressPercent}%` }} />
                                    </div>
                                    <div className={`mt-2 flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.14em] ${isDark ? 'text-white/48' : 'text-neutral-500'}`}>
                                        <span>{t.level} {stats?.level || 1}</span>
                                        <span>{Math.round(progressPercent)}% {t.toLevel} {(stats?.level || 1) + 1}</span>
                                    </div>
                                </div>
                            </div>
                        </section>

                        <section className="grid grid-cols-3 gap-3">
                            <div className={`mobile-card border p-3 ${isDark ? 'border-white/10 bg-[#0d1829]' : 'border-white bg-white'}`}>
                                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-500/12 text-blue-500">
                                    <BookOpen className="h-4 w-4" />
                                </div>
                                <div className="text-lg font-black">{stats?.completedChapters.length || 0}</div>
                                <div className={`pt-1 text-[9px] font-black uppercase tracking-[0.16em] ${isDark ? 'text-white/52' : 'text-neutral-500'}`}>{t.chapters}</div>
                            </div>
                            <div className={`mobile-card border p-3 ${isDark ? 'border-white/10 bg-[#0d1829]' : 'border-white bg-white'}`}>
                                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-500/12 text-orange-500">
                                    <Clock className="h-4 w-4" />
                                </div>
                                <div className="text-lg font-black">{formatTime(stats?.totalReadingTime || 0)}</div>
                                <div className={`pt-1 text-[9px] font-black uppercase tracking-[0.16em] ${isDark ? 'text-white/52' : 'text-neutral-500'}`}>{t.time}</div>
                            </div>
                            <div className={`mobile-card border p-3 ${isDark ? 'border-white/10 bg-[#0d1829]' : 'border-white bg-white'}`}>
                                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-purple-500/12 text-purple-500">
                                    <School className="h-4 w-4" />
                                </div>
                                <div className="line-clamp-2 text-sm font-black leading-tight">{stats?.school || t.notSet}</div>
                                <div className={`pt-1 text-[9px] font-black uppercase tracking-[0.16em] ${isDark ? 'text-white/52' : 'text-neutral-500'}`}>{t.school}</div>
                            </div>
                        </section>

                        <section className={`mobile-card border p-4 shadow-sm ${isDark ? 'border-white/10 bg-[#0d1829]' : 'border-white bg-white'}`}>
                            <div className="mb-4 flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-500/12 text-blue-500">
                                    <GraduationCap className="h-4 w-4" />
                                </div>
                                <div>
                                    <h2 className="text-base font-black">{t.selectSchool}</h2>
                                    <p className={`text-[10px] font-black uppercase tracking-[0.16em] ${isDark ? 'text-white/48' : 'text-neutral-500'}`}>{t.school}</p>
                                </div>
                            </div>
                            <div className="space-y-2">
                                {SCHOOLS.map((school) => (
                                    <button
                                        key={school.en}
                                        onClick={async () => {
                                            if (isUpdatingSchool) return;
                                            setIsUpdatingSchool(true);
                                            try {
                                                await setSchool(school[language]);
                                            } finally {
                                                setIsUpdatingSchool(false);
                                            }
                                        }}
                                        disabled={isUpdatingSchool}
                                        className={`mobile-touch-target w-full rounded-2xl border px-4 py-3 text-left text-sm font-bold transition-colors ${stats?.school === school[language]
                                            ? 'border-blue-600 bg-blue-600 text-white'
                                            : isDark ? 'border-white/10 bg-black/20 text-white' : 'border-neutral-200 bg-neutral-50 text-neutral-900'
                                        }`}
                                    >
                                        <span className="block truncate">{school[language]}</span>
                                    </button>
                                ))}
                            </div>
                        </section>

                        <section className={`mobile-card border p-4 shadow-sm ${isDark ? 'border-white/10 bg-[#0d1829]' : 'border-white bg-white'}`}>
                            <div className="mb-4 flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-yellow-500/12 text-yellow-500">
                                    <Award className="h-4 w-4" />
                                </div>
                                <div>
                                    <h2 className="text-base font-black">{t.badges}</h2>
                                    <p className={`text-[10px] font-black uppercase tracking-[0.16em] ${isDark ? 'text-white/48' : 'text-neutral-500'}`}>
                                        {typeof translationMap.tapForDetails === 'string'
                                            ? translationMap.tapForDetails
                                            : 'Tap any badge to see unlock details'}
                                    </p>
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                {AVAILABLE_BADGES.map((badge) => {
                                    const isUnlocked = stats?.badges.includes(badge.id);
                                    const Icon = getBadgeIcon(badge.icon);
                                    const themeSet = getColorTheme(badge.color);
                                    const progress = getBadgeProgressValue(badge.requirementType);
                                    const clampedProgress = Math.min(100, Math.max(0, (progress / badge.threshold) * 100));

                                    return (
                                        <button
                                            key={badge.id}
                                            type="button"
                                            onClick={() => setSelectedBadgeId(badge.id)}
                                            aria-label={`${getBadgeName(badge.nameKey, badge.id)} ${isUnlocked ? t.unlocked : ''}`}
                                            className={`relative mobile-card border p-3 text-center transition-transform ${isUnlocked
                                                ? `bg-gradient-to-br ${themeSet.card}`
                                                : isDark ? 'border-white/10 bg-black/20 text-white/55' : 'border-neutral-200 bg-neutral-50 text-neutral-500'
                                            }`}
                                        >
                                            {!isUnlocked ? (
                                                <Lock className="absolute right-2 top-2 h-3 w-3 opacity-50" />
                                            ) : null}
                                            <div className={`mx-auto flex h-11 w-11 items-center justify-center rounded-2xl ${isUnlocked ? themeSet.iconBg : 'bg-neutral-500/10'}`}>
                                                <Icon className={`h-5 w-5 ${isUnlocked ? `${themeSet.icon} fill-current` : 'text-neutral-500'}`} />
                                            </div>
                                            <div className="pt-3 text-[10px] font-black uppercase tracking-[0.12em]">
                                                {getBadgeName(badge.nameKey, badge.id)}
                                            </div>
                                            <div className={`mt-2 h-1.5 overflow-hidden rounded-full ${isDark ? 'bg-white/8' : 'bg-neutral-200'}`}>
                                                <div className={`h-full bg-gradient-to-r ${themeSet.progress}`} style={{ width: `${clampedProgress}%` }} />
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </section>
                    </div>
                )}

                {selectedBadge && selectedBadgeTheme ? (
                    <div className="fixed inset-0 z-[90] flex items-end justify-center p-4">
                        <div className="absolute inset-0 bg-black/60" onClick={() => setSelectedBadgeId(null)} />
                        <div className={`mobile-sheet relative w-full max-w-md border p-5 shadow-2xl bg-gradient-to-br ${selectedBadgeTheme.popupBg} ${selectedBadgeTheme.popupBorder} ${isDark ? 'bg-[#0d1829] text-white' : 'bg-white text-neutral-900'}`}>
                            <button
                                type="button"
                                className={`absolute right-4 top-4 mobile-touch-target flex h-10 w-10 items-center justify-center rounded-full ${isDark ? 'hover:bg-white/8' : 'hover:bg-neutral-100'}`}
                                onClick={() => setSelectedBadgeId(null)}
                                aria-label="Close badge details"
                            >
                                <X className="h-4 w-4" />
                            </button>

                            {(() => {
                                const Icon = getBadgeIcon(selectedBadge.icon);
                                return (
                                    <div className="flex items-start gap-4">
                                        <div className={`flex h-16 w-16 items-center justify-center rounded-[1.4rem] ${selectedBadgeTheme.iconBg}`}>
                                            <Icon className={`h-7 w-7 ${selectedBadgeTheme.icon} fill-current`} />
                                        </div>
                                        <div className="pr-10">
                                            <h3 className="text-lg font-black uppercase tracking-wide">{getBadgeName(selectedBadge.nameKey, selectedBadge.id)}</h3>
                                            {selectedBadgeUnlocked ? (
                                                <span className="mt-2 inline-flex rounded-full border border-green-500/30 bg-green-500/20 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-green-400">
                                                    {t.unlocked}
                                                </span>
                                            ) : null}
                                        </div>
                                    </div>
                                );
                            })()}

                            <div className={`mt-5 mobile-card border p-4 ${isDark ? 'border-white/10 bg-black/20' : 'border-neutral-200 bg-white/80'}`}>
                                <p className={`mb-2 text-[10px] font-black uppercase tracking-[0.16em] ${isDark ? 'text-white/52' : 'text-neutral-500'}`}>
                                    {typeof translationMap.howToUnlock === 'string' ? translationMap.howToUnlock : 'How to unlock'}
                                </p>
                                <p className="text-sm font-bold leading-relaxed">{getBadgeRequirement(selectedBadge.requirementKey)}</p>
                            </div>
                            <div className={`mt-4 mobile-card border p-4 ${isDark ? 'border-white/10 bg-black/20' : 'border-neutral-200 bg-white/80'}`}>
                                <div className="mb-2 flex items-center justify-between gap-3">
                                    <p className={`text-[10px] font-black uppercase tracking-[0.16em] ${isDark ? 'text-white/52' : 'text-neutral-500'}`}>
                                        {typeof translationMap.progress === 'string' ? translationMap.progress : 'Progress'}
                                    </p>
                                    <span className="text-xs font-black">
                                        {getBadgeProgressLabel(selectedBadge.requirementType, selectedBadgeProgress, selectedBadge.threshold)}
                                    </span>
                                </div>
                                <div className={`h-2.5 overflow-hidden rounded-full ${isDark ? 'bg-white/8' : 'bg-neutral-200'}`}>
                                    <div
                                        className={`h-full bg-gradient-to-r ${selectedBadgeTheme.progress}`}
                                        style={{ width: `${selectedBadgeProgressPercent}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                ) : null}
            </MobileScreenShell>
        );
    }

    return (
        <div className={`min-h-screen ${isDark ? 'bg-[#0d0d0d] text-white' : 'bg-neutral-50 text-neutral-900'} p-4 md:p-8 pt-24`}>
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <Link href="/" className={`p-2 rounded-full transition-colors ${isDark ? 'hover:bg-neutral-800' : 'hover:bg-neutral-200'}`}>
                        <ArrowLeft className="w-6 h-6" />
                    </Link>
                    <h1 className="text-3xl font-black">{t.profile}</h1>
                    <div className="w-10" />
                </div>

                {/* Main Stats Card */}
                <div className={`mb-8 p-8 rounded-3xl border shadow-xl ${isDark ? 'bg-neutral-900/50 border-neutral-800' : 'bg-white border-neutral-200'}`}>
                    <div className="flex flex-col md:flex-row items-center gap-8">
                        {/* Avatar & Level */}
                        <div className="relative">
                            <div className={`w-32 h-32 rounded-full border-4 flex items-center justify-center text-4xl font-black shadow-2xl ${isDark ? 'bg-blue-500/10 border-blue-500 shadow-blue-500/20' : 'bg-blue-600/5 border-blue-600 shadow-blue-600/10 text-blue-600'}`}>
                                {stats?.level || 1}
                            </div>
                            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-4 py-1 rounded-full text-xs font-black uppercase tracking-widest whitespace-nowrap">
                                {t.level}
                            </div>
                        </div>

                        {/* XP Progress */}
                        <div className="flex-1 w-full">
                            <div className="flex items-center justify-between mb-2">
                                <h2 className="text-2xl font-black">{readerName}</h2>
                                <span className="text-sm font-black text-blue-500 uppercase tracking-widest">{stats?.xp || 0} XP</span>
                            </div>
                            <div className={`h-4 w-full rounded-full overflow-hidden mb-2 ${isDark ? 'bg-neutral-800' : 'bg-neutral-100'}`}>
                                <div
                                    className="h-full bg-blue-600 transition-all duration-1000 ease-out"
                                    style={{ width: `${progressPercent}%` }}
                                />
                            </div>
                            <div className="flex justify-between text-xs font-bold opacity-40 uppercase tracking-widest">
                                <span>{t.level} {stats?.level || 1}</span>
                                <span>{Math.round(progressPercent)}% {t.toLevel} {(stats?.level || 1) + 1}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    {/* Stat Items */}
                    <div className={`p-6 rounded-2xl border ${isDark ? 'bg-neutral-900/50 border-neutral-800' : 'bg-white border-neutral-200'}`}>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500">
                                <BookOpen className="w-5 h-5" />
                            </div>
                            <h3 className="font-black text-sm uppercase tracking-widest">{t.chapters}</h3>
                        </div>
                        <p className="text-3xl font-black">{stats?.completedChapters.length || 0}</p>
                    </div>

                    <div className={`p-6 rounded-2xl border ${isDark ? 'bg-neutral-900/50 border-neutral-800' : 'bg-white border-neutral-200'}`}>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-orange-500/10 rounded-lg text-orange-500">
                                <Clock className="w-5 h-5" />
                            </div>
                            <h3 className="font-black text-sm uppercase tracking-widest">{t.time}</h3>
                        </div>
                        <p className="text-3xl font-black">{formatTime(stats?.totalReadingTime || 0)}</p>
                    </div>

                    <div className={`p-6 rounded-2xl border ${isDark ? 'bg-neutral-900/50 border-neutral-800' : 'bg-white border-neutral-200'}`}>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-purple-500/10 rounded-lg text-purple-500">
                                <School className="w-5 h-5" />
                            </div>
                            <h3 className="font-black text-sm uppercase tracking-widest">{t.school}</h3>
                        </div>
                        <p className="text-xl font-black truncate">{stats?.school || t.notSet}</p>
                    </div>
                </div>

                {/* School Selection */}
                <div className={`mb-8 p-8 rounded-3xl border ${isDark ? 'bg-neutral-900/50 border-neutral-800' : 'bg-white border-neutral-200'}`}>
                    <h3 className="text-xl font-black mb-6 flex items-center gap-3">
                        <GraduationCap className="w-6 h-6 text-blue-500" />
                        {t.selectSchool}
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {SCHOOLS.map(school => (
                            <button
                                key={school.en}
                                onClick={async () => {
                                    if (isUpdatingSchool) return;
                                    setIsUpdatingSchool(true);
                                    try {
                                        await setSchool(school[language]);
                                    } finally {
                                        setIsUpdatingSchool(false);
                                    }
                                }}
                                disabled={isUpdatingSchool}
                                className={`px-4 py-3 rounded-xl border text-left text-sm font-bold transition-all ${stats?.school === school[language]
                                    ? 'bg-blue-600 border-blue-600 text-white shadow-lg'
                                    : isDark ? 'bg-neutral-800 border-neutral-700 hover:border-blue-500/50' : 'bg-neutral-50 border-neutral-200 hover:border-blue-500/50'}`}
                            >
                                {school[language]}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Badges Section */}
                <div className={`p-8 rounded-3xl border ${isDark ? 'bg-neutral-900/50 border-neutral-800' : 'bg-white border-neutral-200'}`}>
                    <h3 className="text-xl font-black mb-6 flex items-center gap-3">
                        <Award className="w-6 h-6 text-yellow-500" />
                        {t.badges}
                    </h3>
                    <p className={`text-xs font-bold uppercase tracking-widest mb-5 ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                        {typeof translationMap.tapForDetails === 'string'
                            ? translationMap.tapForDetails
                            : 'Tap any badge to see unlock details'}
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                        {AVAILABLE_BADGES.map(badge => {
                            const isUnlocked = stats?.badges.includes(badge.id);
                            const Icon = getBadgeIcon(badge.icon);
                            const themeSet = getColorTheme(badge.color);
                            const progress = getBadgeProgressValue(badge.requirementType);
                            const clampedProgress = Math.min(100, Math.max(0, (progress / badge.threshold) * 100));

                            return (
                                <button
                                    key={badge.id}
                                    type="button"
                                    onClick={() => setSelectedBadgeId(badge.id)}
                                    aria-label={`${getBadgeName(badge.nameKey, badge.id)} ${isUnlocked ? t.unlocked : ''}`}
                                    className={`relative p-4 rounded-3xl border flex flex-col items-center gap-3 text-center transition-all duration-500 group ${isUnlocked
                                        ? `hover:scale-[1.03] bg-gradient-to-br ${themeSet.card} shadow-xl ${themeSet.glow}`
                                        : `opacity-60 grayscale-[0.4] ${isDark ? 'bg-neutral-900/40 border-neutral-800/60 hover:opacity-80' : 'bg-neutral-100/60 border-neutral-200/70 hover:opacity-90'}`
                                        }`}
                                >
                                    {!isUnlocked && (
                                        <div className="absolute top-2 right-2 opacity-50">
                                            <Lock className="w-3 h-3" />
                                        </div>
                                    )}
                                    <div className={`p-3 rounded-2xl transition-all duration-500 ${isUnlocked ? themeSet.iconBg : 'bg-neutral-500/10'}`}>
                                        <Icon className={`w-7 h-7 ${isUnlocked ? `${themeSet.icon} fill-current opacity-90 group-hover:scale-110` : 'text-neutral-500'} transition-transform`} />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <span className={`text-[10px] sm:text-xs font-black uppercase tracking-widest ${isUnlocked ? (isDark ? 'text-white' : 'text-neutral-900') : 'text-neutral-500'}`}>
                                            {getBadgeName(badge.nameKey, badge.id)}
                                        </span>
                                        <div className={`h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-neutral-800/80' : 'bg-neutral-200/80'}`}>
                                            <div className={`h-full rounded-full transition-all duration-700 bg-gradient-to-r ${themeSet.progress}`} style={{ width: `${clampedProgress}%` }} />
                                        </div>
                                        {isUnlocked && (
                                            <div className="flex items-center justify-center gap-1">
                                                <div className="w-1 h-1 rounded-full bg-green-500 animate-pulse" />
                                                <span className="text-[8px] font-black text-green-500 uppercase tracking-tighter">{t.unlocked}</span>
                                            </div>
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {selectedBadge && selectedBadgeTheme && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-md"
                        onClick={() => setSelectedBadgeId(null)}
                    />
                    <div className={`relative w-full max-w-md rounded-3xl border p-6 shadow-2xl bg-gradient-to-br ${selectedBadgeTheme.popupBg} ${selectedBadgeTheme.popupBorder} ${isDark ? 'bg-neutral-900 text-white' : 'bg-white text-neutral-900'}`}>
                        <button
                            type="button"
                            className={`absolute top-4 right-4 p-2 rounded-full transition-colors ${isDark ? 'hover:bg-neutral-800' : 'hover:bg-neutral-100'}`}
                            onClick={() => setSelectedBadgeId(null)}
                            aria-label="Close badge details"
                        >
                            <X className="w-4 h-4" />
                        </button>

                        {(() => {
                            const Icon = getBadgeIcon(selectedBadge.icon);
                            return (
                                <div className="flex items-start gap-4 mb-4">
                                    <div className={`p-4 rounded-2xl ${selectedBadgeTheme.iconBg} shadow-lg ${selectedBadgeTheme.glow}`}>
                                        <Icon className={`w-8 h-8 ${selectedBadgeTheme.icon} fill-current`} />
                                    </div>
                                    <div className="pr-10">
                                        <h4 className="text-xl font-black uppercase tracking-wide">
                                            {getBadgeName(selectedBadge.nameKey, selectedBadge.id)}
                                        </h4>
                                        {selectedBadgeUnlocked && (
                                            <span className="inline-flex items-center mt-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-green-500/20 text-green-400 border border-green-500/30">
                                                {t.unlocked}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })()}

                        <div className={`rounded-2xl border p-4 mb-4 ${isDark ? 'border-neutral-700 bg-neutral-900/40' : 'border-neutral-200 bg-white/70'}`}>
                            <p className={`text-[10px] font-black uppercase tracking-widest mb-2 ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                                {typeof translationMap.howToUnlock === 'string'
                                    ? translationMap.howToUnlock
                                    : 'How to unlock'}
                            </p>
                            <p className="text-sm font-bold leading-relaxed">
                                {getBadgeRequirement(selectedBadge.requirementKey)}
                            </p>
                        </div>

                        <div className={`rounded-2xl border p-4 ${isDark ? 'border-neutral-700 bg-neutral-900/40' : 'border-neutral-200 bg-white/70'}`}>
                            <div className="flex items-center justify-between mb-2">
                                <p className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                                    {typeof translationMap.progress === 'string'
                                        ? translationMap.progress
                                        : 'Progress'}
                                </p>
                                <span className="text-xs font-black">
                                    {getBadgeProgressLabel(selectedBadge.requirementType, selectedBadgeProgress, selectedBadge.threshold)}
                                </span>
                            </div>
                            <div className={`h-2.5 rounded-full overflow-hidden ${isDark ? 'bg-neutral-800' : 'bg-neutral-200'}`}>
                                <div
                                    className={`h-full rounded-full transition-all duration-700 bg-gradient-to-r ${selectedBadgeTheme.progress} ${selectedBadgeUnlocked ? 'animate-pulse' : ''}`}
                                    style={{ width: `${selectedBadgeProgressPercent}%` }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
