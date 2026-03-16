'use client';

import { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { ArrowLeft, BarChart3, Flame, GraduationCap, Loader2, Star, Users } from 'lucide-react';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import MobileScreenShell from '@/components/mobile/MobileScreenShell';
import MobileTopBar from '@/components/mobile/MobileTopBar';

interface SchoolStats {
    name: string;
    totalReadingTime: number;
    studentCount: number;
}

interface UserStreakEntry {
    id: string;
    displayName: string;
    photoURL?: string;
    currentStreak: number;
}

function sanitizeDisplayName(value: unknown) {
    if (typeof value !== 'string') return 'Reader';
    const trimmed = value.trim().slice(0, 80);
    return trimmed || 'Reader';
}

function sanitizePhotoURL(value: unknown) {
    if (typeof value !== 'string') return undefined;
    const trimmed = value.trim();
    return trimmed || undefined;
}

function getInitials(name: string) {
    const parts = name.split(/\s+/).filter(Boolean).slice(0, 2);
    const initials = parts.map((part) => part[0]?.toUpperCase() || '').join('');
    return initials || '?';
}

function Avatar({
    name,
    photoURL,
    sizeClass,
    textClass,
}: {
    name: string;
    photoURL?: string;
    sizeClass: string;
    textClass: string;
}) {
    const [imageFailed, setImageFailed] = useState(false);

    if (photoURL && !imageFailed) {
        return (
            <img
                src={photoURL}
                alt={name}
                className={`${sizeClass} rounded-full object-cover border border-white/20 bg-neutral-200`}
                loading="lazy"
                referrerPolicy="no-referrer"
                onError={() => setImageFailed(true)}
            />
        );
    }

    return (
        <div className={`${sizeClass} rounded-full border border-blue-400/30 bg-blue-500/10 text-blue-500 flex items-center justify-center font-black ${textClass}`}>
            {getInitials(name)}
        </div>
    );
}

export default function LeaderboardPage() {
    const { t } = useLanguage();
    const { theme, isMobileOptimized } = useTheme();
    const [schools, setSchools] = useState<SchoolStats[]>([]);
    const [streakUsers, setStreakUsers] = useState<UserStreakEntry[]>([]);
    const [loading, setLoading] = useState(true);

    const isDark = theme === 'dark';

    useEffect(() => {
        const fetchLeaderboard = async () => {
            try {
                const usersRef = collection(db, 'users');
                const snapshot = await getDocs(usersRef);

                const schoolAggregation: Record<string, { totalTime: number; count: number }> = {};
                const nextStreakUsers: UserStreakEntry[] = [];

                snapshot.forEach((docSnap) => {
                    const data = docSnap.data() as Record<string, unknown>;

                    if (typeof data.school === 'string' && data.school.trim()) {
                        const schoolName = data.school.trim();
                        if (!schoolAggregation[schoolName]) {
                            schoolAggregation[schoolName] = { totalTime: 0, count: 0 };
                        }
                        schoolAggregation[schoolName].totalTime += typeof data.totalReadingTime === 'number' ? data.totalReadingTime : 0;
                        schoolAggregation[schoolName].count += 1;
                    }

                    const currentStreak = typeof data.currentStreak === 'number' ? data.currentStreak : 0;
                    if (currentStreak > 0) {
                        nextStreakUsers.push({
                            id: docSnap.id,
                            displayName: sanitizeDisplayName(data.displayName),
                            photoURL: sanitizePhotoURL(data.photoURL),
                            currentStreak,
                        });
                    }
                });

                const sortedSchools = Object.entries(schoolAggregation)
                    .map(([name, stats]) => ({
                        name,
                        totalReadingTime: stats.totalTime,
                        studentCount: stats.count,
                    }))
                    .sort((a, b) => b.totalReadingTime - a.totalReadingTime);

                nextStreakUsers.sort((a, b) => {
                    if (b.currentStreak !== a.currentStreak) return b.currentStreak - a.currentStreak;
                    return a.displayName.localeCompare(b.displayName);
                });

                setSchools(sortedSchools);
                setStreakUsers(nextStreakUsers);
            } catch (error) {
                console.error('Error fetching leaderboard:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchLeaderboard();
    }, []);

    const formatTime = (totalSeconds: number) => {
        const hrs = Math.floor(totalSeconds / 3600);
        return `${hrs}h`;
    };

    const formatStreak = (streak: number) => {
        const label = streak === 1 ? t.day : t.days;
        return `${streak} ${label}`;
    };

    if (loading) {
        if (isMobileOptimized) {
            return (
                <MobileScreenShell
                    className={`${isDark ? 'bg-[#07111d] text-white' : 'bg-[#f3f7fb] text-neutral-900'}`}
                    topBar={(
                        <MobileTopBar
                            title={t.leaderboard}
                            subtitle={t.dailyStreaks}
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

    if (isMobileOptimized) {
        return (
            <MobileScreenShell
                className={`${isDark ? 'bg-[#07111d] text-white' : 'bg-[#f3f7fb] text-neutral-900'}`}
                topBar={(
                    <MobileTopBar
                        title={t.leaderboard}
                        subtitle={t.dailyStreaks}
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
                <div className="space-y-4">
                    <section className={`mobile-card border p-4 shadow-sm ${isDark ? 'border-white/10 bg-[#0d1829]' : 'border-white bg-white'}`}>
                        <div className="mb-4 flex items-center justify-between gap-3">
                            <div>
                                <p className={`text-[10px] font-black uppercase tracking-[0.18em] ${isDark ? 'text-blue-200/70' : 'text-blue-700/60'}`}>
                                    {t.streakLeaderboard}
                                </p>
                                <h2 className="pt-1 text-lg font-black">{t.dailyStreaks}</h2>
                            </div>
                            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-500/12 text-orange-500">
                                <Flame className="h-5 w-5" />
                            </div>
                        </div>

                        {streakUsers.length > 0 ? (
                            <div className="space-y-3">
                                {streakUsers.slice(0, 3).map((entry, index) => {
                                    const rank = index + 1;
                                    const isFirst = rank === 1;
                                    return (
                                        <div
                                            key={entry.id}
                                            className={`mobile-card flex items-center gap-3 border p-3 ${isFirst
                                                ? 'border-blue-500/40 bg-blue-600 text-white'
                                                : isDark ? 'border-white/10 bg-black/20' : 'border-neutral-200 bg-neutral-50'
                                            }`}
                                        >
                                            <div className={`flex h-11 w-11 items-center justify-center rounded-2xl text-sm font-black ${isFirst ? 'bg-white text-blue-600' : 'bg-blue-500/12 text-blue-500'}`}>
                                                {rank === 1 ? <Star className="h-5 w-5 fill-current" /> : rank}
                                            </div>
                                            <Avatar
                                                name={entry.displayName}
                                                photoURL={entry.photoURL}
                                                sizeClass="w-12 h-12"
                                                textClass="text-sm"
                                            />
                                            <div className="min-w-0 flex-1">
                                                <h3 className="truncate text-sm font-black">{entry.displayName}</h3>
                                                <p className={`pt-1 text-[10px] font-black uppercase tracking-[0.16em] ${isFirst ? 'text-white/80' : isDark ? 'text-white/48' : 'text-neutral-500'}`}>
                                                    {formatStreak(entry.currentStreak)}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}

                                <div className={`mobile-card border overflow-hidden ${isDark ? 'border-white/10 bg-black/20' : 'border-neutral-200 bg-neutral-50'}`}>
                                    {streakUsers.map((entry, index) => (
                                        <div key={entry.id} className={`flex items-center gap-3 px-3 py-3 ${index > 0 ? 'border-t border-white/10' : ''}`}>
                                            <span className={`w-6 text-sm font-black ${index < 3 ? 'text-blue-500' : isDark ? 'text-white/40' : 'text-neutral-400'}`}>{index + 1}</span>
                                            <Avatar
                                                name={entry.displayName}
                                                photoURL={entry.photoURL}
                                                sizeClass="w-10 h-10"
                                                textClass="text-xs"
                                            />
                                            <div className="min-w-0 flex-1">
                                                <div className="truncate text-sm font-black">{entry.displayName}</div>
                                                <div className={`text-[10px] font-black uppercase tracking-[0.16em] ${isDark ? 'text-white/48' : 'text-neutral-500'}`}>{t.streak}</div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-sm font-black text-orange-500">{entry.currentStreak}</div>
                                                <div className={`text-[10px] font-black uppercase tracking-[0.16em] ${isDark ? 'text-white/48' : 'text-neutral-500'}`}>
                                                    {entry.currentStreak === 1 ? t.day : t.days}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className={`mobile-card border p-5 text-center text-sm font-bold uppercase tracking-[0.16em] ${isDark ? 'border-white/10 bg-black/20 text-white/50' : 'border-neutral-200 bg-neutral-50 text-neutral-500'}`}>
                                {t.noStreaksYet}
                            </div>
                        )}
                    </section>

                    <section className={`mobile-card border p-4 shadow-sm ${isDark ? 'border-white/10 bg-[#0d1829]' : 'border-white bg-white'}`}>
                        <div className="mb-4 flex items-center justify-between gap-3">
                            <div>
                                <p className={`text-[10px] font-black uppercase tracking-[0.18em] ${isDark ? 'text-blue-200/70' : 'text-blue-700/60'}`}>
                                    {t.battleOfSchools}
                                </p>
                                <h2 className="pt-1 text-lg font-black">{t.globalRankings}</h2>
                            </div>
                            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-500/12 text-blue-500">
                                <Users className="h-5 w-5" />
                            </div>
                        </div>

                        {schools.length > 0 ? (
                            <div className="space-y-3">
                                {schools.slice(0, 3).map((school, index) => {
                                    const rank = index + 1;
                                    const isFirst = rank === 1;
                                    return (
                                        <div
                                            key={school.name}
                                            className={`mobile-card border p-4 ${isFirst
                                                ? 'border-blue-500/40 bg-blue-600 text-white'
                                                : isDark ? 'border-white/10 bg-black/20' : 'border-neutral-200 bg-neutral-50'
                                            }`}
                                        >
                                            <div className="flex items-start gap-3">
                                                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-sm font-black ${isFirst ? 'bg-white text-blue-600' : 'bg-blue-500/12 text-blue-500'}`}>
                                                    {rank === 1 ? <Star className="h-5 w-5 fill-current" /> : rank}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <h3 className="line-clamp-2 text-sm font-black leading-tight">{school.name}</h3>
                                                    <div className={`pt-2 text-[10px] font-black uppercase tracking-[0.16em] ${isFirst ? 'text-white/80' : isDark ? 'text-white/48' : 'text-neutral-500'}`}>
                                                        {formatTime(school.totalReadingTime)} {t.total}
                                                    </div>
                                                    <div className={`pt-1 text-[10px] font-black uppercase tracking-[0.16em] ${isFirst ? 'text-white/80' : isDark ? 'text-white/48' : 'text-neutral-500'}`}>
                                                        {school.studentCount} {t.readingStudents}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}

                                <div className={`mobile-card border overflow-hidden ${isDark ? 'border-white/10 bg-black/20' : 'border-neutral-200 bg-neutral-50'}`}>
                                    {schools.map((school, index) => (
                                        <div key={school.name} className={`flex items-center gap-3 px-3 py-3 ${index > 0 ? 'border-t border-white/10' : ''}`}>
                                            <span className={`w-6 text-sm font-black ${index < 3 ? 'text-blue-500' : isDark ? 'text-white/40' : 'text-neutral-400'}`}>{index + 1}</span>
                                            <div className="min-w-0 flex-1">
                                                <div className="truncate text-sm font-black">{school.name}</div>
                                                <div className={`text-[10px] font-black uppercase tracking-[0.16em] ${isDark ? 'text-white/48' : 'text-neutral-500'}`}>
                                                    {school.studentCount} {t.readingStudents}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-sm font-black text-blue-500">{formatTime(school.totalReadingTime)}</div>
                                                <div className={`text-[10px] font-black uppercase tracking-[0.16em] ${isDark ? 'text-white/48' : 'text-neutral-500'}`}>{t.readingTime}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className={`mobile-card border p-5 text-center text-sm font-bold uppercase tracking-[0.16em] ${isDark ? 'border-white/10 bg-black/20 text-white/50' : 'border-neutral-200 bg-neutral-50 text-neutral-500'}`}>
                                {t.noSchoolsYet}
                            </div>
                        )}
                    </section>
                </div>
            </MobileScreenShell>
        );
    }

    return (
        <div className={`min-h-screen ${isDark ? 'bg-[#0d0d0d] text-white' : 'bg-neutral-50 text-neutral-900'} p-4 md:p-8 pt-24`}>
            <div className="max-w-5xl mx-auto">
                <div className="flex items-center justify-between mb-12">
                    <Link href="/" className={`p-2 rounded-full transition-colors ${isDark ? 'hover:bg-neutral-800' : 'hover:bg-neutral-200'}`}>
                        <ArrowLeft className="w-6 h-6" />
                    </Link>
                    <div className="text-center">
                        <h1 className="text-4xl font-black mb-2 uppercase tracking-tighter flex items-center gap-4">
                            <GraduationCap className="w-10 h-10 text-blue-500" />
                            {t.leaderboard}
                        </h1>
                        <p className="opacity-60 font-bold uppercase tracking-widest text-xs">{t.dailyStreaks}</p>
                    </div>
                    <div className="w-10" />
                </div>

                <section className="mb-12">
                    <div className={`rounded-3xl border overflow-hidden ${isDark ? 'bg-neutral-900/50 border-neutral-800' : 'bg-white border-neutral-200 shadow-xl'}`}>
                        <div className="px-8 py-6 border-b border-neutral-200/10 flex justify-between items-center bg-blue-500/5">
                            <div>
                                <h2 className="font-black uppercase tracking-widest text-sm">{t.streakLeaderboard}</h2>
                                <p className="text-xs font-bold uppercase tracking-widest opacity-40 mt-1">{t.dailyStreaks}</p>
                            </div>
                            <Flame className="w-5 h-5 text-orange-500" />
                        </div>

                        {streakUsers.length > 0 ? (
                            <>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 items-end">
                                    {streakUsers.slice(0, 3).map((entry, index) => {
                                        const rank = index + 1;
                                        const isFirst = rank === 1;
                                        return (
                                            <div
                                                key={entry.id}
                                                className={`relative flex flex-col items-center p-8 rounded-3xl border transition-all hover:scale-105 ${isFirst
                                                    ? 'bg-blue-600 border-blue-500 text-white shadow-2xl shadow-blue-600/30 md:order-2 min-h-80'
                                                    : isDark ? 'bg-neutral-950/70 border-neutral-800 min-h-72' : 'bg-neutral-50 border-neutral-200 min-h-72'
                                                    } ${rank === 2 ? 'md:order-1' : ''} ${rank === 3 ? 'md:order-3' : ''}`}
                                            >
                                                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 text-2xl font-black ${isFirst ? 'bg-white text-blue-600' : 'bg-blue-500/10 text-blue-500'}`}>
                                                    {rank === 1 ? <Star className="w-8 h-8 fill-current" /> : rank}
                                                </div>
                                                <Avatar
                                                    name={entry.displayName}
                                                    photoURL={entry.photoURL}
                                                    sizeClass="w-20 h-20"
                                                    textClass="text-xl"
                                                />
                                                <h3 className="text-xl font-black text-center mt-4 mb-2 break-words">{entry.displayName}</h3>
                                                <div className={`mt-auto flex items-center gap-2 text-sm font-black uppercase tracking-widest ${isFirst ? 'text-white/85' : 'text-orange-500'}`}>
                                                    <Flame className="w-4 h-4" />
                                                    {formatStreak(entry.currentStreak)}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                <div className="border-t border-neutral-200/10">
                                    <div className="px-8 py-6 border-b border-neutral-200/10 flex justify-between items-center bg-blue-500/5">
                                        <h3 className="font-black uppercase tracking-widest text-sm">{t.globalRankings}</h3>
                                        <BarChart3 className="w-5 h-5 opacity-40" />
                                    </div>
                                    <div className="divide-y divide-neutral-200/10">
                                        {streakUsers.map((entry, index) => (
                                            <div key={entry.id} className="px-8 py-5 flex items-center gap-4 group transition-colors hover:bg-blue-500/5">
                                                <span className={`text-xl font-black w-8 ${index < 3 ? 'text-blue-500' : 'opacity-40'}`}>{index + 1}</span>
                                                <Avatar
                                                    name={entry.displayName}
                                                    photoURL={entry.photoURL}
                                                    sizeClass="w-12 h-12"
                                                    textClass="text-sm"
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="font-black text-lg truncate group-hover:text-blue-500 transition-colors">{entry.displayName}</h4>
                                                    <span className="text-xs font-bold opacity-40 uppercase tracking-widest">{t.streak}</span>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-xl font-black text-orange-500">{entry.currentStreak}</div>
                                                    <span className="text-[10px] font-black uppercase tracking-widest opacity-40">{entry.currentStreak === 1 ? t.day : t.days}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="p-12 text-center opacity-40 font-bold uppercase tracking-widest">
                                {t.noStreaksYet}
                            </div>
                        )}
                    </div>
                </section>

                <section>
                    <div className="mb-6">
                        <h2 className="text-2xl font-black uppercase tracking-tight flex items-center gap-3">
                            <Users className="w-6 h-6 text-blue-500" />
                            {t.battleOfSchools}
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 items-end">
                        {schools.slice(0, 3).map((school, index) => {
                            const rank = index + 1;
                            const isFirst = rank === 1;
                            return (
                                <div
                                    key={school.name}
                                    className={`relative flex flex-col items-center p-8 rounded-3xl border transition-all hover:scale-105 ${isFirst
                                        ? 'bg-blue-600 border-blue-500 text-white shadow-2xl shadow-blue-600/30 md:order-2 h-80'
                                        : isDark ? 'bg-neutral-900/50 border-neutral-800 h-64' : 'bg-white border-neutral-200 h-64 shadow-xl'
                                        } ${rank === 2 ? 'md:order-1' : ''} ${rank === 3 ? 'md:order-3' : ''}`}
                                >
                                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 text-2xl font-black ${isFirst ? 'bg-white text-blue-600' : 'bg-blue-500/10 text-blue-500'}`}>
                                        {rank === 1 ? <Star className="w-8 h-8 fill-current" /> : rank}
                                    </div>
                                    <h3 className="text-xl font-black text-center mb-2 line-clamp-2">{school.name}</h3>
                                    <div className={`text-sm font-black uppercase tracking-widest ${isFirst ? 'text-white/80' : 'opacity-40'}`}>
                                        {formatTime(school.totalReadingTime)} {t.total}
                                    </div>
                                    <div className={`mt-auto flex items-center gap-2 text-xs font-bold ${isFirst ? 'bg-white/10' : 'bg-neutral-500/10'} px-3 py-1 rounded-full`}>
                                        <Users className="w-3 h-3" />
                                        {school.studentCount} {t.readingStudents}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className={`rounded-3xl border overflow-hidden ${isDark ? 'bg-neutral-900/50 border-neutral-800' : 'bg-white border-neutral-200 shadow-xl'}`}>
                        <div className="px-8 py-6 border-b border-neutral-200/10 flex justify-between items-center bg-blue-500/5">
                            <h2 className="font-black uppercase tracking-widest text-sm">{t.globalRankings}</h2>
                            <BarChart3 className="w-5 h-5 opacity-40" />
                        </div>
                        <div className="divide-y divide-neutral-200/10">
                            {schools.map((school, index) => (
                                <div key={school.name} className="px-8 py-5 flex items-center gap-6 group transition-colors hover:bg-blue-500/5">
                                    <span className={`text-xl font-black w-8 ${index < 3 ? 'text-blue-500' : 'opacity-40'}`}>{index + 1}</span>
                                    <div className="flex-1">
                                        <h4 className="font-black text-lg group-hover:text-blue-500 transition-colors">{school.name}</h4>
                                        <span className="text-xs font-bold opacity-40 uppercase tracking-widest">{school.studentCount} {t.readingStudents}</span>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xl font-black text-blue-500">{formatTime(school.totalReadingTime)}</div>
                                        <span className="text-[10px] font-black uppercase tracking-widest opacity-40">{t.readingTime}</span>
                                    </div>
                                </div>
                            ))}
                            {schools.length === 0 && (
                                <div className="p-12 text-center opacity-40 font-bold uppercase tracking-widest">
                                    {t.noSchoolsYet}
                                </div>
                            )}
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}
