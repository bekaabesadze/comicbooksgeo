'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, deleteDoc, doc, orderBy } from 'firebase/firestore';
import { Plus, BookOpen, Clock, Trash2, ArrowLeft, MessageSquare, PenTool } from 'lucide-react';
import CreateComicModal from '@/components/ComicEditor/CreateComicModal';
import { useLanguage } from '@/context/LanguageContext';

interface ComicData {
    id: string;
    title: string;
    author: string;
    isPublished: boolean;
    coverUrl?: string;
    updatedAt?: unknown;
    blocks?: any[];
}
interface ComicRequest {
    id: string;
    requesterName: string;
    comicTitle: string;
    bookAuthor: string;
    submittedAt: any;
    status: string;
}

export default function AdminDashboard() {
    const { t, language } = useLanguage();
    const [activeTab, setActiveTab] = useState<'drafts' | 'published' | 'requests'>('drafts');
    const [comics, setComics] = useState<ComicData[]>([]);
    const [requests, setRequests] = useState<ComicRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingRequests, setLoadingRequests] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        const fetchComics = async () => {
            setLoading(true);
            try {
                const { getDocsFromServer } = await import('firebase/firestore');
                const q = query(
                    collection(db, 'comics')
                );
                const snapshot = await getDocsFromServer(q);
                const data = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...(doc.data() as Omit<ComicData, 'id'>)
                }));
                data.sort((a, b) => {
                    const aTime = (a.updatedAt as any)?.toMillis?.() ?? 0;
                    const bTime = (b.updatedAt as any)?.toMillis?.() ?? 0;
                    return bTime - aTime;
                });
                setComics(data);
            } catch (error) {
                console.error("Error fetching comics:", error);
            } finally {
                setLoading(false);
            }
        };

        const fetchRequests = async () => {
            setLoadingRequests(true);
            try {
                const { getDocsFromServer } = await import('firebase/firestore');
                const q = query(
                    collection(db, 'comicRequests'),
                    orderBy('submittedAt', 'desc')
                );
                const snapshot = await getDocsFromServer(q);
                const data = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                })) as ComicRequest[];
                setRequests(data);
            } catch (error) {
                console.error("Error fetching comic requests:", error);
            } finally {
                setLoadingRequests(false);
            }
        };

        fetchComics();
        fetchRequests();
    }, []);

    const handleDelete = async (e: React.MouseEvent, id: string, title: string) => {
        e.preventDefault();
        e.stopPropagation();

        if (confirm(t.deleteConfirm(title))) {
            try {
                await deleteDoc(doc(db, 'comics', id));
                setComics(prev => prev.filter(c => c.id !== id));
            } catch (error) {
                console.error("Error deleting comic:", error);
                alert(t.deleteFailed);
            }
        }
    };

    const displayedComics = comics.filter(c =>
        activeTab === 'published' ? c.isPublished : !c.isPublished
    );

    const draftsCount = comics.filter(c => !c.isPublished).length;
    const publishedCount = comics.filter(c => c.isPublished).length;

    return (
        <div className="max-w-6xl mx-auto p-6 md:p-8 space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <Link href="/" className="inline-flex items-center gap-1.5 text-blue-400 hover:text-blue-300 text-xs font-bold mb-3 transition-colors">
                        <ArrowLeft className="w-3.5 h-3.5" />
                        {language === 'ka' ? 'საიტზე დაბრუნება' : 'Back to Website'}
                    </Link>
                    <h1 className="text-2xl font-black tracking-tight text-white">{t.creatorDashboard}</h1>
                    <p className="text-white/35 text-sm mt-1">{t.manageComics}</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-lg font-bold text-sm transition-colors flex items-center gap-2"
                >
                    <Plus className="w-4 h-4" />
                    {t.createNew}
                </button>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-3">
                <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3.5">
                    <div className="flex items-center gap-2.5 mb-1.5">
                        <PenTool className="w-4 h-4 text-amber-400/70" />
                        <span className="text-[11px] font-bold text-white/30 uppercase tracking-wider">{t.drafts}</span>
                    </div>
                    <p className="text-2xl font-black text-white">{draftsCount}</p>
                </div>
                <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3.5">
                    <div className="flex items-center gap-2.5 mb-1.5">
                        <BookOpen className="w-4 h-4 text-emerald-400/70" />
                        <span className="text-[11px] font-bold text-white/30 uppercase tracking-wider">{t.published}</span>
                    </div>
                    <p className="text-2xl font-black text-white">{publishedCount}</p>
                </div>
                <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3.5">
                    <div className="flex items-center gap-2.5 mb-1.5">
                        <MessageSquare className="w-4 h-4 text-blue-400/70" />
                        <span className="text-[11px] font-bold text-white/30 uppercase tracking-wider">{t.requestsBoardTitle || 'Requests'}</span>
                    </div>
                    <p className="text-2xl font-black text-white">{requests.length}</p>
                </div>
            </div>

            {/* Main Content */}
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl overflow-hidden">
                {/* Tab Bar */}
                <div className="border-b border-white/[0.06] flex">
                    {[
                        { id: 'drafts' as const, label: t.drafts, count: draftsCount, icon: Clock },
                        { id: 'published' as const, label: t.published, count: publishedCount, icon: BookOpen },
                        { id: 'requests' as const, label: t.requestsBoardTitle || 'Requests', count: requests.length, icon: MessageSquare },
                    ].map((tab) => {
                        const isActive = activeTab === tab.id;
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex-1 py-3.5 text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${isActive
                                    ? 'text-white border-b-2 border-blue-500 bg-white/[0.02]'
                                    : 'text-white/30 hover:text-white/50'
                                    }`}
                            >
                                <Icon className="w-4 h-4" />
                                <span>{tab.label}</span>
                                <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded ${isActive
                                    ? 'bg-blue-500/15 text-blue-400'
                                    : 'bg-white/5 text-white/25'
                                    }`}>
                                    {tab.count}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* Tab Content */}
                <div className="p-6">
                    {activeTab === 'requests' ? (
                        loadingRequests ? (
                            <div className="text-center py-16">
                                <div className="animate-spin w-6 h-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full mx-auto" />
                                <p className="text-white/25 text-sm mt-3">Loading requests...</p>
                            </div>
                        ) : requests.length === 0 ? (
                            <div className="text-center py-16">
                                <MessageSquare className="w-10 h-10 text-white/10 mx-auto mb-3" />
                                <h3 className="text-base font-bold text-white/40 mb-1">
                                    {t.noRequestsFound || 'No requests found.'}
                                </h3>
                                <p className="text-white/20 text-sm">
                                    When readers request new comics, they&apos;ll appear here.
                                </p>
                            </div>
                        ) : (
                            <div className="rounded-lg border border-white/[0.06] overflow-hidden">
                                <table className="w-full text-left text-sm">
                                    <thead>
                                        <tr className="bg-white/[0.02] border-b border-white/[0.06]">
                                            <th className="px-5 py-3 text-[11px] font-bold text-white/30 uppercase tracking-wider">{t.requesterHeader || 'Requester'}</th>
                                            <th className="px-5 py-3 text-[11px] font-bold text-white/30 uppercase tracking-wider">{t.comicTitleHeader || 'Title'}</th>
                                            <th className="px-5 py-3 text-[11px] font-bold text-white/30 uppercase tracking-wider">{t.authorHeader || 'Author'}</th>
                                            <th className="px-5 py-3 text-[11px] font-bold text-white/30 uppercase tracking-wider">{t.dateHeader || 'Date'}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {requests.map((request) => (
                                            <tr key={request.id} className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02] transition-colors">
                                                <td className="px-5 py-3.5 font-medium text-white/80">{request.requesterName}</td>
                                                <td className="px-5 py-3.5 text-blue-400 font-semibold">{request.comicTitle}</td>
                                                <td className="px-5 py-3.5 text-white/40">{request.bookAuthor}</td>
                                                <td className="px-5 py-3.5 whitespace-nowrap text-white/25 text-xs">
                                                    {(request.submittedAt as any)?.toDate?.().toLocaleDateString(language === 'ka' ? 'ka-GE' : 'en-US') || 'Recently'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )
                    ) : loading ? (
                        <div className="text-center py-16">
                            <div className="animate-spin w-6 h-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full mx-auto" />
                            <p className="text-white/25 text-sm mt-3">{t.loadingComics}</p>
                        </div>
                    ) : displayedComics.length === 0 ? (
                        <div className="text-center py-16">
                            <BookOpen className="w-10 h-10 text-white/10 mx-auto mb-3" />
                            <h3 className="text-base font-bold text-white/40 mb-1">
                                {activeTab === 'drafts' ? t.noDrafts.split('.')[0] : t.noPublished.split('.')[0]}
                            </h3>
                            <p className="text-white/20 text-sm max-w-sm mx-auto">
                                {activeTab === 'drafts' ? t.noDrafts : t.noPublished}
                            </p>
                            {activeTab === 'drafts' && (
                                <button
                                    onClick={() => setIsModalOpen(true)}
                                    className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-blue-400 hover:text-blue-300 transition-colors bg-blue-500/10 px-4 py-2 rounded-lg border border-blue-500/20"
                                >
                                    <Plus className="w-4 h-4" />
                                    {t.createNew}
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                            {displayedComics.map((comic) => (
                                <div
                                    key={comic.id}
                                    className="group bg-white/[0.02] rounded-xl border border-white/[0.06] overflow-hidden hover:border-white/[0.12] transition-all duration-300 flex flex-col"
                                >
                                    {/* Delete button */}
                                    <button
                                        onClick={(e) => handleDelete(e, comic.id, comic.title)}
                                        className="absolute top-3 right-3 p-2 bg-black/60 hover:bg-red-600 text-white/50 hover:text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all z-40"
                                        title="Delete Comic"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>

                                    {/* Cover Image */}
                                    <div className="aspect-[3/4] bg-white/[0.01] relative overflow-hidden">
                                        {comic.coverUrl ? (
                                            <>
                                                <img
                                                    src={comic.coverUrl}
                                                    alt={comic.title}
                                                    className="w-full h-full object-cover opacity-75 group-hover:opacity-100 group-hover:scale-[1.02] transition-all duration-500"
                                                />
                                                <div className="absolute inset-0 bg-gradient-to-t from-[#080c14] via-transparent to-transparent" />
                                            </>
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <BookOpen className="w-8 h-8 text-white/[0.06]" />
                                            </div>
                                        )}

                                        {/* Status badge */}
                                        <div className="absolute top-3 left-3 z-10">
                                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md backdrop-blur-sm ${comic.isPublished
                                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20'
                                                : 'bg-amber-500/20 text-amber-400 border border-amber-500/20'
                                                }`}>
                                                {comic.isPublished ? (language === 'ka' ? 'გამო.' : 'Live') : (language === 'ka' ? 'დრაფტი' : 'Draft')}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Info */}
                                    <div className="p-4 flex-1 flex flex-col justify-between border-t border-white/[0.04]">
                                        <div>
                                            <h3 className="font-bold text-sm text-white/90 mb-0.5 line-clamp-1">{comic.title}</h3>
                                            <p className="text-white/20 text-xs">
                                                {(comic.updatedAt as any)?.toDate?.().toLocaleDateString(language === 'ka' ? 'ka-GE' : 'en-US') || 'Recently'}
                                            </p>
                                        </div>
                                        <Link
                                            href={`/admin/editor/${comic.id}`}
                                            className="mt-3 block text-center bg-blue-600/90 hover:bg-blue-500 text-white py-2 rounded-lg text-xs font-bold transition-colors"
                                        >
                                            {activeTab === 'drafts' ? t.continueEditing : t.viewEditor}
                                        </Link>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
            <CreateComicModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
        </div>
    );
}
