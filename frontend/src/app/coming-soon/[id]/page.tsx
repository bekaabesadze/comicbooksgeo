'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Clock3, Loader2, Tag } from 'lucide-react';
import { doc, getDocFromServer } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import { resolveBookCategory } from '@/lib/bookCategory';
import { getComicMetadata } from '@/app/actions/comicMetadata';

interface ComicBlock {
  imageUrl?: string;
  croppedImageUrl?: string;
}

interface ComicData {
  title?: string;
  author?: string;
  category?: string;
  coverUrl?: string;
  blocks?: ComicBlock[];
}

const SAFE_DOC_ID = /^[A-Za-z0-9_-]{1,128}$/;

export default function ComingSoonPage() {
  const params = useParams<{ id: string }>();
  const comicId = useMemo(() => (typeof params?.id === 'string' ? params.id : ''), [params]);
  const { t, language } = useLanguage();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);
  const [comic, setComic] = useState<ComicData | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadComic = async () => {
      if (!comicId || !SAFE_DOC_ID.test(comicId)) {
        if (isMounted) {
          setMissing(true);
          setLoading(false);
        }
        return;
      }

      try {
        const metadata = await getComicMetadata(comicId);

        if (!isMounted) return;

        if (!metadata) {
          setMissing(true);
          return;
        }

        setComic(metadata as ComicData);
      } catch (error) {
        console.error('Failed to load coming soon comic:', error);
        if (isMounted) setMissing(true);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadComic();
    return () => {
      isMounted = false;
    };
  }, [comicId]);

  const firstBlockImage = comic?.blocks?.find((block) => block?.croppedImageUrl || block?.imageUrl);
  const coverImage = comic?.coverUrl || firstBlockImage?.croppedImageUrl || firstBlockImage?.imageUrl || null;
  const title = comic?.title?.trim() || t.comic;
  const author = comic?.author?.trim() || t.unknownAuthor;
  const categoryLabel = resolveBookCategory({ title, category: comic?.category, language });
  const initials = title.slice(0, 2).toUpperCase();

  return (
    <main className={`min-h-screen relative overflow-hidden ${isDark ? 'bg-[#080c14] text-white' : 'bg-neutral-50 text-neutral-900'}`}>
      <div className="absolute inset-0 pointer-events-none">
        <div className={`absolute -top-24 -left-24 w-[420px] h-[420px] rounded-full blur-[120px] ${isDark ? 'bg-blue-600/20' : 'bg-blue-300/40'}`} />
        <div className={`absolute -bottom-24 -right-16 w-[460px] h-[460px] rounded-full blur-[140px] ${isDark ? 'bg-indigo-600/20' : 'bg-indigo-300/30'}`} />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-5 md:px-8 py-8 md:py-12">
        <Link
          href="/"
          className={`inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest px-4 py-2 rounded-full border transition-colors ${isDark
            ? 'border-white/10 text-white/70 hover:text-white hover:bg-white/5'
            : 'border-neutral-200 text-neutral-600 hover:text-neutral-900 hover:bg-white'
            }`}
        >
          <ArrowLeft className="w-4 h-4" />
          {t.backToLibrary}
        </Link>

        <div className={`mt-6 md:mt-8 rounded-3xl border backdrop-blur-sm overflow-hidden ${isDark ? 'bg-black/30 border-white/10' : 'bg-white/80 border-neutral-200'}`}>
          {loading ? (
            <div className="min-h-[520px] flex flex-col items-center justify-center gap-4">
              <Loader2 className="w-9 h-9 animate-spin text-blue-500" />
              <p className={`${isDark ? 'text-white/70' : 'text-neutral-600'}`}>
                {t.loadingLibrary}
              </p>
            </div>
          ) : missing ? (
            <div className="min-h-[520px] flex flex-col items-center justify-center gap-4 px-6 text-center">
              <h1 className={`text-2xl font-black ${isDark ? 'text-white' : 'text-neutral-900'}`}>
                {t.notFound}
              </h1>
              <p className={`${isDark ? 'text-white/70' : 'text-neutral-600'}`}>
                {t.comicNotAvailable}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-[340px_1fr]">
              <div className="p-5 md:p-8">
                <div className="relative aspect-[3/4] rounded-2xl overflow-hidden border border-white/15 shadow-[0_20px_50px_rgba(0,0,0,0.45)]">
                  {coverImage ? (
                    <img src={coverImage} alt={title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-900/70 to-[#090f1a]">
                      <span className="text-5xl font-black tracking-widest text-blue-200">{initials}</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/10" />
                  <div className="absolute left-3 right-3 bottom-3">
                    <div className="rounded-xl bg-black/45 backdrop-blur-md border border-white/20 px-3 py-2">
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-300">
                        {t.comingSoon}
                      </p>
                      <p className="text-xs text-white/80 mt-1 line-clamp-2">{title}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="px-6 pb-7 md:pl-2 md:pr-8 md:py-8 flex items-center">
                <div className="max-w-2xl">
                  <div className={`inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] px-3 py-1.5 rounded-full border ${isDark
                    ? 'bg-blue-500/10 text-blue-300 border-blue-500/30'
                    : 'bg-blue-50 text-blue-700 border-blue-200'
                    }`}>
                    <Clock3 className="w-3.5 h-3.5" />
                    {t.releaseSoonTitle}
                  </div>

                  <h1 className={`mt-4 text-3xl md:text-4xl font-black leading-tight ${isDark ? 'text-white' : 'text-neutral-900'}`}>
                    {title}
                  </h1>

                  <p className={`mt-2 text-xs font-bold uppercase tracking-widest ${isDark ? 'text-blue-300/70' : 'text-blue-700/70'}`}>
                    {author}
                  </p>
                  {categoryLabel && (
                    <div className="mt-3">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[10px] sm:text-xs font-black uppercase tracking-widest ${isDark
                        ? 'bg-blue-500/10 text-blue-300 border-blue-500/30'
                        : 'bg-blue-50 text-blue-700 border-blue-200'
                        }`}>
                        <Tag className="w-3.5 h-3.5" />
                        {categoryLabel}
                      </span>
                    </div>
                  )}

                  <p className={`mt-6 text-base md:text-lg leading-relaxed ${isDark ? 'text-white/85' : 'text-neutral-700'}`}>
                    {t.releaseSoonMessage}
                  </p>
                  <p className={`mt-3 text-sm ${isDark ? 'text-white/60' : 'text-neutral-500'}`}>
                    {t.releaseSoonHint}
                  </p>

                  <Link
                    href="/"
                    className="mt-8 inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-blue-600 text-white text-xs font-black uppercase tracking-widest hover:bg-blue-500 transition-colors shadow-[0_12px_24px_rgba(37,99,235,0.35)]"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    {t.backToLibrary}
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
