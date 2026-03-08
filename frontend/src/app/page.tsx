'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { getAllComicsSecurely } from '@/app/actions/comicMetadata';
import { X, Loader2, BookOpen, Globe, Sun, Moon, Search, Users, Heart, LogIn, LogOut, Eye, Info, ArrowLeft, CheckCircle2, Send } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useGamification, XP_PER_CHAPTER } from '@/lib/useGamification';
import { Trophy, Star, Award, GraduationCap, ChevronRight, BarChart3, Settings } from 'lucide-react';

interface BubbleOverlay {
  id: string;
  bubbleType: 'bubble1' | 'bubble2' | 'bubble3' | 'bubble4';
  text: string;
  x: number;
  y: number;
  scale: number;
}

interface CharacterHotspot {
  id: string;
  characterId: string;
  x: number;
  y: number;
  radius: number;
}

interface ComicBlock {
  id: string;
  text: string;
  imageUrl: string;
  croppedImageUrl?: string;
  chapterTitle?: string;
  bubbles?: BubbleOverlay[];
  characterHotspots?: CharacterHotspot[];
}

interface Character {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
}

interface ComicData {
  id: string;
  title: string;
  author: string;
  category?: string;
  isPublished: boolean;
  coverUrl?: string;
  firstPageUrl?: string | null;
  updatedAt?: any;
  isSchoolMaterial?: boolean;
  grade?: number | null;
  blocks?: any[];
  views?: number;
  description?: string;
}

