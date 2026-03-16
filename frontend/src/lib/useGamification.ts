import { useState, useEffect, useCallback } from 'react';
import { db } from '@/lib/firebase';
import {
    doc,
    getDoc,
    setDoc,
    updateDoc,
    increment,
    arrayUnion,
    collection,
    getDocs,
    query,
    where,
    documentId,
    runTransaction,
} from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';

export interface UserStats {
    xp: number;
    level: number;
    badges: string[];
    school?: string;
    currentStreak: number;
    lastReadDate?: string;
    displayName?: string;
    photoURL?: string;
    totalReadingTime: number; // in seconds
    completedChapters: string[];
    completedBooks: string[];
}

export const XP_PER_CHAPTER = 100;
export const XP_PER_BOOK = 500;
export const XP_PER_MINUTE = 1;

export type BadgeRequirementType = 'chapters' | 'totalTime' | 'uniqueBooks' | 'completedBooks';
export type BadgeIcon = 'Trophy' | 'Star' | 'BookOpen' | 'Clock' | 'Award';
export type BadgeColor = 'yellow' | 'blue' | 'green' | 'purple' | 'orange';

export interface BadgeDefinition {
    id: string;
    icon: BadgeIcon;
    color: BadgeColor;
    requirementType: BadgeRequirementType;
    threshold: number;
    nameKey: string;
    requirementKey: string;
}

export const AVAILABLE_BADGES: BadgeDefinition[] = [
    {
        id: 'Rustaveli Master',
        icon: 'Trophy',
        color: 'yellow',
        requirementType: 'chapters',
        threshold: 10,
        nameKey: 'rustaveliMaster',
        requirementKey: 'badgeReqRustaveliMaster'
    },
    {
        id: 'Poetry Analyst',
        icon: 'Star',
        color: 'blue',
        requirementType: 'totalTime',
        threshold: 3600,
        nameKey: 'poetryAnalyst',
        requirementKey: 'badgeReqPoetryAnalyst'
    },
    {
        id: 'Bookworm',
        icon: 'BookOpen',
        color: 'green',
        requirementType: 'uniqueBooks',
        threshold: 5,
        nameKey: 'bookworm',
        requirementKey: 'badgeReqBookworm'
    },
    {
        id: 'Marathon Reader',
        icon: 'Clock',
        color: 'purple',
        requirementType: 'totalTime',
        threshold: 18000,
        nameKey: 'marathonreader',
        requirementKey: 'badgeReqMarathonReader'
    },
    {
        id: 'Story Finisher',
        icon: 'Award',
        color: 'orange',
        requirementType: 'completedBooks',
        threshold: 1,
        nameKey: 'storyfinisher',
        requirementKey: 'badgeReqStoryFinisher'
    }
];

const getUniqueCompletedBooks = (stats: UserStats) => {
    return new Set(stats.completedChapters.map((chapterKey) => chapterKey.split('_')[0])).size;
};

export const getBadgeProgress = (stats: UserStats, badge: BadgeDefinition) => {
    if (badge.requirementType === 'chapters') return stats.completedChapters.length;
    if (badge.requirementType === 'totalTime') return stats.totalReadingTime;
    if (badge.requirementType === 'uniqueBooks') return getUniqueCompletedBooks(stats);
    return stats.completedBooks.length;
};

const isBadgeRequirementMet = (stats: UserStats, badge: BadgeDefinition) => {
    return getBadgeProgress(stats, badge) >= badge.threshold;
};

const getTodayDateKey = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const getPreviousDateKey = (dateKey: string) => {
    const [year, month, day] = dateKey.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    date.setDate(date.getDate() - 1);
    const previousYear = date.getFullYear();
    const previousMonth = String(date.getMonth() + 1).padStart(2, '0');
    const previousDay = String(date.getDate()).padStart(2, '0');
    return `${previousYear}-${previousMonth}-${previousDay}`;
};

const getProfileIdentity = (user: { displayName?: string | null; photoURL?: string | null }) => {
    const profile: Pick<UserStats, 'displayName' | 'photoURL'> = {};

    if (typeof user.displayName === 'string' && user.displayName.trim()) {
        profile.displayName = user.displayName.trim();
    }

    if (typeof user.photoURL === 'string' && user.photoURL.trim()) {
        profile.photoURL = user.photoURL.trim();
    }

    return profile;
};

