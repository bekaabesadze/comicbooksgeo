'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, getDocs, orderBy, limit } from 'firebase/firestore';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import { Trophy, Users, GraduationCap, Loader2, ArrowLeft, Star, School as SchoolIcon } from 'lucide-react';
import Link from 'next/link';

interface SchoolStats {
    name: string;
    totalReadingTime: number;
    studentCount: number;
}

export default function LeaderboardPage() {
    const { t } = useLanguage();
    const { theme } = useTheme();
    const [schools, setSchools] = useState<SchoolStats[]>([]);
    const [loading, setLoading] = useState(true);

    const isDark = theme === 'dark';

    useEffect(() => {
        const fetchLeaderboard = async () => {
            try {
                // In a real app, we'd have a 'schools' collection that is updated by a cloud function or user action.
                // For this implementation, we'll aggregate from 'users' collection for demonstration purposes.
                const usersRef = collection(db, 'users');
                const q = query(usersRef);
                const snapshot = await getDocs(q);

                const aggregation: Record<string, { totalTime: number, count: number }> = {};

                snapshot.forEach(doc => {
                    const data = doc.data();
                    if (data.school) {
                        if (!aggregation[data.school]) {
                            aggregation[data.school] = { totalTime: 0, count: 0 };
                        }
                        aggregation[data.school].totalTime += (data.totalReadingTime || 0);
                        aggregation[data.school].count += 1;
                    }
                });

                const sortedSchools = Object.entries(aggregation)
                    .map(([name, stats]) => ({
                        name,
                        totalReadingTime: stats.totalTime,
                        studentCount: stats.count
                    }))
                    .sort((a, b) => b.totalReadingTime - a.totalReadingTime);

                setSchools(sortedSchools);
            } catch (error) {
                console.error("Error fetching leaderboard:", error);
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

    if (loading) {
        return (
            <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-[#0d0d0d]' : 'bg-neutral-50'}`}>
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        );
    }

    return (
        <div className={`min-h-screen ${isDark ? 'bg-[#0d0d0d] text-white' : 'bg-neutral-50 text-neutral-900'} p-4 md:p-8 pt-24`}>
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-12">
                    <Link href="/" className={`p-2 rounded-full transition-colors ${isDark ? 'hover:bg-neutral-800' : 'hover:bg-neutral-200'}`}>
                        <ArrowLeft className="w-6 h-6" />
                    </Link>
                    <div className="text-center">
                        <h1 className="text-4xl font-black mb-2 uppercase tracking-tighter flex items-center gap-4">
                            <GraduationCap className="w-10 h-10 text-blue-500" />
                            {t.leaderboard}
                        </h1>
                        <p className="opacity-60 font-bold uppercase tracking-widest text-xs">{t.battleOfSchools}</p>
                    </div>
                    <div className="w-10" />
                </div>

                {/* Top 3 Schools */}
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

                {/* Leaderboard Table */}
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
            </div>
        </div>
    );
}

import { BarChart3 } from 'lucide-react';