const MAX_HOTSPOTS_PER_BLOCK = 20;
const MIN_HOTSPOT_RADIUS = 2;
const MAX_HOTSPOT_RADIUS = 18;

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function sanitizeReaderHotspots(
  rawHotspots: unknown,
  validCharacterIds: Set<string>
): CharacterHotspot[] {
  if (!Array.isArray(rawHotspots) || validCharacterIds.size === 0) return [];

  const sanitized: CharacterHotspot[] = [];
  for (const raw of rawHotspots) {
    if (!raw || typeof raw !== 'object') continue;
    const candidate = raw as Record<string, unknown>;
    const id = typeof candidate.id === 'string' && candidate.id.trim()
      ? candidate.id.trim().slice(0, 120)
      : `hs_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const characterId = typeof candidate.characterId === 'string'
      ? candidate.characterId.trim()
      : '';
    const x = typeof candidate.x === 'number' ? candidate.x : Number(candidate.x);
    const y = typeof candidate.y === 'number' ? candidate.y : Number(candidate.y);
    const radius = typeof candidate.radius === 'number' ? candidate.radius : Number(candidate.radius);

    if (
      !validCharacterIds.has(characterId) ||
      !Number.isFinite(x) ||
      !Number.isFinite(y) ||
      !Number.isFinite(radius)
    ) {
      continue;
    }

    sanitized.push({
      id,
      characterId,
      x: clampNumber(x, 0, 100),
      y: clampNumber(y, 0, 100),
      radius: clampNumber(radius, MIN_HOTSPOT_RADIUS, MAX_HOTSPOT_RADIUS),
    });

    if (sanitized.length >= MAX_HOTSPOTS_PER_BLOCK) break;
  }

  return sanitized;
}

function sanitizeReaderBlocks(rawBlocks: unknown, validCharacterIds: Set<string>): ComicBlock[] {
  if (!Array.isArray(rawBlocks)) return [];

  return rawBlocks
    .filter((block): block is ComicBlock => !!block && typeof block === 'object')
    .map((block) => ({
      ...block,
      characterHotspots: sanitizeReaderHotspots(block.characterHotspots, validCharacterIds),
    }));
}

// ─── Comic Reader Modal ────────────────────────────────────────────────────────
function ComicReaderModal({ comic, onClose }: { comic: ComicData; onClose: () => void }) {
  const { t, language } = useLanguage();
  const { theme, isMobileOptimized } = useTheme();
  const [blocks, setBlocks] = useState<ComicBlock[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [showCharacters, setShowCharacters] = useState(false);
  const [activeHotspotKey, setActiveHotspotKey] = useState<string | null>(null);
  const [activeHotspotCharacterId, setActiveHotspotCharacterId] = useState<string | null>(null);
  const [showChapters, setShowChapters] = useState(false);
  const [showDescription, setShowDescription] = useState(false);
  const [loading, setLoading] = useState(true);
  const { stats, addXP, completeChapter } = useGamification();
  const [showXPToast, setShowXPToast] = useState<{ amount: number, label: string } | null>(null);
  const [chapters, setChapters] = useState<{ id: string, title: string, index: number, previewUrl?: string | null }[]>([]);
  const [currentChapterId, setCurrentChapterId] = useState<string | null>(null);
  const [currentBlockId, setCurrentBlockId] = useState<string | null>(null);
  const [checkedBlockId, setCheckedBlockId] = useState<string | null>(null);
  const [savingCheckedBlockId, setSavingCheckedBlockId] = useState<string | null>(null);
  const [checkpointPulseId, setCheckpointPulseId] = useState<string | null>(null);
  const [isEntering, setIsEntering] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const readingTimeRef = useRef(0);
  const blocksRef = useRef<ComicBlock[]>([]);

  useEffect(() => {
    blocksRef.current = blocks;
  }, [blocks]);

  const { user } = useAuth();
  const [readingTime, setReadingTime] = useState(0);
  const [isReadingTimeLoaded, setIsReadingTimeLoaded] = useState(false);
  const checkpointStorageKey = useMemo(() => `chapterless-checkpoint:${comic.id}`, [comic.id]);
  const hasChapters = chapters.length > 0;
  const isChapterlessBook = blocks.length > 0 && !hasChapters;
  const charactersById = useMemo(
    () => new Map(characters.map((character) => [character.id, character])),
    [characters]
  );
  const activeHotspotCharacter = useMemo(
    () => (activeHotspotCharacterId ? charactersById.get(activeHotspotCharacterId) || null : null),
    [activeHotspotCharacterId, charactersById]
  );

  const normalizeBlockId = useCallback((candidate: unknown) => {
    if (typeof candidate !== 'string' && typeof candidate !== 'number') return null;
    const normalized = String(candidate).trim();
    if (!normalized || normalized.length > 120) return null;
    return normalized;
  }, []);

  const resolveExistingBlockId = useCallback((candidate: unknown) => {
    const normalized = normalizeBlockId(candidate);
    if (!normalized) return null;
    const matchIndex = blocks.findIndex((block, index) => String(block.id || index) === normalized);
    if (matchIndex === -1) return null;
    return String(blocks[matchIndex].id || matchIndex);
  }, [blocks, normalizeBlockId]);

  const scrollToBlock = useCallback((blockId: string, behavior: ScrollBehavior = isMobileOptimized ? 'auto' : 'smooth') => {
    const safeBlockId = normalizeBlockId(blockId);
    if (!safeBlockId) return;
    const el = document.getElementById(`block-${safeBlockId}`);
    if (el && scrollContainerRef.current) {
      el.scrollIntoView({ behavior, block: 'start' });
    }
  }, [isMobileOptimized, normalizeBlockId]);

  const closeHotspotCard = useCallback(() => {
    setActiveHotspotKey(null);
    setActiveHotspotCharacterId(null);
  }, []);

  const toggleHotspot = useCallback((blockId: string, hotspot: CharacterHotspot) => {
    const hotspotKey = `${blockId}:${hotspot.id}`;
    if (activeHotspotKey === hotspotKey) {
      closeHotspotCard();
      return;
    }
    setActiveHotspotKey(hotspotKey);
    setActiveHotspotCharacterId(hotspot.characterId);
  }, [activeHotspotKey, closeHotspotCard]);

  useEffect(() => {
    if (!activeHotspotCharacterId) return;
    if (!charactersById.has(activeHotspotCharacterId)) {
      closeHotspotCard();
    }
  }, [activeHotspotCharacterId, charactersById, closeHotspotCard]);

  useEffect(() => {
    if (!user) return;
    let isMounted = true;

    const loadReadingTime = async () => {
      try {
        const { doc, getDoc } = await import('firebase/firestore');
        const docRef = doc(db, 'userReadingStats', `${user.uid}_${comic.id}`);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && isMounted) {
          const time = docSnap.data().timeSpent || 0;
          setReadingTime(time);
          readingTimeRef.current = time;
        } else if (isMounted) {
          setReadingTime(0);
          readingTimeRef.current = 0;
        }
        if (isMounted) setIsReadingTimeLoaded(true);
      } catch (error) {
        console.error('Failed to load reading time', error);
        if (isMounted) setIsReadingTimeLoaded(true);
      }
    };

    loadReadingTime();
    return () => { isMounted = false; };
  }, [user, comic.id]);

  useEffect(() => {
    if (!user || !isReadingTimeLoaded) return;

    const localTimer = setInterval(() => {
      setReadingTime(prev => {
        const next = prev + 1;
        readingTimeRef.current = next;
        return next;
      });
    }, 1000);

    const syncTimer = setInterval(async () => {
      try {
        const { doc, setDoc } = await import('firebase/firestore');
        const docRef = doc(db, 'userReadingStats', `${user.uid}_${comic.id}`);
        await setDoc(docRef, { timeSpent: readingTimeRef.current }, { merge: true });
      } catch (error) {
        console.error('Failed to sync reading time', error);
      }
    }, 10000);

    return () => {
      clearInterval(localTimer);
      clearInterval(syncTimer);
      // Final sync on unmount
      const finalSync = async () => {
        try {
          const { doc, setDoc } = await import('firebase/firestore');
          const docRef = doc(db, 'userReadingStats', `${user.uid}_${comic.id}`);
          await setDoc(docRef, { timeSpent: readingTimeRef.current }, { merge: true });
        } catch (error) {
          // fail silently
        }
      };
      finalSync();
    };
  }, [user, comic.id, isReadingTimeLoaded]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const { doc, getDoc, updateDoc, increment } = await import('firebase/firestore');
        const docRef = doc(db, 'comics', comic.id);
        const snap = await getDoc(docRef);

        if (snap.exists()) {
          const data = snap.data();
          const safeCharacters = Array.isArray(data.characters)
            ? data.characters.filter((character): character is Character => (
              !!character &&
              typeof character === 'object' &&
              typeof (character as Character).id === 'string'
            ))
            : [];
          const validCharacterIds = new Set(safeCharacters.map((character) => character.id));
          const safeBlocks = sanitizeReaderBlocks(data.blocks, validCharacterIds);

          try {
            await updateDoc(docRef, {
              views: increment(1)
            });
          } catch (err) {
            console.error('Failed to increment views:', err);
          }

          setBlocks(safeBlocks);
          setCharacters(safeCharacters);

          if (safeBlocks.length > 0) {
            // Extract chapters with their first available image as preview
            const extractedChapters = safeBlocks.reduce((acc: any[], b: any, index: number) => {
              if (b.chapterTitle) {
                // Find first block with an image starting from this chapter's first block
                let previewUrl = null;
                for (let j = index; j < safeBlocks.length; j++) {
                  // If we hit the next chapter without finding an image, stop (optional, but safer)
                  if (j > index && safeBlocks[j].chapterTitle) break;
                  if (safeBlocks[j].croppedImageUrl || safeBlocks[j].imageUrl) {
                    previewUrl = safeBlocks[j].croppedImageUrl || safeBlocks[j].imageUrl;
                    break;
                  }
                }
                acc.push({
                  id: b.id || `block_${index}`,
                  title: b.chapterTitle,
                  index,
                  previewUrl
                });
              }
              return acc;
            }, []);
            setChapters(extractedChapters);
          } else {
            setChapters([]);
          }
        }
      } catch (err) {
        console.error('Error loading comic:', err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [comic.id]);

  useEffect(() => {
    if (!scrollContainerRef.current || blocks.length === 0) return;

    const observer = new IntersectionObserver((entries) => {
      const visible = entries.find(e => e.isIntersecting);
      if (visible) {
        const blockId = visible.target.getAttribute('data-block-id');
        if (blockId) {
          setCurrentBlockId(blockId);

          // Also find current chapter
          const blockIndex = blocksRef.current.findIndex(b => (b.id || `block_${blocksRef.current.indexOf(b)}`) === blockId);
          if (blockIndex !== -1) {
            const activeChapter = [...blocksRef.current]
              .slice(0, blockIndex + 1)
              .reverse()
              .find(b => b.chapterTitle);
            if (activeChapter) {
              const chapId = activeChapter.id || `block_${blocksRef.current.indexOf(activeChapter)}`;
              setCurrentChapterId(chapId);
            }
          }
        }
      }
    }, {
      root: scrollContainerRef.current,
      rootMargin: '-10% 0px -70% 0px',
      threshold: [0, 0.1]
    });

    const chapterFinishedObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const chapId = entry.target.getAttribute('data-chapter-end-id');
          if (chapId && user) {
            completeChapter(comic.id, chapId).then(res => {
              if (res && !res.alreadyCompleted) {
                setShowXPToast({ amount: XP_PER_CHAPTER, label: t.chapterCompleted || 'Chapter Completed!' });
                setTimeout(() => setShowXPToast(null), 3000);
              }
            });
          }
        }
      });
    }, {
      root: scrollContainerRef.current,
      threshold: 0.1
    });

    const blockElements = scrollContainerRef.current.querySelectorAll('[data-block-id]');
    blockElements.forEach(el => observer.observe(el));

    const chapterEndElements = scrollContainerRef.current.querySelectorAll('[data-chapter-end-id]');
    chapterEndElements.forEach(el => chapterFinishedObserver.observe(el));

    return () => {
      observer.disconnect();
      chapterFinishedObserver.disconnect();
    };
  }, [blocks]);

  // Firebase integration for last read block/chapter
  useEffect(() => {
    if (blocks.length === 0) return;

    const loadSavedProgress = async () => {
      if (isChapterlessBook && !user) {
        const localCheckpoint = resolveExistingBlockId(
          typeof window !== 'undefined' ? window.localStorage.getItem(checkpointStorageKey) : null
        );
        setCheckedBlockId(localCheckpoint);

        if (localCheckpoint) {
          setCurrentBlockId(localCheckpoint);
          setTimeout(() => scrollToBlock(localCheckpoint), 800);
        } else {
          setCurrentBlockId(String(blocks[0].id || 0));
        }
        return;
      }

      if (!user) return;

      try {
        const { doc, getDoc } = await import('firebase/firestore');
        const docRef = doc(db, 'userReadingStats', `${user.uid}_${comic.id}`);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          if (isChapterlessBook) {
            const savedCheckpointId = resolveExistingBlockId(data.manualCheckpointBlockId);
            setCheckedBlockId(savedCheckpointId);

            if (savedCheckpointId) {
              setCurrentBlockId(savedCheckpointId);
              setTimeout(() => scrollToBlock(savedCheckpointId), 800);
            } else if (blocks.length > 0) {
              setCurrentBlockId(String(blocks[0].id || 0));
            }
            return;
          }

          setCheckedBlockId(null);
          const savedBlockId = resolveExistingBlockId(data.lastBlockId || data.lastChapterId);

          if (savedBlockId) {
            setCurrentBlockId(savedBlockId);

            // Set current chapter
            const blockIndex = blocks.findIndex((block, index) => String(block.id || index) === savedBlockId);
            if (blockIndex !== -1) {
              const activeChapter = [...blocks]
                .slice(0, blockIndex + 1)
                .reverse()
                .find(b => b.chapterTitle);
              if (activeChapter) {
                setCurrentChapterId(activeChapter.id || `block_${blocks.indexOf(activeChapter)}`);
              }
            }

            // Auto-scroll to saved position
            setTimeout(() => scrollToBlock(savedBlockId), 800);
          }
        } else if (hasChapters) {
          setCurrentChapterId(chapters[0]?.id || null);
          setCurrentBlockId(String(blocks[0].id || 0));
        } else {
          setCheckedBlockId(null);
          setCurrentBlockId(String(blocks[0].id || 0));
        }
      } catch (error) {
        console.error('Error loading reading stats', error);
      }
    };

    loadSavedProgress();
  }, [user, comic.id, blocks, chapters, hasChapters, isChapterlessBook, resolveExistingBlockId, scrollToBlock, checkpointStorageKey]);

  // Sync current progress to Firebase
  useEffect(() => {
    if (!user || !currentBlockId || isChapterlessBook) return;

    const syncProgress = async () => {
      try {
        const { doc, setDoc } = await import('firebase/firestore');
        const docRef = doc(db, 'userReadingStats', `${user.uid}_${comic.id}`);
        await setDoc(docRef, {
          lastBlockId: currentBlockId,
          lastChapterId: currentChapterId // Keep for compatibility
        }, { merge: true });
      } catch (error) {
        console.error('Error saving reading stats', error);
      }
    };

    const timeoutId = setTimeout(syncProgress, 1500);
    return () => clearTimeout(timeoutId);
  }, [user, comic.id, currentBlockId, currentChapterId, isChapterlessBook]);

  const scrollToChapter = (blockId: string) => {
    setCurrentChapterId(blockId);
    setCurrentBlockId(blockId);
    setIsEntering(false);

    // Immediate sync
    if (user) {
      import('firebase/firestore').then(({ doc, setDoc }) => {
        const docRef = doc(db, 'userReadingStats', `${user.uid}_${comic.id}`);
        setDoc(docRef, {
          lastBlockId: blockId,
          lastChapterId: blockId
        }, { merge: true }).catch(err => console.error('Immediate sync error:', err));
      });
    }

    setTimeout(() => scrollToBlock(blockId), 100);
    setShowChapters(false);
  };

  const saveCheckedPage = async (blockId: string) => {
    if (!isChapterlessBook) return;
    const safeBlockId = resolveExistingBlockId(blockId);
    if (!safeBlockId) return;

    setCheckedBlockId(safeBlockId);
    setSavingCheckedBlockId(safeBlockId);
    setCheckpointPulseId(safeBlockId);

    try {
      if (user) {
        const { doc, setDoc } = await import('firebase/firestore');
        const docRef = doc(db, 'userReadingStats', `${user.uid}_${comic.id}`);
        await setDoc(docRef, {
          manualCheckpointBlockId: safeBlockId,
          manualCheckpointUpdatedAt: Date.now()
        }, { merge: true });
      } else if (typeof window !== 'undefined') {
        window.localStorage.setItem(checkpointStorageKey, safeBlockId);
      }
    } catch (error) {
      console.error('Error saving manual checkpoint', error);
    } finally {
      setSavingCheckedBlockId(null);
      setTimeout(() => {
        setCheckpointPulseId(prev => (prev === safeBlockId ? null : prev));
      }, 900);
    }
  };

  const isDark = theme === 'dark';

  const formatTime = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;

    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${secs}s`;
  };

  const currentChapterIndex = chapters.findIndex(c => c.id === currentChapterId);

  const currentChapterBlocks = useMemo(() => {
    if (chapters.length === 0) return blocks;
    const index = currentChapterIndex === -1 ? 0 : currentChapterIndex;
    const startIdx = chapters[index]?.index || 0;
    const nextChapter = chapters[index + 1];
    const endIdx = nextChapter ? nextChapter.index : blocks.length;
    return blocks.slice(startIdx, endIdx);
  }, [currentChapterIndex, chapters, blocks]);

  const goToChapter = (index: number) => {
    if (index >= 0 && index < chapters.length) {
      const chap = chapters[index];
      scrollToChapter(chap.id);
    }
  };
  const showChapterPicker = isEntering && chapters.length > 1;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-4 md:p-8 overflow-hidden transition-colors duration-300"
      style={{
        backdropFilter: isMobileOptimized ? 'none' : 'blur(16px)',
        backgroundColor: isDark ? (isMobileOptimized ? 'rgba(0,0,0,0.95)' : 'rgba(0,0,0,0.85)') : (isMobileOptimized ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.7)')
      }}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }}
    >
      <div className="w-full max-w-5xl h-[calc(100vh-64px)] flex flex-col lg:flex-row gap-4 lg:gap-6 justify-center" onClick={e => e.stopPropagation()}>
        {/* Main Reader Wrapper */}
        <div
          className={`relative w-full lg:max-w-2xl h-full flex flex-col rounded-2xl overflow-hidden border shadow-2xl transition-colors duration-300 shrink-0 ${isDark
            ? 'bg-[#0d0d0d] border-neutral-800'
            : 'bg-white border-neutral-200'
            }`}
        >
          {/* Header */}
          <div className={`flex items-center justify-between px-6 py-4 border-b mobile-surface-blur-soft shrink-0 transition-colors ${isDark
            ? 'border-neutral-800 bg-[#0d0d0d]/95'
            : 'border-neutral-100 bg-white/95'
            }`}>
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className={`w-1 h-8 rounded-full shrink-0 ${isDark ? 'bg-blue-500' : 'bg-blue-600'}`} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className={`text-base font-black leading-tight tracking-wide truncate ${isDark ? 'text-white' : 'text-neutral-900'}`}>{comic.title}</h2>

                  {chapters.length > 0 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowChapters(true);
                      }}
                      className={`lg:hidden shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-colors duration-200 active:scale-95 shadow-sm group/chap ${isDark
                        ? 'bg-blue-500/10 border-blue-500/20 text-blue-400 hover:bg-blue-500/20 hover:border-blue-500/40'
                        : 'bg-blue-600/5 border-blue-600/10 text-blue-600 hover:bg-blue-600/10 hover:border-blue-600/30'
                        }`}
                    >
                      <BookOpen className="w-3.5 h-3.5 group-hover/chap:scale-110 transition-transform duration-200" />
                      <span className="text-[10px] font-black uppercase tracking-widest">{t.chapters}</span>
                    </button>
                  )}

                  {characters.length > 0 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowCharacters(true);
                      }}
                      className={`lg:hidden shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-colors duration-200 active:scale-95 shadow-sm group/char ${isDark
                        ? 'bg-blue-500/10 border-blue-500/20 text-blue-400 hover:bg-blue-500/20 hover:border-blue-500/40'
                        : 'bg-blue-600/5 border-blue-600/10 text-blue-600 hover:bg-blue-600/10 hover:border-blue-600/30'
                        }`}
                    >
                      <Users className="w-3.5 h-3.5 group-hover/char:scale-110 transition-transform duration-200" />
                      <span className="text-[10px] font-black uppercase tracking-widest">{t.characters}</span>
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowDescription(true);
                    }}
                    className={`lg:hidden shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-colors duration-200 active:scale-95 shadow-sm group/desc ${isDark
                      ? 'bg-blue-500/10 border-blue-500/20 text-blue-400 hover:bg-blue-500/20 hover:border-blue-500/40'
                      : 'bg-blue-600/5 border-blue-600/10 text-blue-600 hover:bg-blue-600/10 hover:border-blue-600/30'
                      }`}
                  >
                    <Info className="w-3.5 h-3.5 group-hover/desc:scale-110 transition-transform duration-200" />
                    <span className="text-[10px] font-black uppercase tracking-widest">{t.description || 'Description'}</span>
                  </button>
                </div>
                {comic.author && <p className={`text-xs mt-0.5 truncate ${isDark ? 'text-neutral-500' : 'text-neutral-400'}`}>{comic.author}</p>}
              </div>
            </div>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onClose();
              }}
              className={`absolute top-4 right-4 p-2 rounded-full transition-colors duration-200 active:scale-90 z-20 ${isDark ? 'hover:bg-neutral-800 text-neutral-400 hover:text-white' : 'hover:bg-neutral-100 text-neutral-500 hover:text-neutral-900'
                }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable content */}
          <div ref={scrollContainerRef} className={`overflow-y-auto overflow-x-hidden flex-1 ${isMobileOptimized ? '' : 'scroll-smooth'} ${isDark ? 'bg-black/20' : 'bg-neutral-50'}`}>
            {loading ? (
              <div className="flex flex-col items-center justify-center py-24 gap-4 text-neutral-500">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                <p className="text-sm">{t.loadingComic}</p>
              </div>
            ) : showChapterPicker ? (
              <div className="w-full max-w-4xl mx-auto p-6 md:p-8 flex flex-col gap-6">
                <div className="text-center space-y-2">
                  <h2 className={`text-2xl font-black uppercase tracking-tight ${isDark ? 'text-white' : 'text-neutral-900'}`}>{t.selectChapter}</h2>
                  <div className={`h-1 w-12 bg-blue-500 mx-auto rounded-full`} />
                </div>

                <div className="grid gap-3 w-full">
                  {chapters.map((chap, idx) => (
                    <button
                      key={chap.id}
                      onClick={() => scrollToChapter(chap.id)}
                      className={`group w-full min-w-0 text-left px-4 py-4 sm:px-5 rounded-2xl border-2 transition-colors duration-200 flex items-center gap-4 sm:gap-5 ${currentChapterId === chap.id
                        ? isDark ? 'bg-blue-500/10 border-blue-500/30' : 'bg-blue-50 border-blue-200'
                        : isDark ? 'bg-neutral-900/50 border-neutral-800' : 'bg-white border-neutral-100'
                        } active:scale-[0.99]`}
                    >
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg font-black shrink-0 transition-colors duration-200 ${currentChapterId === chap.id
                        ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20'
                        : isDark ? 'bg-neutral-800 text-neutral-400 group-hover:bg-neutral-700 group-hover:text-white' : 'bg-neutral-100 text-neutral-500 group-hover:bg-neutral-200'
                        }`}>
                        {idx + 1}
                      </div>

                      <div className="flex-1 min-w-0 pr-1">
                        <h3 className={`font-chapter font-bold text-lg leading-tight truncate ${currentChapterId === chap.id
                          ? isDark ? 'text-blue-400' : 'text-blue-700'
                          : isDark ? 'text-white' : 'text-neutral-900'
                          }`}>
                          {chap.title}
                        </h3>
                        {currentChapterId === chap.id && (
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                            <p className="text-[10px] font-black uppercase tracking-widest text-blue-500">{t.youStoppedHere}</p>
                          </div>
                        )}
                      </div>

                      <div className={`w-20 sm:w-24 aspect-video rounded-lg flex items-center justify-center overflow-hidden shrink-0 border transition-colors duration-200 ${currentChapterId === chap.id
                        ? 'ring-2 ring-blue-500 shadow-lg shadow-blue-500/20 border-blue-500/50'
                        : isDark ? 'bg-neutral-800 border-neutral-700' : 'bg-neutral-100 border-neutral-200'
                        }`}>
                        {chap.previewUrl ? (
                          <img src={chap.previewUrl} alt="" className="w-full h-full object-cover object-center group-hover:scale-[1.02] transition-transform duration-300" />
                        ) : (
                          <div className={`w-full h-full flex items-center justify-center text-xs font-black uppercase tracking-wide ${currentChapterId === chap.id ? 'bg-blue-500 text-white' : isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                            {t.chapter || 'Chapter'} {idx + 1}
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>

                {/* Quick Resume Button if applicable */}
                <button
                  onClick={() => {
                    setIsEntering(false);
                    setTimeout(() => {
                      if (currentBlockId) {
                        scrollToBlock(currentBlockId);
                      }
                    }, 100);
                  }}
                  className={`group w-full py-5 rounded-3xl font-black uppercase tracking-widest text-sm transition-colors duration-300 bg-blue-600 hover:bg-blue-500 text-white shadow-2xl shadow-blue-600/30 flex items-center justify-center gap-4 active:scale-95`}
                >
                  <BookOpen className="w-6 h-6 group-hover:rotate-12 transition-transform" />
                  {t.resumeReading}
                </button>
              </div>
            ) : blocks.length === 0 ? (
              <div className="flex items-center justify-center py-24 text-neutral-500">{t.noContent}</div>
            ) : (
              <div className="flex flex-col gap-6 p-6">
                {currentChapterBlocks.map((block, i) => {
                  const blockId = String(block.id || i);
                  const isCheckedPage = checkedBlockId === blockId;
                  const isSavingThisPage = savingCheckedBlockId === blockId;
                  const shouldPulse = checkpointPulseId === blockId;
                  const isActiveBlock = currentBlockId === blockId;

                  return (
                    <div
                      key={blockId}
                      id={`block-${blockId}`}
                      data-block-id={blockId}
                      data-chapter-id={block.chapterTitle ? (block.id || `block_${i}`) : undefined}
                      className={`comic-block comic-card-item group/panel relative rounded-2xl shadow-xl transition-colors duration-200 ${isChapterlessBook ? 'overflow-visible' : 'overflow-hidden'} ${isDark
                        ? 'bg-neutral-900/50 border border-neutral-800/50'
                        : 'bg-white border border-neutral-200'
                        }`}
                    >
                      {/* Stopped Here Indicator */}
                      {hasChapters && currentBlockId === blockId && !block.chapterTitle && (
                        <div className="absolute top-4 left-4 z-30 flex items-center gap-2 bg-blue-600 text-white px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg animate-in fade-in slide-in-from-left-4">
                          <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                          {t.youStoppedHere}
                        </div>
                      )}

                      {isChapterlessBook && (
                        <div className={`absolute -left-3 top-4 z-30 transition-opacity duration-200 ${isCheckedPage
                          ? 'opacity-100 translate-x-0 pointer-events-auto'
                          : isActiveBlock
                            ? 'opacity-55 translate-x-0 pointer-events-auto'
                            : 'opacity-0 translate-x-1 pointer-events-none group-hover/panel:opacity-65 group-hover/panel:translate-x-0 group-hover/panel:pointer-events-auto'
                          }`}>
                          <button
                            onClick={() => saveCheckedPage(blockId)}
                            disabled={isSavingThisPage}
                            aria-label={isCheckedPage ? t.checked : t.checkThisPage}
                            className={`relative h-7 w-7 rounded-full border flex items-center justify-center transition-colors duration-200 active:scale-95 ${isCheckedPage
                              ? 'bg-blue-600 border-blue-600 text-white'
                              : isDark
                                ? 'bg-transparent border-blue-500/35 text-blue-300/70 hover:border-blue-400/60 hover:text-blue-200'
                                : 'bg-transparent border-blue-500/45 text-blue-700/70 hover:border-blue-600 hover:text-blue-800'
                              }`}
                          >
                            {shouldPulse && (
                              <span className="absolute inset-0 rounded-full bg-blue-400/20 ring-2 ring-blue-400/40" />
                            )}
                            <CheckCircle2 className={`relative z-10 w-3.5 h-3.5 transition-transform duration-200 ${isCheckedPage ? 'scale-110' : ''}`} />
                          </button>
                        </div>
                      )}

                      {block.chapterTitle && (
                        <div className="px-6 pt-5 pb-3 text-center border-b border-neutral-200/20 mx-6 flex flex-col items-center gap-2">
                          {hasChapters && currentBlockId === blockId && (
                            <div className="flex items-center gap-2 bg-blue-600 text-white px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg animate-in fade-in slide-in-from-top-4">
                              <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                              {t.youStoppedHere}
                            </div>
                          )}
                          <h3 className={`font-chapter font-black text-2xl uppercase tracking-widest ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                            {block.chapterTitle}
                          </h3>
                        </div>
                      )}
                      {block.text && (
                        <div className={`px-6 ${block.chapterTitle ? 'pt-4 pb-5' : 'py-5'}`}>
                          <p className={`font-geo-text text-base leading-relaxed whitespace-pre-wrap ${isDark ? 'text-neutral-200' : 'text-neutral-800'
                            }`}>{block.text}</p>
                        </div>
                      )}
                      {(block.croppedImageUrl || block.imageUrl) && (
                        <div className={`px-4 pb-4 ${block.text ? 'pt-0' : 'pt-4'}`}>
                          <div className="relative w-full rounded-xl overflow-hidden shadow-sm border border-black/5">
                            <img
                              src={block.croppedImageUrl || block.imageUrl}
                              alt={`Panel ${i + 1}`}
                              className="w-full h-auto block object-contain"
                              loading="lazy"
                              decoding="async"
                            />
                            {/* Watermark */}
                            <img
                              src="/CBA.jpg"
                              alt=""
                              className="absolute bottom-2 right-2 w-7 h-7 object-contain opacity-80 pointer-events-none select-none z-20"
                            />
                            {block.characterHotspots?.map((hotspot) => {
                              const linkedCharacter = charactersById.get(hotspot.characterId);
                              if (!linkedCharacter) return null;

                              const hotspotKey = `${blockId}:${hotspot.id}`;
                              const isActiveHotspot = activeHotspotKey === hotspotKey;

                              return (
                                <button
                                  key={hotspot.id}
                                  type="button"
                                  onClick={() => toggleHotspot(blockId, hotspot)}
                                  aria-label={linkedCharacter.name || 'Character hotspot'}
                                  className={`absolute rounded-full bg-transparent border border-transparent focus:outline-none transition-colors duration-200 ${isActiveHotspot
                                    ? (isDark
                                      ? 'ring-2 ring-blue-400/80 ring-offset-2 ring-offset-black/40'
                                      : 'ring-2 ring-blue-500/80 ring-offset-2 ring-offset-neutral-50')
                                    : 'hover:ring-1 hover:ring-blue-400/25 focus-visible:ring-2 focus-visible:ring-blue-400/70'}`}
                                  style={{
                                    left: `${hotspot.x}%`,
                                    top: `${hotspot.y}%`,
                                    width: `${hotspot.radius * 2}%`,
                                    minWidth: '28px',
                                    transform: 'translate(-50%, -50%)',
                                    aspectRatio: '1 / 1',
                                    zIndex: 18,
                                  }}
                                />
                              );
                            })}
                            {block.bubbles?.map((bubble) => (
                              <div
                                key={bubble.id}
                                className="absolute pointer-events-none"
                                style={{
                                  left: `${bubble.x}%`,
                                  top: `${bubble.y}%`,
                                  transform: 'translate(-50%, -50%)',
                                  zIndex: 10,
                                }}
                              >
                                <div className="relative" style={{ width: 90 * bubble.scale, height: 90 * bubble.scale }}>
                                  <img
                                    src={`/bubbles/${bubble.bubbleType}.png`}
                                    alt=""
                                    className="w-full h-full object-contain"
                                  />
                                  <span
                                    className="font-bubble absolute inset-0 flex items-center justify-center text-center text-black font-bold"
                                    style={{
                                      fontFamily: 'BPGNinoTall',
                                      fontSize: Math.max(7, 90 * bubble.scale * 0.13),
                                      padding: `${90 * bubble.scale * 0.2}px ${90 * bubble.scale * 0.15}px`,
                                      lineHeight: 1.2,
                                      wordBreak: 'break-word',
                                    }}
                                  >
                                    {bubble.text}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Chapter End Indicators for tracking */}
                {chapters.map((chap, idx) => (
                  <div key={`end-${chap.id}`} data-chapter-end-id={chap.id} className="h-4 w-full" />
                ))}

                {/* XP Toast Notification */}
                {showXPToast && (
                  <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-bottom-8 fade-in flex items-center gap-3 px-6 py-4 bg-blue-600 text-white rounded-2xl shadow-2xl">
                    <div className="bg-white/20 p-2 rounded-lg">
                      <Trophy className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs font-black uppercase tracking-widest opacity-80">{showXPToast.label}</p>
                      <p className="text-xl font-black">+{showXPToast.amount} XP</p>
                    </div>
                  </div>
                )}

                {/* Chapter Navigation Buttons */}
                {chapters.length > 1 && currentChapterIndex !== -1 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-8 pt-8 border-t border-neutral-200/20">
                    {currentChapterIndex > 0 ? (
                      <button
                        onClick={() => goToChapter(currentChapterIndex - 1)}
                        className={`flex-1 w-full sm:w-auto flex items-center justify-center gap-3 px-6 py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-colors duration-200 border-2 ${isDark
                          ? 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-600'
                          : 'bg-white border-neutral-100 text-neutral-500 hover:text-neutral-900 hover:border-neutral-300 shadow-sm'
                          }`}
                      >
                        <ArrowLeft className="w-4 h-4" />
                        {t.previousChapter}
                      </button>
                    ) : <div className="flex-1 hidden sm:block" />}

                    {currentChapterIndex < chapters.length - 1 ? (
                      <button
                        onClick={() => goToChapter(currentChapterIndex + 1)}
                        className="flex-[1.5] w-full sm:w-auto flex items-center justify-center gap-3 px-8 py-5 rounded-2xl font-black uppercase tracking-widest text-sm transition-colors duration-200 bg-blue-600 hover:bg-blue-500 text-white shadow-xl shadow-blue-500/20 active:scale-95 group"
                      >
                        {t.nextChapter}: {chapters[currentChapterIndex + 1].title}
                        <ArrowLeft className="w-5 h-5 rotate-180 group-hover:translate-x-1 transition-transform" />
                      </button>
                    ) : (
                      <div className="flex flex-col items-center py-12 gap-3">
                        <h2 className="font-end text-4xl font-black mb-4 text-blue-500">დასასრული</h2>
                        <BookOpen className={`w-8 h-8 ${isDark ? 'text-neutral-700' : 'text-neutral-300'}`} />
                        <p className="text-neutral-500 text-sm font-medium">{t.endOfComic}</p>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onClose();
                          }}
                          className={`text-sm font-bold transition-colors ${isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'
                            }`}
                        >
                          ← {t.backToLibrary}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {chapters.length <= 1 && (
                  <div className="flex flex-col items-center py-12 gap-3">
                    <h2 className="font-end text-4xl font-black mb-4 text-blue-500">დასასრული</h2>
                    <BookOpen className={`w-8 h-8 ${isDark ? 'text-neutral-700' : 'text-neutral-300'}`} />
                    <p className="text-neutral-500 text-sm font-medium">{t.endOfComic}</p>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onClose();
                      }}
                      className={`text-sm font-bold transition-colors ${isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'
                        }`}
                    >
                      ← {t.backToLibrary}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Interactive Sidebar (Desktop) */}
        {!showChapterPicker && (
          <div className="hidden lg:flex flex-col flex-1 gap-4 max-w-[280px] shrink-0 mt-2 p-2">
            <h3 className={`font-black uppercase tracking-widest text-sm mb-2 ${isDark ? 'text-neutral-500' : 'text-neutral-400'}`}>
              {t.bookOverview}
            </h3>

            {/* Description Button */}
            <button
              onClick={() => setShowDescription(true)}
              className={`group flex items-center gap-4 p-4 rounded-3xl border-2 transition-colors duration-200 hover:scale-[1.02] active:scale-95 shadow-md hover:shadow-xl ${isDark
                ? 'bg-[#0d0d0d]/80 border-neutral-800 hover:border-blue-500/50 hover:bg-neutral-900 shadow-black/50'
                : 'bg-white/80 border-neutral-200 hover:border-blue-400 hover:bg-blue-50 shadow-blue-900/5'
                }`}
            >
              <div className={`p-3 rounded-2xl transition-colors duration-200 ${isDark ? 'bg-blue-500/20 text-blue-400 group-hover:bg-blue-500 group-hover:text-white' : 'bg-blue-100 text-blue-600 group-hover:bg-blue-600 group-hover:text-white'}`}>
                <Info className="w-7 h-7" />
              </div>
              <span className={`font-black uppercase tracking-widest text-base transition-colors ${isDark ? 'text-neutral-300 group-hover:text-white' : 'text-neutral-700 group-hover:text-neutral-900'}`}>
                {t.description || 'Description'}
              </span>
            </button>

            {/* Chapters Button */}
            {hasChapters && (
              <button
                onClick={() => setShowChapters(true)}
                className={`group flex items-center gap-4 p-4 rounded-3xl border-2 transition-colors duration-200 hover:scale-[1.02] active:scale-95 shadow-md hover:shadow-xl ${isDark
                  ? 'bg-[#0d0d0d]/80 border-neutral-800 hover:border-indigo-500/50 hover:bg-neutral-900 shadow-black/50'
                  : 'bg-white/80 border-neutral-200 hover:border-indigo-400 hover:bg-indigo-50 shadow-indigo-900/5'
                  }`}
              >
                <div className={`p-3 rounded-2xl transition-colors duration-200 ${isDark ? 'bg-indigo-500/20 text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white' : 'bg-indigo-100 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white'}`}>
                  <BookOpen className="w-7 h-7" />
                </div>
                <span className={`font-black uppercase tracking-widest text-base transition-colors ${isDark ? 'text-neutral-300 group-hover:text-white' : 'text-neutral-700 group-hover:text-neutral-900'}`}>
                  {t.chapters || 'Chapters'}
                </span>
              </button>
            )}

            {/* Characters Button */}
            {characters.length > 0 && (
              <button
                onClick={() => setShowCharacters(true)}
                className={`group flex items-center gap-4 p-4 rounded-3xl border-2 transition-colors duration-200 hover:scale-[1.02] active:scale-95 shadow-md hover:shadow-xl ${isDark
                  ? 'bg-[#0d0d0d]/80 border-neutral-800 hover:border-emerald-500/50 hover:bg-neutral-900 shadow-black/50'
                  : 'bg-white/80 border-neutral-200 hover:border-emerald-400 hover:bg-emerald-50 shadow-emerald-900/5'
                  }`}
              >
                <div className={`p-3 rounded-2xl transition-colors duration-200 ${isDark ? 'bg-emerald-500/20 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white' : 'bg-emerald-100 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white'}`}>
                  <Users className="w-7 h-7" />
                </div>
                <span className={`font-black uppercase tracking-widest text-base transition-colors ${isDark ? 'text-neutral-300 group-hover:text-white' : 'text-neutral-700 group-hover:text-neutral-900'}`}>
                  {t.characters || 'Characters'}
                </span>
              </button>
            )}

            {/* Active Hotspot Character Card (Desktop) */}
            <div className={`overflow-hidden transition-[max-height,opacity] duration-200 ${activeHotspotCharacter ? 'max-h-[420px] opacity-100 translate-y-0 mt-1' : 'max-h-0 opacity-0 -translate-y-2 pointer-events-none'}`}>
              {activeHotspotCharacter && (
                <div className={`rounded-3xl border-2 p-4 shadow-xl transition-colors duration-200 ${isDark
                  ? 'bg-[#0d0d0d]/90 border-blue-500/30'
                  : 'bg-white/95 border-blue-200'
                  }`}>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <p className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-blue-300' : 'text-blue-600'}`}>
                      {t.characterDetails || 'Character Details'}
                    </p>
                    <button
                      onClick={closeHotspotCard}
                      className={`p-1.5 rounded-full transition-colors ${isDark ? 'text-neutral-400 hover:text-white hover:bg-neutral-800' : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100'}`}
                      aria-label="Close character card"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex gap-3">
                    <div className={`w-16 h-16 rounded-2xl overflow-hidden shrink-0 border ${isDark ? 'border-neutral-700 bg-neutral-900' : 'border-neutral-200 bg-neutral-100'}`}>
                      {activeHotspotCharacter.imageUrl ? (
                        <img src={activeHotspotCharacter.imageUrl} alt={activeHotspotCharacter.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-neutral-400">
                          <Users className="w-7 h-7 opacity-30" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-base font-black uppercase truncate">{activeHotspotCharacter.name}</h4>
                      <p className={`text-[10px] font-black uppercase tracking-widest mt-2 mb-1 ${isDark ? 'text-neutral-500' : 'text-neutral-400'}`}>
                        {t.characterAbout || 'About'}
                      </p>
                      <p className={`text-xs leading-relaxed ${isDark ? 'text-neutral-300' : 'text-neutral-700'}`}>
                        {activeHotspotCharacter.description || (language === 'ka' ? 'აღწერა არ არის მითითებული.' : 'No description provided.')}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      {/* Description Overlay (within Modal) */}
      {showDescription && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          onClick={e => e.stopPropagation()}
        >
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-md mobile-surface-blur transition-opacity duration-300 animate-in fade-in"
            onClick={() => setShowDescription(false)}
          />
          <div
            className={`relative w-full max-w-lg max-h-[70vh] overflow-hidden rounded-2xl shadow-2xl border flex flex-col transition-colors duration-200 animate-in zoom-in-95 fade-in slide-in-from-bottom-4 ${isDark
              ? 'bg-[#0a0a0a] border-neutral-800 text-white'
              : 'bg-white border-neutral-200 text-neutral-900'
              }`}
            onClick={e => e.stopPropagation()}
          >
            <div className="px-6 py-5 border-b flex items-center justify-between sticky top-0 bg-inherit/90 backdrop-blur-xl mobile-surface-blur-soft z-10 transition-colors">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${isDark ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-600/10 text-blue-600'}`}>
                  <Info className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-black tracking-tight uppercase leading-tight">{t.description || 'Description'}</h2>
                  <p className={`text-[10px] sm:text-xs font-medium uppercase tracking-widest ${isDark ? 'text-neutral-500' : 'text-neutral-400'}`}>{comic.title}</p>
                </div>
              </div>
              <button
                onClick={() => setShowDescription(false)}
                className={`p-2 rounded-full transition-colors duration-200 active:scale-90 ${isDark ? 'hover:bg-neutral-800 text-neutral-400 hover:text-white' : 'hover:bg-neutral-100 text-neutral-500 hover:text-neutral-900'}`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto w-full flex flex-col gap-6">
              <div>
                <h3 className="text-xl font-black mb-1">{comic.title}</h3>
                <p className={`text-sm font-bold uppercase tracking-widest ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>{comic.author}</p>
              </div>
              <div className={`p-5 rounded-xl border ${isDark ? 'bg-neutral-900/50 border-neutral-800' : 'bg-neutral-50 border-neutral-200'}`}>
                <p className={`font-geo-text text-sm leading-relaxed whitespace-pre-wrap ${isDark ? 'text-neutral-300' : 'text-neutral-700'}`}>
                  {comic.description || (language === 'ka' ? 'აღწერა არ არის მითითებული.' : 'No description provided.')}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Characters Overlay (within Modal) */}
      {showCharacters && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          onClick={e => e.stopPropagation()}
        >
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-md mobile-surface-blur transition-opacity duration-300 animate-in fade-in"
            onClick={() => setShowCharacters(false)}
          />
          <div
            className={`relative w-full max-w-lg max-h-[70vh] overflow-hidden rounded-2xl shadow-2xl border flex flex-col transition-colors duration-200 animate-in zoom-in-95 fade-in slide-in-from-bottom-4 ${isDark
              ? 'bg-[#0a0a0a] border-neutral-800 text-white'
              : 'bg-white border-neutral-200 text-neutral-900'
              }`}
            onClick={e => e.stopPropagation()}
          >
            <div className="px-6 py-5 border-b flex items-center justify-between sticky top-0 bg-inherit/90 backdrop-blur-xl mobile-surface-blur-soft z-10 transition-colors">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${isDark ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-600/10 text-blue-600'}`}>
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-black tracking-tight uppercase leading-tight">{t.characters}</h2>
                  <p className={`text-[10px] sm:text-xs font-medium uppercase tracking-widest ${isDark ? 'text-neutral-500' : 'text-neutral-400'}`}>{comic.title}</p>
                </div>
              </div>
              <button
                onClick={() => setShowCharacters(false)}
                className={`p-2 rounded-full transition-colors duration-200 active:scale-90 ${isDark ? 'hover:bg-neutral-800 text-neutral-400 hover:text-white' : 'hover:bg-neutral-100 text-neutral-500 hover:text-neutral-900'}`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-6">
              {characters.map((char, idx) => (
                <div
                  key={char.id}
                  className="flex gap-5 items-center group animate-in slide-in-from-left-4 fade-in"
                  style={{ animationDelay: `${idx * 100}ms` }}
                >
                  <div className={`relative w-16 h-16 sm:w-20 sm:h-20 shrink-0 rounded-full overflow-hidden border-2 transition-colors duration-300 group-hover:scale-105 group-hover:rotate-3 shadow-lg ${isDark
                    ? 'border-neutral-800 bg-neutral-900'
                    : 'border-white bg-neutral-100'
                    }`}>
                    {char.imageUrl ? (
                      <img src={char.imageUrl} alt={char.name} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-neutral-400">
                        <Users className="w-8 h-8 opacity-20" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-black text-base sm:text-lg mb-0.5 tracking-tight group-hover:text-blue-400 transition-colors uppercase truncate">{char.name}</h3>
                    <p className={`text-xs sm:text-sm leading-relaxed font-geo-text line-clamp-3 ${isDark ? 'text-neutral-400' : 'text-neutral-600'}`}>
                      {char.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Chapters Overlay (within Modal) */}
      {showChapters && hasChapters && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          onClick={e => e.stopPropagation()}
        >
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-md mobile-surface-blur transition-opacity duration-300 animate-in fade-in"
            onClick={() => setShowChapters(false)}
          />
          <div
            className={`relative w-full max-w-sm max-h-[70vh] overflow-hidden rounded-2xl shadow-2xl border flex flex-col transition-colors duration-200 animate-in zoom-in-95 fade-in slide-in-from-bottom-4 ${isDark
              ? 'bg-[#0a0a0a] border-neutral-800 text-white'
              : 'bg-white border-neutral-200 text-neutral-900'
              }`}
            onClick={e => e.stopPropagation()}
          >
            <div className="px-6 py-5 border-b flex items-center justify-between sticky top-0 bg-inherit/90 backdrop-blur-xl mobile-surface-blur-soft z-10 transition-colors">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${isDark ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-600/10 text-blue-600'}`}>
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-black tracking-tight uppercase leading-tight">{t.chapters}</h2>
                  <p className={`text-[10px] sm:text-xs font-medium uppercase tracking-widest ${isDark ? 'text-neutral-500' : 'text-neutral-400'}`}>{comic.title}</p>
                </div>
              </div>
              <button
                onClick={() => setShowChapters(false)}
                className={`p-2 rounded-full transition-all duration-300 active:scale-90 ${isDark ? 'hover:bg-neutral-800 text-neutral-400 hover:text-white' : 'hover:bg-neutral-100 text-neutral-500 hover:text-neutral-900'}`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto w-full flex flex-col gap-2">
              {chapters.map((chap, idx) => (
                <button
                  key={chap.id}
                  onClick={() => scrollToChapter(chap.id)}
                  className={`w-full text-left px-4 py-3 rounded-xl transition-colors duration-200 flex items-center gap-4 group ${currentChapterId === chap.id
                    ? isDark
                      ? 'bg-blue-500/20 border border-blue-500/30 shadow-md shadow-blue-500/10'
                      : 'bg-blue-50 border border-blue-200 shadow-sm'
                    : isDark
                      ? 'bg-transparent border border-transparent hover:bg-neutral-900 hover:border-neutral-800'
                      : 'bg-transparent border border-transparent hover:bg-neutral-50 hover:border-neutral-200'
                    }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold text-sm transition-colors ${currentChapterId === chap.id
                    ? isDark ? 'bg-blue-500 text-white' : 'bg-blue-600 text-white'
                    : isDark ? 'bg-neutral-800 text-neutral-400 group-hover:bg-neutral-700 group-hover:text-white' : 'bg-neutral-100 text-neutral-500 group-hover:bg-neutral-200 group-hover:text-neutral-900'
                    }`}>
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className={`font-chapter font-bold truncate text-sm transition-colors ${currentChapterId === chap.id
                      ? isDark ? 'text-blue-400' : 'text-blue-700'
                      : isDark ? 'text-white' : 'text-neutral-900'
                      }`}>
                      {chap.title}
                    </h3>
                  </div>
                  {chap.previewUrl && (
                    <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 border border-neutral-800/20">
                      <img src={chap.previewUrl} alt="" className="w-full h-full object-cover" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Active Hotspot Character Card (Mobile) */}
      <div className={`lg:hidden fixed inset-x-4 bottom-4 z-[70] transition-[transform,opacity] duration-200 ${activeHotspotCharacter ? 'translate-y-0 opacity-100 pointer-events-auto' : 'translate-y-10 opacity-0 pointer-events-none'}`}>
        {activeHotspotCharacter && (
          <div className={`rounded-2xl border shadow-2xl backdrop-blur-md mobile-surface-blur-soft overflow-hidden ${isDark ? 'bg-[#0a0a0a]/95 border-blue-500/30 text-white' : 'bg-white/95 border-blue-200 text-neutral-900'}`}>
            <div className="px-4 py-3 flex items-start justify-between gap-3 border-b border-neutral-200/20">
              <div>
                <p className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-blue-300' : 'text-blue-600'}`}>
                  {t.characterDetails || 'Character Details'}
                </p>
                <h4 className="text-sm font-black uppercase">{activeHotspotCharacter.name}</h4>
              </div>
              <button
                onClick={closeHotspotCard}
                className={`p-1.5 rounded-full transition-colors ${isDark ? 'text-neutral-400 hover:text-white hover:bg-neutral-800' : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100'}`}
                aria-label="Close character card"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 flex gap-3">
              <div className={`w-14 h-14 rounded-xl overflow-hidden shrink-0 border ${isDark ? 'border-neutral-700 bg-neutral-900' : 'border-neutral-200 bg-neutral-100'}`}>
                {activeHotspotCharacter.imageUrl ? (
                  <img src={activeHotspotCharacter.imageUrl} alt={activeHotspotCharacter.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-neutral-400">
                    <Users className="w-6 h-6 opacity-30" />
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${isDark ? 'text-neutral-500' : 'text-neutral-400'}`}>
                  {t.characterAbout || 'About'}
                </p>
                <p className={`text-xs leading-relaxed ${isDark ? 'text-neutral-300' : 'text-neutral-700'}`}>
                  {activeHotspotCharacter.description || (language === 'ka' ? 'აღწერა არ არის მითითებული.' : 'No description provided.')}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Floating Timer Widget on Modal Corner */}
      {user && (
        <div
          className={`absolute top-4 left-4 z-[70] transition-transform`}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <div className={`flex items-center gap-2 py-2 px-3 sm:py-2.5 sm:px-4 rounded-full shadow-lg backdrop-blur-xl mobile-surface-blur-soft ${isDark
            ? 'bg-blue-500/10 border border-blue-500/20 text-blue-400'
            : 'bg-white/90 border border-blue-200 text-blue-600'
            } group transition-colors duration-200`}>
            {/* The icon isn't imported so I will just use an SVG or import Clock at the top. Wait! I will use a simple circle timer icon SVG here to avoid another import chunk */}
            <svg
              className="w-4 h-4 sm:w-5 sm:h-5 animate-[spin_4s_linear_infinite] opacity-90"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span className="text-[10px] sm:text-xs font-black tracking-widest tabular-nums uppercase">
              {formatTime(readingTime)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Home Page ─────────────────────────────────────────────────────────────────
export default function Home() {
  const { language, setLanguage, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();
  const { user, signInWithGoogle, signOut, loading: authLoading } = useAuth();
  const [comics, setComics] = useState<ComicData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ComicData | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [materialFilter, setMaterialFilter] = useState<'all' | 'school' | 'non-school'>('all');
  const [gradeFilter, setGradeFilter] = useState<'all' | number>('all');
  const [requestForm, setRequestForm] = useState({
    requesterName: '',
    comicTitle: '',
    bookAuthor: '',
    hpField: '',
  });
  const [requestStatus, setRequestStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [requestFeedback, setRequestFeedback] = useState('');
  const [requestFormStartedAt] = useState(() => Date.now());

  const isDark = theme === 'dark';

  useEffect(() => {
    const saved = localStorage.getItem('comic-favorites');
    if (saved) {
      try {
        setFavorites(JSON.parse(saved));
      } catch (e) {
        console.error('Error parsing favorites:', e);
      }
    }
  }, []);

  const toggleFavorite = (e: React.MouseEvent, comicId: string) => {
    e.stopPropagation();
    const newFavorites = favorites.includes(comicId)
      ? favorites.filter(id => id !== comicId)
      : [...favorites, comicId];
    setFavorites(newFavorites);
    localStorage.setItem('comic-favorites', JSON.stringify(newFavorites));
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const data = await getAllComicsSecurely() as ComicData[];
        setComics(data);
      } catch (e) {
        console.error('Failed to fetch comics:', e);
        setComics([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const closeModal = useCallback(() => setSelected(null), []);

  const filteredComics = comics.filter(comic => {
    const matchesSearch = comic.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      comic.author.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesMaterial = materialFilter === 'all' ||
      (materialFilter === 'school' && comic.isSchoolMaterial) ||
      (materialFilter === 'non-school' && !comic.isSchoolMaterial);

    const matchesGrade = gradeFilter === 'all' || comic.grade === gradeFilter;

    return matchesSearch && matchesMaterial && matchesGrade;
  });

  const handleRequestFieldChange = (field: 'requesterName' | 'comicTitle' | 'bookAuthor' | 'hpField', value: string) => {
    setRequestForm(prev => ({ ...prev, [field]: value }));
    if (requestStatus !== 'idle') {
      setRequestStatus('idle');
      setRequestFeedback('');
    }
  };

  const submitPublishRequest = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const requesterName = requestForm.requesterName.trim();
    const comicTitle = requestForm.comicTitle.trim();
    const bookAuthor = requestForm.bookAuthor.trim();

    if (requesterName.length < 2 || comicTitle.length < 2 || bookAuthor.length < 2) {
      setRequestStatus('error');
      setRequestFeedback(t.requestValidationError);
      return;
    }

    // Bot protection: Honey pot field and too fast submission
    if (requestForm.hpField.length > 0) {
      // Quietly succeed for bots
      setRequestStatus('success');
      setRequestFeedback(t.requestSuccess);
      setRequestForm({ requesterName: '', comicTitle: '', bookAuthor: '', hpField: '' });
      return;
    }

    if (Date.now() - requestFormStartedAt < 1200) {
      setRequestStatus('error');
      setRequestFeedback(t.requestValidationError);
      return;
    }

    setRequestStatus('submitting');
    setRequestFeedback('');

    try {
      await addDoc(collection(db, 'comicRequests'), {
        requesterName,
        comicTitle,
        bookAuthor,
        submittedAt: new Date(),
        status: 'pending' // For admin review
      });

      setRequestStatus('success');
      setRequestFeedback(t.requestSuccess);
      setRequestForm({
        requesterName: '',
        comicTitle: '',
        bookAuthor: '',
        hpField: '',
      });
    } catch (error) {
      console.error('Failed to submit request to Firebase:', error);
      setRequestStatus('error');
      setRequestFeedback(t.requestError);
    }
  };

  return (
    <div className={`min-h-screen transition-colors duration-200 font-sans ${isDark ? 'bg-[#080c14] text-white' : 'bg-neutral-50 text-neutral-900'}`}>

      {/* ── Header ─────────────────────────────────────────── */}
      <header className={`absolute top-0 left-0 right-0 z-50 transition-colors duration-300`}>
        {/* Right Blur Gradient behind buttons */}
        <div className="absolute inset-y-0 right-0 w-96 pointer-events-none overflow-hidden">
          <div className={`absolute inset-0 backdrop-blur-md mobile-surface-blur ${isDark ? 'bg-black/50' : 'bg-white/40'}`}
            style={{ maskImage: 'linear-gradient(to left, black 50%, transparent)' }} />
          {/* Fading Border Line */}
          <div className={`absolute bottom-0 left-0 right-0 h-px ${isDark ? 'bg-white/10' : 'bg-neutral-200/30'}`}
            style={{ maskImage: 'linear-gradient(to left, black 50%, transparent)' }} />
        </div>

        <div className="w-full px-4 h-14 flex items-center justify-between relative z-10">
          <Link href="/" className="relative flex items-center gap-2.5 group px-1.5 py-1">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -inset-x-2 -inset-y-2 rounded-2xl backdrop-blur-sm mobile-surface-blur-soft"
              style={{
                background: 'linear-gradient(to top, rgba(0,0,0,0) 8%, rgba(0,0,0,0.16) 52%, rgba(0,0,0,0.12) 100%)',
                maskImage: 'linear-gradient(to right, rgba(0,0,0,1) 84%, rgba(0,0,0,0.55) 95%, transparent 100%)',
                WebkitMaskImage: 'linear-gradient(to right, rgba(0,0,0,1) 84%, rgba(0,0,0,0.55) 95%, transparent 100%)',
              }}
            />
            <img
              src="/CBA.jpg"
              alt="Logo"
              className="relative z-10 w-8 h-8 object-contain rounded-md shadow-lg group-hover:scale-105 transition-transform duration-300"
            />
            <span className="text-base font-black tracking-tight relative z-10 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
              Comic<span className="text-blue-400">Books</span><span className="text-blue-600">Geo</span>
            </span>
          </Link>

          <div className="flex items-center gap-2">
            {/* Theme Toggle — pill slider */}
            <button
              onClick={toggleTheme}
              aria-label="Toggle Theme"
              className={`relative flex items-center w-[56px] h-[28px] rounded-full p-1 transition-colors duration-300 mobile-fast-transition shadow-xl mobile-surface-blur-soft border focus:outline-none gpu-layer ${isDark
                ? 'bg-[#0a0f1e] border-blue-900/50'
                : 'bg-amber-50/80 border-amber-200/60'
                }`}
            >
              {/* Sliding knob */}
              <span
                className={`absolute top-1/2 -translate-y-1/2 flex items-center justify-center w-[22px] h-[22px] rounded-full shadow-lg transition-[left] duration-300 mobile-fast-transition ease-[cubic-bezier(0.34,1.56,0.64,1)] gpu-layer ${isDark
                  ? 'left-1 bg-gradient-to-br from-slate-600 to-slate-800'
                  : 'left-[30px] bg-gradient-to-br from-amber-300 to-orange-400'
                  }`}
              >
                {/* Moon icon — visible in dark mode */}
                <Moon
                  className={`absolute w-3 h-3 text-blue-200 transition-all duration-300 ${isDark ? 'opacity-100 scale-100 rotate-0' : 'opacity-0 scale-50 rotate-90'
                    }`}
                />
                {/* Sun icon — visible in light mode */}
                <Sun
                  className={`absolute w-3 h-3 text-white transition-all duration-300 ${isDark ? 'opacity-0 scale-50 -rotate-90' : 'opacity-100 scale-100 rotate-0'
                    }`}
                />
              </span>
            </button>

            {/* Language Toggle — pill slider */}
            <button
              onClick={() => setLanguage(language === 'ka' ? 'en' : 'ka')}
              aria-label="Toggle Language"
              className={`relative flex items-center w-[64px] h-[28px] rounded-full p-1 transition-colors duration-300 mobile-fast-transition shadow-xl mobile-surface-blur-soft border focus:outline-none ${isDark
                ? 'bg-black/40 border-white/10'
                : 'bg-white/40 border-black/10'
                }`}
            >
              {/* Track labels */}
              <span className={`absolute top-1/2 -translate-y-1/2 left-2 text-[9px] font-black uppercase tracking-wider transition-all duration-300 ${language === 'ka' ? 'opacity-0' : isDark ? 'opacity-40 text-neutral-400' : 'opacity-50 text-neutral-500'}`}>GE</span>
              <span className={`absolute top-1/2 -translate-y-1/2 right-2 text-[9px] font-black uppercase tracking-wider transition-all duration-300 ${language === 'en' ? 'opacity-0' : isDark ? 'opacity-40 text-neutral-400' : 'opacity-50 text-neutral-500'}`}>EN</span>
              {/* Sliding knob */}
              <span
                className={`absolute top-1/2 -translate-y-1/2 flex items-center justify-center w-[28px] h-[22px] rounded-full shadow-lg transition-[left] duration-300 mobile-fast-transition ease-[cubic-bezier(0.34,1.56,0.64,1)] bg-blue-600 text-white text-[9px] font-black uppercase tracking-wider gpu-layer ${language === 'ka' ? 'left-1' : 'left-[32px]'
                  }`}
              >
                {language === 'ka' ? 'GE' : 'EN'}
              </span>
            </button>

            <Link
              href="/admin"
              className="text-xs font-bold text-white bg-blue-600/90 hover:bg-blue-500 py-1.5 rounded-md transition-all tracking-wide hidden sm:flex justify-center items-center w-[100px] shadow-lg hover:shadow-blue-500/20 backdrop-blur-sm"
            >
              {t.creatorStudio} →
            </Link>

            <div className={`h-6 w-px mx-1 ${isDark ? 'bg-blue-900/40' : 'bg-neutral-200'} hidden sm:block`}></div>

            {!authLoading && (
              user ? (
                <div className="relative">
                  <button
                    onClick={() => setShowProfileMenu(!showProfileMenu)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-colors duration-200 hover:scale-[1.02] active:scale-95 shadow-xl ${isDark
                      ? 'bg-black/40 border-white/10 hover:bg-black/60'
                      : 'bg-white/40 border-black/10 hover:border-neutral-300 shadow-sm'}`}
                  >
                    <div className="w-5 h-5 rounded-full border border-blue-500/20 overflow-hidden bg-neutral-800 flex items-center justify-center shrink-0">
                      {user.photoURL ? (
                        <img src={user.photoURL} alt="User" className="w-full h-full object-cover" />
                      ) : (
                        <Users className="w-3 h-3 text-blue-400" />
                      )}
                    </div>
                    <span className={`hidden sm:block text-xs font-bold truncate max-w-[100px] ${isDark ? 'text-blue-100' : 'text-neutral-700'}`}>{user.displayName}</span>
                  </button>

                  {showProfileMenu && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowProfileMenu(false)} />
                      <div className={`absolute right-0 mt-2 w-56 rounded-2xl border shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 ${isDark ? 'bg-[#0d0d0d] border-neutral-800' : 'bg-white border-neutral-100'}`}>
                        <div className="px-4 py-4 border-b border-neutral-800/10 bg-gradient-to-br from-blue-500/5 to-transparent">
                          <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${isDark ? 'text-neutral-500' : 'text-neutral-400'}`}>{t.profile}</p>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full border border-blue-500/20 overflow-hidden bg-neutral-800 flex items-center justify-center shrink-0">
                              {user.photoURL ? (
                                <img src={user.photoURL} alt="User" className="w-full h-full object-cover" />
                              ) : (
                                <Users className="w-6 h-6 text-blue-400" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className={`text-sm font-black truncate ${isDark ? 'text-white' : 'text-neutral-900'}`}>{user.displayName}</p>
                              <p className={`text-[10px] font-medium truncate ${isDark ? 'text-neutral-500' : 'text-neutral-400'}`}>{user.email}</p>
                            </div>
                          </div>
                        </div>
                        <div className="px-4 py-3 border-b border-neutral-800/10">
                          <p className={`text-[10px] font-black uppercase tracking-widest mb-2 ${isDark ? 'text-neutral-500' : 'text-neutral-400'}`}>{t.selectAvatar}</p>
                          <div className="flex gap-2">
                            <button
                              onClick={async () => {
                                const { updateProfile } = await import('firebase/auth');
                                if (user) await updateProfile(user, { photoURL: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jack&backgroundColor=b6e3f4' });
                                window.location.reload();
                              }}
                              className={`flex-1 flex flex-col items-center gap-1 p-2 rounded-xl border transition-all ${isDark ? 'border-neutral-800 hover:bg-neutral-800 text-neutral-400 hover:text-white' : 'border-neutral-100 hover:bg-neutral-50 text-neutral-500 hover:text-neutral-900'}`}
                            >
                              <div className="w-8 h-8 rounded-full overflow-hidden bg-blue-500/10 flex items-center justify-center">
                                <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Jack&backgroundColor=b6e3f4" alt="Male" className="w-full h-full" />
                              </div>
                              <span className="text-[9px] font-bold uppercase">{t.male}</span>
                            </button>
                            <button
                              onClick={async () => {
                                const { updateProfile } = await import('firebase/auth');
                                if (user) await updateProfile(user, { photoURL: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Molly&backgroundColor=ffdfbf' });
                                window.location.reload();
                              }}
                              className={`flex-1 flex flex-col items-center gap-1 p-2 rounded-xl border transition-all ${isDark ? 'border-neutral-800 hover:bg-neutral-800 text-neutral-400 hover:text-white' : 'border-neutral-100 hover:bg-neutral-50 text-neutral-500 hover:text-neutral-900'}`}
                            >
                              <div className="w-8 h-8 rounded-full overflow-hidden bg-pink-500/10 flex items-center justify-center">
                                <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Molly&backgroundColor=ffdfbf" alt="Female" className="w-full h-full" />
                              </div>
                              <span className="text-[9px] font-bold uppercase">{t.female}</span>
                            </button>
                          </div>
                        </div>
                        <div className="p-1.5">
                          <Link
                            href="/profile"
                            onClick={() => setShowProfileMenu(false)}
                            className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${isDark ? 'text-neutral-300 hover:bg-neutral-800' : 'text-neutral-600 hover:bg-neutral-50'}`}
                          >
                            <Trophy className="w-4 h-4 text-blue-500" />
                            {t.profile}
                          </Link>
                          <Link
                            href="/leaderboard"
                            onClick={() => setShowProfileMenu(false)}
                            className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${isDark ? 'text-neutral-300 hover:bg-neutral-800' : 'text-neutral-600 hover:bg-neutral-50'}`}
                          >
                            <BarChart3 className="w-4 h-4 text-blue-500" />
                            {t.leaderboard}
                          </Link>
                          <button
                            onClick={() => {
                              signOut();
                              setShowProfileMenu(false);
                            }}
                            className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${isDark ? 'text-red-400 hover:bg-red-500/10' : 'text-red-600 hover:bg-red-50'}`}
                          >
                            <LogOut className="w-4 h-4" />
                            {t.signOut}
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <button
                  onClick={signInWithGoogle}
                  className={`flex items-center justify-center gap-2 text-xs font-bold py-1.5 w-[112px] rounded-full transition-colors duration-200 border ${isDark
                    ? 'border-blue-500/30 text-blue-400 hover:bg-blue-500/10 hover:border-blue-500/50'
                    : 'bg-white border-blue-200 text-blue-600 hover:bg-blue-50 hover:border-blue-300 shadow-sm'
                    }`}
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                  {language === 'ka' ? 'შესვლა' : 'Sign In'}
                </button>
              )
            )}
          </div>
        </div>
      </header>

      {/* ── Hero Banner ─────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-blue-900/30 min-h-[400px] pt-14 flex items-center">
        {/* Banner Background */}
        <div className="absolute inset-0 z-0">
          <img
            src="/banner.jpg"
            alt="Banner background"
            className="w-full h-full object-cover object-[center_15%]"
          />
          {/* Dimming Overlay */}
          <div className="absolute inset-0 bg-black/35 transition-opacity duration-300" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-6 py-8 flex flex-col items-center text-center gap-6 w-full">
          <div className="max-w-3xl w-full">
            {/* Hero Title with soft text blur shadow */}
            <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-tight text-white drop-shadow-[0_6px_20px_rgba(0,0,0,1)] font-hero hover:opacity-[0.05] transition-opacity duration-500 ease-in-out cursor-default min-h-[90px] md:min-h-[150px] flex items-center justify-center">
              {t.heroTitle}
            </h1>

            {/* Search Bar Container with Blur & Shadow */}
            <div className={`mt-8 relative max-w-xl mx-auto group transition-all duration-300`}>
              <div className="absolute inset-0 bg-white/10 backdrop-blur-xl mobile-surface-blur rounded-3xl border border-white/20 shadow-2xl transition-colors duration-200 group-focus-within:bg-white/15" />
              <div className="relative">
                <div className={`absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none`}>
                  <Search className={`w-6 h-6 text-white/70 group-focus-within:text-blue-400 transition-colors drop-shadow-sm`} />
                </div>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={t.searchPlaceholder}
                  className={`w-full pl-16 pr-6 py-5 rounded-2xl border-none outline-none transition-all duration-300 font-bold bg-transparent text-white placeholder-white/40 text-lg drop-shadow-sm`}
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute inset-y-0 right-0 pr-6 flex items-center text-white/40 hover:text-white transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Library ─────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        {/* Background Decorations */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          <div className={`absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full blur-[120px] opacity-[0.07] decorative-blur-blob ${isDark ? 'bg-blue-500' : 'bg-blue-400/30'}`} />
          <div className={`absolute bottom-0 right-1/4 w-[800px] h-[800px] rounded-full blur-[150px] opacity-[0.05] decorative-blur-blob ${isDark ? 'bg-indigo-600' : 'bg-indigo-400/20'}`} />
          <div
            className={`absolute inset-0 opacity-[0.03] ${isDark ? 'text-blue-400' : 'text-blue-900'}`}
            style={{ backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)', backgroundSize: '32px 32px' }}
          />
        </div>

        {/* Top edge glow */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent z-10" />

        <div className="relative z-10 max-w-7xl mx-auto px-6 pt-2 pb-20">

          {/* Library Header: Title + Filters */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
            {/* Section label */}
            <div className="flex items-center gap-3">
              <div className="w-1 h-5 bg-blue-500 rounded-full" />
              <h2 className="text-sm font-black tracking-widest text-blue-400 uppercase">{t.publicLibrary}</h2>
              {!loading && comics.length > 0 && (
                <span className="text-xs bg-blue-500/15 border border-blue-500/25 text-blue-400 px-2 py-0.5 rounded-full font-bold">
                  {t.comicCount(comics.length)}
                </span>
              )}
            </div>

            {/* Filters */}
            <div className={`relative flex items-center p-1.5 rounded-full border shadow-sm ${isDark ? 'bg-[#0d0d0d] border-neutral-800' : 'bg-white border-neutral-200'}`}>
              {[
                { id: 'all', label: t.allMaterials },
                { id: 'school', label: t.schoolMaterial },
                { id: 'non-school', label: t.nonSchoolMaterial }
              ].map((f) => {
                const isActive = materialFilter === f.id;
                return (
                  <button
                    key={f.id}
                    onClick={() => {
                      setMaterialFilter(f.id as any);
                      if (f.id === 'non-school') setGradeFilter('all');
                    }}
                    className={`relative px-6 py-2.5 rounded-full text-xs font-black uppercase tracking-wider transition-colors duration-200 z-10 ${isActive
                      ? 'text-white'
                      : isDark ? 'text-neutral-500 hover:text-neutral-300' : 'text-neutral-500 hover:text-neutral-800'
                      }`}
                  >
                    {isActive && (
                      <div className="absolute inset-0 bg-blue-600 rounded-full -z-10 shadow-[0_0_15px_rgba(37,99,235,0.4)] animate-in zoom-in-95 duration-300" />
                    )}
                    {f.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Grade Filters (Conditional) */}
          <div
            className={`transition-all duration-500 overflow-hidden ${materialFilter === 'school' ? 'opacity-100 max-h-20 mb-6' : 'opacity-0 max-h-0 mb-0'}`}
          >
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <button
                onClick={() => setGradeFilter('all')}
                className={`relative px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-colors duration-200 z-10 ${gradeFilter === 'all'
                  ? 'text-white'
                  : isDark ? 'text-neutral-400 bg-neutral-900/50 hover:bg-neutral-800 border border-neutral-800' : 'text-neutral-600 bg-white hover:bg-neutral-50 border border-neutral-200'
                  }`}
              >
                {gradeFilter === 'all' && (
                  <div className={`absolute inset-0 rounded-full -z-10 animate-in zoom-in-95 duration-300 ${isDark
                    ? 'bg-neutral-800 shadow-[0_0_12px_rgba(255,255,255,0.1)]'
                    : 'bg-blue-600 shadow-[0_0_12px_rgba(37,99,235,0.35)]'
                    }`} />
                )}
                {t.allMaterials}
              </button>
              {[8, 9, 10, 11, 12].map((g) => (
                <button
                  key={g}
                  onClick={() => setGradeFilter(g)}
                  className={`relative px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-colors duration-200 z-10 ${gradeFilter === g
                    ? 'text-white'
                    : isDark ? 'text-neutral-400 bg-neutral-900/50 hover:bg-neutral-800 border border-neutral-800' : 'text-neutral-600 bg-white hover:bg-neutral-50 border border-neutral-200'
                    }`}
                >
                  {gradeFilter === g && (
                    <div className="absolute inset-0 bg-blue-600 rounded-full -z-10 shadow-[0_0_12px_rgba(37,99,235,0.4)] animate-in zoom-in-95 duration-300" />
                  )}
                  {t.gradeLabel(g)}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center py-20 gap-4 text-neutral-600">
              <div className="flex gap-1.5">
                {[0, 1, 2].map(i => (
                  <div key={i} className="w-2 h-2 rounded-full bg-blue-800 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
              <p className="text-sm">{t.loadingLibrary}</p>
            </div>
          ) : comics.length === 0 ? (
            <div className="text-center py-20 border-2 border-dashed border-blue-900/40 rounded-2xl">
              <div className="flex gap-2 justify-center mb-4 opacity-30">
                {[1, 2, 3].map(i => <div key={i} className="w-12 h-16 border-2 border-blue-800 rounded" />)}
              </div>
              <p className="text-neutral-600 text-sm">{t.noComics}</p>
            </div>
          ) : filteredComics.length === 0 ? (
            <div className="text-center py-20 border-2 border-dashed border-blue-900/40 rounded-2xl">
              <Search className="w-10 h-10 text-neutral-700 mx-auto mb-4 opacity-20" />
              <p className="text-neutral-600 text-sm">{searchTerm ? (language === 'ka' ? 'შედეგი ვერ მოიძებნა' : 'No results found') : t.noComics}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
              {filteredComics.map((comic) => {
                const firstPageUrl = (comic as any).firstPageUrl || comic.blocks?.[0]?.croppedImageUrl || comic.blocks?.[0]?.imageUrl || null;
                const isDraft = !comic.isPublished;

                return (
                  <div
                    key={comic.id}
                    onClick={() => {
                      if (isDraft) {
                        router.push(`/coming-soon/${encodeURIComponent(comic.id)}`);
                        return;
                      }
                      setSelected(comic);
                    }}
                    className="group flex flex-col gap-3 text-left cursor-pointer"
                  >
                    {/* Cover card */}
                    <div
                      className={`relative aspect-[3/4] rounded-xl overflow-hidden shadow-lg transition-transform duration-300 ease-out ${isDraft
                        ? `${isDark
                          ? 'border border-blue-500/40 shadow-[0_10px_30px_rgba(37,99,235,0.2)] group-hover:scale-[1.01] group-hover:shadow-[0_18px_40px_rgba(37,99,235,0.25)]'
                          : 'border border-blue-200 shadow-[0_10px_24px_rgba(37,99,235,0.15)] group-hover:scale-[1.01] group-hover:shadow-[0_16px_30px_rgba(37,99,235,0.18)]'
                        }`
                        : 'group-hover:scale-[1.02] group-hover:shadow-2xl group-hover:shadow-blue-500/10'
                        }`}
                    >
                      {comic.coverUrl || firstPageUrl ? (
                        <>
                          <img
                            src={comic.coverUrl || firstPageUrl}
                            alt={comic.title}
                            className={`w-full h-full object-cover transition-transform duration-300 ease-out ${isDraft ? 'opacity-100 saturate-100 group-hover:scale-[1.03]' : 'group-hover:scale-105'}`}
                            loading="lazy"
                          />

                          {/* Watermark on Cover */}
                          <img
                            src="/CBA.jpg"
                            alt=""
                            className="absolute bottom-2 right-2 w-6 h-6 object-contain opacity-80 pointer-events-none select-none z-10 group-hover:opacity-90 transition-opacity duration-500"
                          />

                          {isDraft && (
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-transparent p-3">
                              <div className="absolute left-3 bottom-3 bg-blue-600/90 shadow-[0_0_16px_rgba(37,99,235,0.35)] text-white text-[10px] font-black uppercase tracking-[0.16em] px-3 py-1.5 rounded-full border border-white/20 whitespace-nowrap">
                                {t.comingSoon}
                              </div>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-gradient-to-br from-blue-950/60 to-[#080c14] relative group-hover:scale-105 transition-transform duration-300 ease-out">
                          <div className="absolute inset-3 grid grid-cols-2 grid-rows-2 gap-1 opacity-20">
                            {[...Array(4)].map((_, i) => <div key={i} className="border border-blue-700 rounded-sm" />)}
                          </div>
                          <span className="relative font-black text-2xl text-blue-800 uppercase tracking-widest">
                            {comic.title.substring(0, 2)}
                          </span>
                          {isDraft && (
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-transparent p-3">
                              <div className="absolute left-3 bottom-3 bg-blue-600/90 shadow-[0_0_16px_rgba(37,99,235,0.35)] text-white text-[10px] font-black uppercase tracking-[0.16em] px-3 py-1.5 rounded-full border border-white/20 whitespace-nowrap">
                                {t.comingSoon}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Read Now overlay */}
                      {!isDraft && (
                        <div className="absolute inset-0 flex items-end p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-t from-blue-950/20 via-transparent to-transparent pointer-events-none" />
                      )}

                      {/* Corner accents */}
                      {!isDraft && (
                        <>
                          <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-blue-500/0 group-hover:border-blue-400/80 transition-colors rounded-tl-xl z-20" />
                          <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-blue-500/0 group-hover:border-blue-400/80 transition-colors rounded-br-xl" />
                        </>
                      )}

                      {/* Favourite Button */}
                      {!isDraft && (
                        <>
                          <div className="absolute top-0 right-0 w-24 h-24 pointer-events-none bg-[radial-gradient(circle_at_top_right,rgba(0,0,0,0.7)_0%,transparent_70%)] opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-10 rounded-tr-xl" />
                          <button
                            onClick={(e) => toggleFavorite(e, comic.id)}
                            className="absolute top-2.5 right-2.5 z-40 p-2 group/heart transition-all duration-300"
                          >
                            <Heart
                              className={`w-5 h-5 transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${favorites.includes(comic.id)
                                ? 'fill-red-500 text-red-500 scale-110 drop-shadow-[0_0_12px_rgba(239,68,68,0.5)]'
                                : 'text-white opacity-0 group-hover:opacity-100 scale-75 group-hover:scale-100 drop-shadow-2xl'
                                }`}
                            />
                          </button>
                        </>
                      )}

                      {/* Page Counter */}
                      {!isDraft && (
                        <>
                          <div className="absolute bottom-0 left-0 w-40 h-24 pointer-events-none bg-[radial-gradient(circle_at_bottom_left,rgba(0,0,0,0.7)_0%,transparent_70%)] opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-10 rounded-bl-xl" />
                          <div className="absolute bottom-2.5 left-2.5 z-40 flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
                            <div className="flex items-center gap-1.5">
                              <div className="p-1 rounded-md bg-white/10 backdrop-blur-md border border-white/10 shadow-lg">
                                <BookOpen className="w-3.5 h-3.5 text-blue-400" />
                              </div>
                              <span className="text-[10px] font-black text-white uppercase tracking-widest drop-shadow-lg">
                                {comic.blocks?.length || 0} {language === 'ka' ? 'გვერდი' : 'Pages'}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <div className="p-1 rounded-md bg-white/10 backdrop-blur-md border border-white/10 shadow-lg" >
                                <Eye className="w-3.5 h-3.5 text-amber-400" />
                              </div>
                              <span className="text-[10px] font-black text-white uppercase tracking-widest drop-shadow-lg">
                                {t.views(comic.views || 0)}
                              </span>
                            </div>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Enhanced Info Board */}
                    <div className="flex flex-col gap-1 px-1">
                      <h3 className={`font-black text-sm md:text-base leading-tight transition-colors duration-200 line-clamp-2 group-hover:text-blue-400 ${isDark ? 'text-white' : 'text-neutral-900'}`}>
                        {comic.title}
                      </h3>
                      <div className="flex items-center gap-2">
                        <div className="w-1 h-3 bg-blue-500/40 rounded-full" />
                        <p className={`text-[10px] font-bold uppercase tracking-widest ${isDark ? 'text-blue-400/60' : 'text-neutral-500'}`}>
                          {comic.author}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Submit Request */}
      <section className="relative overflow-hidden py-16">
        <div className="absolute inset-0 pointer-events-none">
          <div className={`absolute -top-32 -right-28 w-96 h-96 rounded-full blur-[100px] decorative-blur-blob ${isDark ? 'bg-blue-500/15' : 'bg-blue-300/30'}`} />
          <div className={`absolute -bottom-24 -left-24 w-[26rem] h-[26rem] rounded-full blur-[110px] decorative-blur-blob ${isDark ? 'bg-cyan-500/10' : 'bg-cyan-300/35'}`} />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-6">
          <div className={`rounded-3xl overflow-hidden border shadow-2xl ${isDark ? 'bg-[#0b111f] border-blue-900/40' : 'bg-white border-blue-100'}`}>
            <div className="grid md:grid-cols-[1.05fr_1fr]">
              <div className={`p-7 md:p-10 border-b md:border-b-0 md:border-r ${isDark ? 'border-blue-900/30 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.14),transparent_60%)]' : 'border-blue-100 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.08),transparent_62%)]'}`}>
                <p className="text-[11px] font-black tracking-[0.2em] uppercase text-blue-500 mb-4">{t.requestEyebrow}</p>
                <h2 className={`text-2xl md:text-4xl leading-tight font-black mb-4 ${isDark ? 'text-white' : 'text-neutral-900'}`}>
                  {t.requestTitle}
                </h2>
                <p className={`text-sm md:text-base leading-relaxed max-w-md ${isDark ? 'text-neutral-300' : 'text-neutral-600'}`}>
                  {t.requestDescription}
                </p>
              </div>

              <form onSubmit={submitPublishRequest} className="p-7 md:p-10 space-y-4">
                <label className="block">
                  <span className={`block text-[11px] font-black uppercase tracking-[0.14em] mb-2 ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>
                    {t.requestNameLabel}
                  </span>
                  <input
                    type="text"
                    value={requestForm.requesterName}
                    onChange={(e) => handleRequestFieldChange('requesterName', e.target.value)}
                    placeholder={t.requestNamePlaceholder}
                    maxLength={80}
                    required
                    className={`w-full rounded-2xl border px-4 py-3 text-sm outline-none transition-colors ${isDark ? 'bg-black/30 border-blue-900/50 text-white placeholder:text-neutral-500 focus:border-blue-500' : 'bg-neutral-50 border-neutral-200 text-neutral-900 placeholder:text-neutral-400 focus:border-blue-400'}`}
                  />
                </label>

                <label className="block">
                  <span className={`block text-[11px] font-black uppercase tracking-[0.14em] mb-2 ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>
                    {t.requestComicTitleLabel}
                  </span>
                  <input
                    type="text"
                    value={requestForm.comicTitle}
                    onChange={(e) => handleRequestFieldChange('comicTitle', e.target.value)}
                    placeholder={t.requestComicTitlePlaceholder}
                    maxLength={160}
                    required
                    className={`w-full rounded-2xl border px-4 py-3 text-sm outline-none transition-colors ${isDark ? 'bg-black/30 border-blue-900/50 text-white placeholder:text-neutral-500 focus:border-blue-500' : 'bg-neutral-50 border-neutral-200 text-neutral-900 placeholder:text-neutral-400 focus:border-blue-400'}`}
                  />
                </label>

                <label className="block">
                  <span className={`block text-[11px] font-black uppercase tracking-[0.14em] mb-2 ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>
                    {t.requestAuthorLabel}
                  </span>
                  <input
                    type="text"
                    value={requestForm.bookAuthor}
                    onChange={(e) => handleRequestFieldChange('bookAuthor', e.target.value)}
                    placeholder={t.requestAuthorPlaceholder}
                    maxLength={120}
                    required
                    className={`w-full rounded-2xl border px-4 py-3 text-sm outline-none transition-colors ${isDark ? 'bg-black/30 border-blue-900/50 text-white placeholder:text-neutral-500 focus:border-blue-500' : 'bg-neutral-50 border-neutral-200 text-neutral-900 placeholder:text-neutral-400 focus:border-blue-400'}`}
                  />
                </label>

                <div className="hidden" aria-hidden="true">
                  <label htmlFor="website-check">Website</label>
                  <input
                    id="website-check"
                    type="text"
                    tabIndex={-1}
                    autoComplete="off"
                    value={requestForm.hpField}
                    onChange={(e) => handleRequestFieldChange('hpField', e.target.value)}
                  />
                </div>

                <button
                  type="submit"
                  disabled={requestStatus === 'submitting'}
                  className="w-full rounded-2xl px-4 py-3.5 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-700/70 text-white text-sm font-black uppercase tracking-[0.14em] transition-colors"
                >
                  {requestStatus === 'submitting' ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {t.requestSending}
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      {t.requestSubmit}
                    </>
                  )}
                </button>

                {requestFeedback && (
                  <p className={`text-xs font-bold ${requestStatus === 'success' ? 'text-emerald-500' : 'text-red-500'}`}>
                    {requestFeedback}
                  </p>
                )}
              </form>
            </div>
          </div>
        </div>
      </section>
      {/* Footer */}
      <footer className={`border-t mt-8 transition-colors ${isDark ? 'border-blue-900/30' : 'border-neutral-200 bg-white'}`}>
        <div className={`max-w-7xl mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs ${isDark ? 'text-neutral-500' : 'text-neutral-400'}`}>
          <div className="flex flex-wrap justify-center items-center gap-6 font-bold">
            <Link href="/privacy" className="hover:text-blue-400 transition-colors uppercase tracking-widest">{t.privacyPolicy}</Link>
            <Link href="/terms" className="hover:text-blue-400 transition-colors uppercase tracking-widest">{t.termsAndConditions}</Link>
          </div>
          <div className="flex items-center gap-4">
            <span className="font-medium mr-2">{t.footerText}</span>
            <span className="w-1 h-1 rounded-full bg-neutral-500/30"></span>
            <Link href="/portfolio" className="font-bold hover:text-blue-400 transition-colors tracking-wide">
              {t.createdBy}
            </Link>
          </div>
        </div>
      </footer>

      {/* Modal */}
      {selected && <ComicReaderModal comic={selected} onClose={closeModal} />}
    </div>
  );
}