export function useGamification() {
    const { user } = useAuth();
    const [stats, setStats] = useState<UserStats | null>(null);
    const [loading, setLoading] = useState(true);

    const calculateLevel = (xp: number) => {
        return Math.floor(Math.sqrt(xp / 100)) + 1;
    };

    const fetchStats = useCallback(async () => {
        if (!user) {
            setLoading(false);
            return;
        }
        try {
            const userRef = doc(db, 'users', user.uid);
            const userSnap = await getDoc(userRef);
            const profileIdentity = getProfileIdentity(user);

            let baseStats: UserStats;
            if (userSnap.exists()) {
                baseStats = {
                    totalReadingTime: 0,
                    completedChapters: [],
                    completedBooks: [],
                    badges: [],
                    level: 1,
                    xp: 0,
                    currentStreak: 0,
                    ...profileIdentity,
                    ...(userSnap.data() as Partial<UserStats>),
                };
            } else {
                baseStats = {
                    xp: 0,
                    level: 1,
                    badges: [],
                    currentStreak: 0,
                    ...profileIdentity,
                    totalReadingTime: 0,
                    completedChapters: [],
                    completedBooks: []
                };
                await setDoc(userRef, baseStats);
            }

            // Aggregate total reading time across all books from userReadingStats.
            // Doc IDs are {userId}_{bookId}, so query by document ID prefix (works for existing docs without a userId field).
            try {
                const statsCollection = collection(db, 'userReadingStats');
                const prefix = user.uid + '_';
                const prefixEnd = user.uid + '_\uf8ff'; // lexicographic upper bound for prefix
                const statsQuery = query(
                    statsCollection,
                    where(documentId(), '>=', prefix),
                    where(documentId(), '<=', prefixEnd)
                );
                const statsSnapshot = await getDocs(statsQuery);

                let aggregatedSeconds = 0;
                statsSnapshot.forEach((docSnap) => {
                    const data = docSnap.data() as { timeSpent?: unknown };
                    const seconds = typeof data.timeSpent === 'number' ? data.timeSpent : 0;
                    aggregatedSeconds += seconds;
                });

                // Always use aggregated total so profile shows sum across all books
                baseStats.totalReadingTime = aggregatedSeconds;

                // Keep the user document in sync for leaderboards and other consumers
                if (aggregatedSeconds >= 0) {
                    await updateDoc(userRef, { totalReadingTime: aggregatedSeconds }).catch(() => {
                        // Non-fatal; profile still shows correct value from baseStats
                    });
                }
            } catch (aggregationError) {
                console.error("Error aggregating reading time from userReadingStats:", aggregationError);
            }

            setStats(baseStats);
        } catch (error) {
            console.error("Error fetching user stats:", error);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    const syncDailyStreak = useCallback(async (seconds: number) => {
        if (!user || seconds <= 0) return;

        const userRef = doc(db, 'users', user.uid);
        const today = getTodayDateKey();
        const yesterday = getPreviousDateKey(today);
        const profileIdentity = getProfileIdentity(user);

        try {
            let nextStatsSnapshot: UserStats | null = null;

            await runTransaction(db, async (transaction) => {
                const userSnap = await transaction.get(userRef);

                const baseStats: UserStats = userSnap.exists()
                    ? {
                        xp: 0,
                        level: 1,
                        badges: [],
                        currentStreak: 0,
                        totalReadingTime: 0,
                        completedChapters: [],
                        completedBooks: [],
                        ...(userSnap.data() as Partial<UserStats>),
                    }
                    : {
                        xp: 0,
                        level: 1,
                        badges: [],
                        currentStreak: 0,
                        ...profileIdentity,
                        totalReadingTime: 0,
                        completedChapters: [],
                        completedBooks: [],
                    };

                const lastReadDate = typeof baseStats.lastReadDate === 'string' ? baseStats.lastReadDate : undefined;
                const currentStreak = typeof baseStats.currentStreak === 'number' ? baseStats.currentStreak : 0;

                let updatedStreak = currentStreak;
                if (lastReadDate !== today) {
                    updatedStreak = lastReadDate === yesterday ? currentStreak + 1 : 1;
                }

                nextStatsSnapshot = {
                    ...baseStats,
                    currentStreak: updatedStreak,
                    lastReadDate: today,
                    ...profileIdentity,
                };

                if (userSnap.exists()) {
                    transaction.update(userRef, {
                        currentStreak: updatedStreak,
                        lastReadDate: today,
                        ...profileIdentity,
                    });
                } else {
                    transaction.set(userRef, nextStatsSnapshot);
                }
            });

            if (nextStatsSnapshot) {
                const resolvedStats = nextStatsSnapshot as UserStats;
                setStats((prev) => prev ? {
                    ...prev,
                    currentStreak: resolvedStats.currentStreak,
                    lastReadDate: resolvedStats.lastReadDate,
                    displayName: resolvedStats.displayName,
                    photoURL: resolvedStats.photoURL,
                } : resolvedStats);
            }
        } catch (error) {
            console.error("Error syncing daily streak:", error);
        }
    }, [user]);

    useEffect(() => {
        if (!loading && user) {
            syncDailyStreak(1);
        }
    }, [loading, user, syncDailyStreak]);

    const addXP = useCallback(async (amount: number) => {
        if (!user || !stats) return;
        try {
            const newXP = stats.xp + amount;
            const newLevel = calculateLevel(newXP);
            const userRef = doc(db, 'users', user.uid);
            await updateDoc(userRef, {
                xp: increment(amount),
                level: newLevel
            });
            setStats(prev => prev ? { ...prev, xp: prev.xp + amount, level: newLevel } : null);

            return { leveledUp: newLevel > stats.level };
        } catch (error) {
            console.error("Error adding XP:", error);
        }
    }, [user, stats]);

    const checkBadges = useCallback(async (statsOverride?: UserStats) => {
        if (!user) return;
        const activeStats = statsOverride || stats;
        if (!activeStats) return;
        const newBadges: string[] = [];

        AVAILABLE_BADGES.forEach((badge) => {
            if (isBadgeRequirementMet(activeStats, badge) && !activeStats.badges.includes(badge.id)) {
                newBadges.push(badge.id);
            }
        });

        if (newBadges.length > 0) {
            const userRef = doc(db, 'users', user.uid);
            await updateDoc(userRef, {
                badges: arrayUnion(...newBadges)
            });
            setStats((prev) => {
                if (!prev) return null;
                const mergedBadges = [...prev.badges];
                newBadges.forEach((badgeId) => {
                    if (!mergedBadges.includes(badgeId)) mergedBadges.push(badgeId);
                });
                return { ...prev, badges: mergedBadges };
            });
        }
    }, [user, stats]);

    const completeChapter = useCallback(async (comicId: string, chapterId: string) => {
        if (!user) return { alreadyCompleted: true };
        const chapterKey = `${comicId}_${chapterId}`;
        // Skip write if we already know it's completed (optional; arrayUnion is idempotent anyway)
        if (stats?.completedChapters.includes(chapterKey)) return { alreadyCompleted: true };

        try {
            const userRef = doc(db, 'users', user.uid);
            const userSnap = await getDoc(userRef);

            if (!userSnap.exists()) {
                const initialStats: UserStats = {
                    xp: XP_PER_CHAPTER,
                    level: calculateLevel(XP_PER_CHAPTER),
                    badges: [],
                    currentStreak: 0,
                    ...getProfileIdentity(user),
                    totalReadingTime: 0,
                    completedChapters: [chapterKey],
                    completedBooks: []
                };
                await setDoc(userRef, initialStats);
            } else {
                await updateDoc(userRef, {
                    completedChapters: arrayUnion(chapterKey),
                    xp: increment(XP_PER_CHAPTER)
                });
            }

            const nextStats = stats ? {
                ...stats,
                completedChapters: stats.completedChapters.includes(chapterKey)
                    ? stats.completedChapters
                    : [...stats.completedChapters, chapterKey],
                xp: stats.xp + XP_PER_CHAPTER,
                level: calculateLevel((stats.xp || 0) + XP_PER_CHAPTER)
            } : null;

            setStats(prev => prev ? {
                ...prev,
                completedChapters: prev.completedChapters.includes(chapterKey)
                    ? prev.completedChapters
                    : [...prev.completedChapters, chapterKey],
                xp: prev.xp + XP_PER_CHAPTER,
                level: calculateLevel((prev.xp || 0) + XP_PER_CHAPTER)
            } : null);

            if (nextStats) await checkBadges(nextStats);
            return { alreadyCompleted: false };
        } catch (error) {
            console.error("Error completing chapter:", error);
            return { alreadyCompleted: true };
        }
    }, [user, stats, checkBadges]);

    const markBookCompleted = useCallback(async (comicId: string) => {
        if (!user || !comicId) return { alreadyCompleted: true };

        try {
            const userRef = doc(db, 'users', user.uid);
            let didMarkCompleted = false;

            await runTransaction(db, async (transaction) => {
                const userSnap = await transaction.get(userRef);

                if (!userSnap.exists()) {
                    didMarkCompleted = true;
                    transaction.set(userRef, {
                        xp: XP_PER_BOOK,
                        level: calculateLevel(XP_PER_BOOK),
                        badges: [],
                        currentStreak: 0,
                        ...getProfileIdentity(user),
                        totalReadingTime: 0,
                        completedChapters: [],
                        completedBooks: [comicId]
                    } as UserStats);
                    return;
                }

                const userData = userSnap.data() as Partial<UserStats>;
                const completedBooks = Array.isArray(userData.completedBooks) ? userData.completedBooks : [];
                if (completedBooks.includes(comicId)) {
                    didMarkCompleted = false;
                    return;
                }

                didMarkCompleted = true;
                const currentXP = typeof userData.xp === 'number' ? userData.xp : 0;
                const updatedXP = currentXP + XP_PER_BOOK;

                transaction.update(userRef, {
                    completedBooks: arrayUnion(comicId),
                    xp: increment(XP_PER_BOOK),
                    level: calculateLevel(updatedXP)
                });
            });

            if (!didMarkCompleted) return { alreadyCompleted: true };

            const nextStats = stats ? {
                ...stats,
                completedBooks: stats.completedBooks.includes(comicId)
                    ? stats.completedBooks
                    : [...stats.completedBooks, comicId],
                xp: stats.xp + XP_PER_BOOK,
                level: calculateLevel((stats.xp || 0) + XP_PER_BOOK)
            } : null;

            setStats((prev) => {
                if (!prev) return prev;
                const completedBooks = prev.completedBooks.includes(comicId)
                    ? prev.completedBooks
                    : [...prev.completedBooks, comicId];
                const updatedXP = prev.xp + XP_PER_BOOK;
                return {
                    ...prev,
                    completedBooks,
                    xp: updatedXP,
                    level: calculateLevel(updatedXP)
                };
            });

            if (nextStats) await checkBadges(nextStats);
            return { alreadyCompleted: false };
        } catch (error) {
            console.error("Error marking book completion:", error);
            return { alreadyCompleted: true };
        }
    }, [user, stats, checkBadges]);

    const addReadingTime = useCallback(async (seconds: number) => {
        if (!user) return;
        try {
            const userRef = doc(db, 'users', user.uid);
            const xpGained = Math.floor(seconds / 60) * XP_PER_MINUTE;

            await syncDailyStreak(seconds);

            const updates: {
                totalReadingTime: ReturnType<typeof increment>;
                xp?: ReturnType<typeof increment>;
            } = {
                totalReadingTime: increment(seconds)
            };

            if (xpGained > 0) {
                updates.xp = increment(xpGained);
            }

            await updateDoc(userRef, updates);

            const nextStats = stats ? {
                ...stats,
                totalReadingTime: stats.totalReadingTime + seconds,
                xp: stats.xp + xpGained,
                level: calculateLevel(stats.xp + xpGained)
            } : null;

            // Update local state if stats are loaded
            setStats(prev => {
                if (!prev) return null;
                const newXP = prev.xp + xpGained;
                return {
                    ...prev,
                    totalReadingTime: prev.totalReadingTime + seconds,
                    xp: newXP,
                    level: calculateLevel(newXP)
                };
            });

            // Check for time-based badges
            if (nextStats) await checkBadges(nextStats);
        } catch (error) {
            console.error("Error adding reading time:", error);
        }
    }, [user, stats, checkBadges, syncDailyStreak]);

    const setSchool = useCallback(async (schoolName: string) => {
        if (!user) return;
        try {
            const userRef = doc(db, 'users', user.uid);
            await updateDoc(userRef, { school: schoolName });
            setStats(prev => prev ? { ...prev, school: schoolName } : null);
        } catch (error) {
            console.error("Error setting school:", error);
        }
    }, [user]);

    return { stats, loading, addXP, addReadingTime, completeChapter, markBookCompleted, setSchool, fetchStats, checkBadges };
}
