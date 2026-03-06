'use client';

// Force dynamic rendering so Next.js never caches this page
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import React, { useState, useEffect } from 'react';
import { ArrowLeft, ArrowUp, ArrowDown, Loader2, Sun, Moon, Users, X, LogOut, Clock, BookOpen, Info, Tag, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useGamification } from '@/lib/useGamification';
import { resolveBookCategory } from '@/lib/bookCategory';

interface BubbleOverlay {
    id: string;
    bubbleType: 'bubble1' | 'bubble2' | 'bubble3';
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

interface Character {
    id: string;
    name: string;
    description: string;
    imageUrl: string;
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

interface CharacterPageMatch {
    blockId: string;
    imageUrl: string;
    panelIndex: number;
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

export default function ReaderPage({ params }: { params: Promise<{ id: string }> }) {
    const { t, language } = useLanguage();
    const { theme, toggleTheme } = useTheme();
    const { id } = React.use(params);
    const [blocks, setBlocks] = useState<ComicBlock[]>([]);
    const [loading, setLoading] = useState(true);
    const [title, setTitle] = useState('');
    const [author, setAuthor] = useState('');
    const [category, setCategory] = useState('');
    const [description, setDescription] = useState('');
    const [showDescription, setShowDescription] = useState(false);
    const [characters, setCharacters] = useState<Character[]>([]);
    const [showCharacters, setShowCharacters] = useState(false);
    const [activeHotspotKey, setActiveHotspotKey] = useState<string | null>(null);
    const [activeHotspotCharacterId, setActiveHotspotCharacterId] = useState<string | null>(null);
    const [selectedCharacterPagePreviewById, setSelectedCharacterPagePreviewById] = useState<Record<string, string | null>>({});
    const { user, signOut } = useAuth();
    const { addReadingTime, completeChapter, markBookCompleted } = useGamification();
    const completeChapterRef = React.useRef(completeChapter);
    completeChapterRef.current = completeChapter;
    const [readingTime, setReadingTime] = useState(0);
    const [isReadingTimeLoaded, setIsReadingTimeLoaded] = useState(false);
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const [chapters, setChapters] = useState<{ id: string, title: string, index: number, previewUrl?: string | null }[]>([]);
    const [currentChapterId, setCurrentChapterId] = useState<string | null>(null);
    const [currentBlockId, setCurrentBlockId] = useState<string | null>(null);
    const [checkedBlockId, setCheckedBlockId] = useState<string | null>(null);
    const [savingCheckedBlockId, setSavingCheckedBlockId] = useState<string | null>(null);
    const [checkpointPulseId, setCheckpointPulseId] = useState<string | null>(null);
    const [showChapters, setShowChapters] = useState(false);
    const [isEntering, setIsEntering] = useState(true);
    const [canScrollUp, setCanScrollUp] = useState(false);
    const [canScrollDown, setCanScrollDown] = useState(true);
    const scrollContainerRef = React.useRef<HTMLDivElement>(null);
    const readingTimeRef = React.useRef(0);
    const blocksRef = React.useRef<ComicBlock[]>([]);
    const hasMarkedBookCompletionRef = React.useRef(false);
    const categoryLabel = React.useMemo(
        () => resolveBookCategory({ title, category, language }),
        [title, category, language]
    );
    const checkpointStorageKey = React.useMemo(() => `chapterless-checkpoint:${id}`, [id]);
    const hasChapters = chapters.length > 0;
    const isChapterlessBook = blocks.length > 0 && !hasChapters;
    const lastRenderableBlockId = React.useMemo(() => {
        if (blocks.length === 0) return null;
        const lastIndex = blocks.length - 1;
        return String(blocks[lastIndex].id || lastIndex);
    }, [blocks]);
    const charactersById = React.useMemo(
        () => new Map(characters.map((character) => [character.id, character])),
        [characters]
    );
    const activeHotspotCharacter = React.useMemo(
        () => (activeHotspotCharacterId ? charactersById.get(activeHotspotCharacterId) || null : null),
        [activeHotspotCharacterId, charactersById]
    );

    const normalizeBlockId = React.useCallback((candidate: unknown) => {
        if (typeof candidate !== 'string' && typeof candidate !== 'number') return null;
        const normalized = String(candidate).trim();
        if (!normalized || normalized.length > 120) return null;
        return normalized;
    }, []);

    const resolveExistingBlockId = React.useCallback((candidate: unknown) => {
        const normalized = normalizeBlockId(candidate);
        if (!normalized) return null;
        const matchIndex = blocks.findIndex((block, index) => String(block.id || index) === normalized);
        if (matchIndex === -1) return null;
        return String(blocks[matchIndex].id || matchIndex);
    }, [blocks, normalizeBlockId]);

    const characterPageMatchesById = React.useMemo(() => {
        const pageMatches = new Map<string, CharacterPageMatch[]>();
        const seenByCharacter = new Map<string, Set<string>>();

        blocks.forEach((block, index) => {
            const normalizedBlockId = normalizeBlockId(String(block.id || index));
            if (!normalizedBlockId) return;

            const imageUrl = typeof block.croppedImageUrl === 'string' && block.croppedImageUrl.trim()
                ? block.croppedImageUrl.trim()
                : (typeof block.imageUrl === 'string' && block.imageUrl.trim() ? block.imageUrl.trim() : '');
            if (!imageUrl) return;

            const validHotspots = Array.isArray(block.characterHotspots) ? block.characterHotspots : [];
            validHotspots.forEach((hotspot) => {
                const characterId = typeof hotspot?.characterId === 'string' ? hotspot.characterId.trim() : '';
                if (!characterId || !charactersById.has(characterId)) return;

                if (!seenByCharacter.has(characterId)) {
                    seenByCharacter.set(characterId, new Set<string>());
                }
                const seenBlockIds = seenByCharacter.get(characterId)!;
                if (seenBlockIds.has(normalizedBlockId)) return;
                seenBlockIds.add(normalizedBlockId);

                if (!pageMatches.has(characterId)) {
                    pageMatches.set(characterId, []);
                }
                pageMatches.get(characterId)!.push({
                    blockId: normalizedBlockId,
                    imageUrl,
                    panelIndex: index + 1,
                });
            });
        });

        return pageMatches;
    }, [blocks, charactersById, normalizeBlockId]);

    const activeHotspotCharacterPages = React.useMemo(
        () => (activeHotspotCharacterId ? (characterPageMatchesById.get(activeHotspotCharacterId) || []) : []),
        [activeHotspotCharacterId, characterPageMatchesById]
    );

    const activeHotspotSelectedPreviewBlockId = React.useMemo(() => {
        if (!activeHotspotCharacterId) return null;
        const selected = selectedCharacterPagePreviewById[activeHotspotCharacterId] || null;
        if (!selected) return null;
        return activeHotspotCharacterPages.some((page) => page.blockId === selected) ? selected : null;
    }, [activeHotspotCharacterId, activeHotspotCharacterPages, selectedCharacterPagePreviewById]);

    const scrollToBlock = React.useCallback((blockId: string, behavior: ScrollBehavior = 'smooth') => {
        const safeBlockId = normalizeBlockId(blockId);
        if (!safeBlockId) return;
        const el = document.getElementById(`block-${safeBlockId}`);
        if (el && scrollContainerRef.current) {
            el.scrollIntoView({ behavior, block: 'start' });
        }
    }, [normalizeBlockId]);

    const closeHotspotCard = React.useCallback(() => {
        setActiveHotspotKey(null);
        setActiveHotspotCharacterId(null);
        setSelectedCharacterPagePreviewById({});
    }, []);

    const toggleHotspot = React.useCallback((blockId: string, hotspot: CharacterHotspot) => {
        const hotspotKey = `${blockId}:${hotspot.id}`;
        if (activeHotspotKey === hotspotKey) {
            closeHotspotCard();
            return;
        }
        setActiveHotspotKey(hotspotKey);
        setActiveHotspotCharacterId(hotspot.characterId);
    }, [activeHotspotKey, closeHotspotCard]);

    useEffect(() => {
        blocksRef.current = blocks;
    }, [blocks]);

    useEffect(() => {
        hasMarkedBookCompletionRef.current = false;
    }, [id, user?.uid]);

    useEffect(() => {
        if (!activeHotspotCharacterId) return;
        if (!charactersById.has(activeHotspotCharacterId)) {
            closeHotspotCard();
        }
    }, [activeHotspotCharacterId, charactersById, closeHotspotCard]);

    useEffect(() => {
        if (!activeHotspotCharacterId) return;
        if (activeHotspotCharacterPages.length === 0) return;

        setSelectedCharacterPagePreviewById((prev) => {
            const current = prev[activeHotspotCharacterId];
            if (current && activeHotspotCharacterPages.some((page) => page.blockId === current)) {
                return prev;
            }
            return { ...prev, [activeHotspotCharacterId]: activeHotspotCharacterPages[0].blockId };
        });
    }, [activeHotspotCharacterId, activeHotspotCharacterPages]);

    useEffect(() => {
        const fetchComic = async () => {
            try {
                const { db } = await import('@/lib/firebase');
                const { doc, getDocFromServer, updateDoc, increment } = await import('firebase/firestore');
                const docRef = doc(db, 'comics', id);
                const docSnap = await getDocFromServer(docRef);

                if (docSnap.exists()) {
                    const data = docSnap.data();
                    console.log('Comic Data Fetched:', data);
                    const safeCharacters = Array.isArray(data.characters)
                        ? data.characters.filter((character): character is Character => (
                            !!character &&
                            typeof character === 'object' &&
                            typeof (character as Character).id === 'string'
                        ))
                        : [];
                    const validCharacterIds = new Set(safeCharacters.map(character => character.id));
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
                        const extractedChapters = safeBlocks.reduce<{ id: string; title: string; index: number; previewUrl?: string | null }[]>((acc, block, index) => {
                            if (block.chapterTitle) {
                                // Find first block with an image starting from this chapter's first block
                                let previewUrl: string | null = null;
                                for (let j = index; j < safeBlocks.length; j++) {
                                    if (j > index && safeBlocks[j].chapterTitle) break;
                                    if (safeBlocks[j].croppedImageUrl || safeBlocks[j].imageUrl) {
                                        previewUrl = safeBlocks[j].croppedImageUrl || safeBlocks[j].imageUrl;
                                        break;
                                    }
                                }
                                acc.push({
                                    id: block.id || `chap_${index}`,
                                    title: block.chapterTitle,
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

                    setTitle(data.title || '');
                    setAuthor(data.author || '');
                    setCategory(typeof data.category === 'string' ? data.category : '');
                    setDescription(data.description || '');
                } else {
                    console.log('No such comic document!');
                }
            } catch (error: any) {
                console.error('Error fetching comic:', error);
                if (error.code === 'permission-denied') {
                    window.location.href = `/coming-soon/${id}`;
                }
            } finally {
                setLoading(false);
            }
        };
        fetchComic();
    }, [id]);

    useEffect(() => {
        if (!user) return;
        let isMounted = true;

        const loadReadingTime = async () => {
            try {
                const { db } = await import('@/lib/firebase');
                const { doc, getDoc } = await import('firebase/firestore');
                // Use a dedicated collection for user reading stats, using user.uid and book id
                const docRef = doc(db, 'userReadingStats', `${user.uid}_${id}`);
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
                if (isMounted) setIsReadingTimeLoaded(true); // default to 0 on error
            }
        };

        loadReadingTime();

        return () => { isMounted = false; };
    }, [user, id]);

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
                const { db } = await import('@/lib/firebase');
                const { doc, setDoc } = await import('firebase/firestore');
                const docRef = doc(db, 'userReadingStats', `${user.uid}_${id}`);
                await setDoc(docRef, { timeSpent: readingTimeRef.current, userId: user.uid }, { merge: true });

                // Also add to global stats
                await addReadingTime(10);
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
                    const { db } = await import('@/lib/firebase');
                    const { doc, setDoc } = await import('firebase/firestore');
                    const docRef = doc(db, 'userReadingStats', `${user.uid}_${id}`);
                    await setDoc(docRef, { timeSpent: readingTimeRef.current, userId: user.uid }, { merge: true });
                } catch (error) {
                    // silently fail on unmount
                }
            };
            finalSync();
        };
    }, [user, id, isReadingTimeLoaded]);

    // Handle Scroll Tracking for Blocks and Chapters
    useEffect(() => {
        if (!scrollContainerRef.current || blocks.length === 0) return;

        const observer = new IntersectionObserver((entries) => {
            const visible = entries.find(e => e.isIntersecting);
            if (visible) {
                const blockId = visible.target.getAttribute('data-block-id');
                if (blockId) {
                    setCurrentBlockId(blockId);

                    // Also find current chapter
                    const blockIndex = blocksRef.current.findIndex(b => (b.id || `chap_${blocksRef.current.indexOf(b)}`) === blockId);
                    if (blockIndex !== -1) {
                        const activeChapter = [...blocksRef.current]
                            .slice(0, blockIndex + 1)
                            .reverse()
                            .find(b => b.chapterTitle);
                        if (activeChapter) {
                            const chapId = activeChapter.id || `chap_${blocksRef.current.indexOf(activeChapter)}`;
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

        const blockElements = scrollContainerRef.current.querySelectorAll('[data-block-id]');
        blockElements.forEach(el => observer.observe(el));

        return () => observer.disconnect();
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
                const { db } = await import('@/lib/firebase');
                const { doc, getDoc } = await import('firebase/firestore');
                const docRef = doc(db, 'userReadingStats', `${user.uid}_${id}`);
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

                        // Set current chapter from saved position
                        const blockIndex = blocks.findIndex((block, index) => String(block.id || index) === savedBlockId);
                        if (blockIndex !== -1 && chapters.length > 0) {
                            const activeChapter = [...blocks]
                                .slice(0, blockIndex + 1)
                                .reverse()
                                .find(b => b.chapterTitle);
                            if (activeChapter) {
                                setCurrentChapterId(activeChapter.id || `chap_${blocks.indexOf(activeChapter)}`);
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
    }, [user, id, blocks, chapters, hasChapters, isChapterlessBook, resolveExistingBlockId, scrollToBlock, checkpointStorageKey]);

    // Sync current progress to Firebase
    useEffect(() => {
        if (!user || !currentBlockId || isChapterlessBook) return;

        const syncProgress = async () => {
            try {
                const { db } = await import('@/lib/firebase');
                const { doc, setDoc } = await import('firebase/firestore');
                const docRef = doc(db, 'userReadingStats', `${user.uid}_${id}`);

                await setDoc(docRef, {
                    lastBlockId: currentBlockId,
                    lastChapterId: currentChapterId // Keep for backward compatibility/chapter view
                }, { merge: true });
            } catch (error) {
                console.error('Error saving reading stats', error);
            }
        };

        const timeoutId = setTimeout(syncProgress, 1500);
        return () => clearTimeout(timeoutId);
    }, [user, id, currentBlockId, currentChapterId, isChapterlessBook]);

    // Count chapter as completed when user has been in it for at least 1 minute (by open, not by leaving).
    // Use ref so timer is not reset when completeChapter identity changes (e.g. when stats updates from reading time).
    const CHAPTER_COMPLETE_READ_SEC = 60;
    useEffect(() => {
        if (!user || !id || !currentChapterId || !hasChapters) return;

        const timerId = setTimeout(() => {
            completeChapterRef.current(id, currentChapterId).catch(() => { });
        }, CHAPTER_COMPLETE_READ_SEC * 1000);

        return () => clearTimeout(timerId);
    }, [user, id, currentChapterId, hasChapters]);

    useEffect(() => {
        if (!user || !id || !currentBlockId || !lastRenderableBlockId) return;
        if (hasMarkedBookCompletionRef.current) return;
        if (currentBlockId !== lastRenderableBlockId) return;

        hasMarkedBookCompletionRef.current = true;
        markBookCompleted(id).catch(() => {
            hasMarkedBookCompletionRef.current = false;
        });
    }, [user, id, currentBlockId, lastRenderableBlockId, markBookCompleted]);

    const scrollToChapter = (blockId: string) => {
        setCurrentChapterId(blockId);
        setCurrentBlockId(blockId);
        setIsEntering(false);

        // Immediate sync on selection
        if (user && id) {
            import('@/lib/firebase').then(({ db }) => {
                import('firebase/firestore').then(({ doc, setDoc }) => {
                    const docRef = doc(db, 'userReadingStats', `${user.uid}_${id}`);
                    setDoc(docRef, {
                        lastBlockId: blockId,
                        lastChapterId: blockId
                    }, { merge: true }).catch(err =>
                        console.error('Error in immediate sync:', err)
                    );
                });
            });
        }

        // Small timeout to ensure blocks are rendered
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
                const { db } = await import('@/lib/firebase');
                const { doc, setDoc } = await import('firebase/firestore');
                const docRef = doc(db, 'userReadingStats', `${user.uid}_${id}`);
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
    const getVisibleBlockElements = React.useCallback(() => {
        const container = scrollContainerRef.current;
        if (!container) return [];
        return Array.from(container.querySelectorAll<HTMLElement>('[data-block-id]'));
    }, []);

    const resolveActiveBlockIndex = React.useCallback((elements: HTMLElement[]) => {
        if (elements.length === 0) return -1;

        if (currentBlockId) {
            const currentIndex = elements.findIndex((el) => el.getAttribute('data-block-id') === currentBlockId);
            if (currentIndex !== -1) return currentIndex;
        }

        const container = scrollContainerRef.current;
        if (!container) return 0;

        const containerRect = container.getBoundingClientRect();
        const anchorY = containerRect.top + (container.clientHeight * 0.25);
        let closestIndex = 0;
        let closestDistance = Number.POSITIVE_INFINITY;

        elements.forEach((el, index) => {
            const distance = Math.abs(el.getBoundingClientRect().top - anchorY);
            if (distance < closestDistance) {
                closestDistance = distance;
                closestIndex = index;
            }
        });

        return closestIndex;
    }, [currentBlockId]);

    const jumpToAdjacentBlock = React.useCallback((direction: 'up' | 'down', behavior: ScrollBehavior = 'auto') => {
        const elements = getVisibleBlockElements();
        if (elements.length === 0) return;

        const activeIndex = resolveActiveBlockIndex(elements);
        if (activeIndex === -1) return;

        const targetIndex = direction === 'down'
            ? Math.min(activeIndex + 1, elements.length - 1)
            : Math.max(activeIndex - 1, 0);

        if (targetIndex === activeIndex) return;

        const targetElement = elements[targetIndex];
        targetElement.scrollIntoView({ behavior, block: 'start' });

        const targetBlockId = targetElement.getAttribute('data-block-id');
        if (targetBlockId) {
            setCurrentBlockId(targetBlockId);
        }
    }, [getVisibleBlockElements, resolveActiveBlockIndex]);

    const updateArrowButtonState = React.useCallback(() => {
        const elements = getVisibleBlockElements();
        if (elements.length === 0) {
            setCanScrollUp(false);
            setCanScrollDown(false);
            return;
        }

        const activeIndex = resolveActiveBlockIndex(elements);
        if (activeIndex === -1) {
            setCanScrollUp(false);
            setCanScrollDown(elements.length > 1);
            return;
        }

        setCanScrollUp(activeIndex > 0);
        setCanScrollDown(activeIndex < elements.length - 1);
    }, [getVisibleBlockElements, resolveActiveBlockIndex]);

    useEffect(() => {
        const container = scrollContainerRef.current;
        if (!container) return;

        updateArrowButtonState();
        const onScroll = () => updateArrowButtonState();

        container.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', onScroll);
        const syncTimeout = setTimeout(onScroll, 120);

        return () => {
            clearTimeout(syncTimeout);
            container.removeEventListener('scroll', onScroll);
            window.removeEventListener('resize', onScroll);
        };
    }, [blocks, currentChapterId, isEntering, updateArrowButtonState]);

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
            if (showDescription || showCharacters || showChapters || showProfileMenu) return;

            const target = event.target as HTMLElement | null;
            if (target) {
                const tagName = target.tagName.toLowerCase();
                const isTypingContext = tagName === 'input' || tagName === 'textarea' || tagName === 'select' || target.isContentEditable;
                if (isTypingContext) return;
            }

            if (!scrollContainerRef.current) return;
            event.preventDefault();
            jumpToAdjacentBlock(event.key === 'ArrowDown' ? 'down' : 'up', 'auto');
        };

        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [showDescription, showCharacters, showChapters, showProfileMenu, jumpToAdjacentBlock]);

    const formatTime = (totalSeconds: number) => {
        const hrs = Math.floor(totalSeconds / 3600);
        const mins = Math.floor((totalSeconds % 3600) / 60);
        const secs = totalSeconds % 60;

        if (hrs > 0) {
            return `${hrs}h ${mins}m`;
        } else if (mins > 0) {
            return `${mins}m ${secs}s`;
        } else {
            return `${secs}s`;
        }
    };

    const currentChapterIndex = chapters.findIndex(c => c.id === currentChapterId);

    const currentChapterBlocks = React.useMemo(() => {
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
        <div className={`min-h-screen flex flex-col transition-colors duration-300 ${isDark ? 'bg-[#0a0a0a] text-white' : 'bg-neutral-50 text-neutral-900 shadow-inner'}`}>
            {/* Header */}
            <header className={`p-4 flex items-center justify-between sticky top-0 z-50 backdrop-blur-md border-b shrink-0 transition-colors duration-300 ${isDark
                ? 'bg-[#0a0a0a]/80 border-neutral-800/50'
                : 'bg-white/80 border-neutral-200'
                }`}>
                <Link href="/" className={`p-2 rounded-full transition-colors ${isDark ? 'hover:bg-neutral-800' : 'hover:bg-neutral-100'}`}>
                    <ArrowLeft className={`w-5 h-5 ${isDark ? 'text-neutral-300' : 'text-neutral-600'}`} />
                </Link>
                <div className="flex-1 flex flex-col items-center justify-center min-w-0 px-2">
                    <div className="flex items-center gap-2 max-w-full">
                        <h1 className={`text-base font-black leading-tight tracking-wide truncate ${isDark ? 'text-white' : 'text-neutral-900'}`}>{title}</h1>
                        <div className="flex items-center gap-2">
                            {chapters.length > 0 && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setShowChapters(true);
                                    }}
                                    className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all duration-300 active:scale-95 shadow-sm group/chap ${isDark
                                        ? 'bg-blue-500/10 border-blue-500/20 text-blue-400 hover:bg-blue-500/20 hover:border-blue-500/40'
                                        : 'bg-blue-600/5 border-blue-600/10 text-blue-600 hover:bg-blue-600/10 hover:border-blue-600/30'
                                        }`}
                                >
                                    <BookOpen className="w-3.5 h-3.5 group-hover/chap:scale-110 transition-transform duration-300" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">{t.chapters}</span>
                                </button>
                            )}
                            {characters.length > 0 && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setShowCharacters(true);
                                    }}
                                    className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all duration-300 active:scale-95 shadow-sm group/char ${isDark
                                        ? 'bg-blue-500/10 border-blue-500/20 text-blue-400 hover:bg-blue-500/20 hover:border-blue-500/40'
                                        : 'bg-blue-600/5 border-blue-600/10 text-blue-600 hover:bg-blue-600/10 hover:border-blue-600/30'
                                        }`}
                                >
                                    <Users className="w-3.5 h-3.5 group-hover/char:scale-110 transition-transform duration-300" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">{t.characters}</span>
                                </button>
                            )}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowDescription(true);
                                }}
                                className={`lg:hidden shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all duration-300 active:scale-95 shadow-sm group/desc ${isDark ? 'bg-blue-500/10 border-blue-500/20 text-blue-400 hover:bg-blue-500/20 hover:border-blue-500/40' : 'bg-blue-600/5 border-blue-600/10 text-blue-600 hover:bg-blue-600/10 hover:border-blue-600/30'}`}
                            >
                                <Info className="w-3.5 h-3.5 group-hover/desc:scale-110 transition-transform duration-300" />
                                <span className="text-[10px] font-black uppercase tracking-widest">{t.description || 'Description'}</span>
                            </button>
                        </div>
                    </div>
                    {(author || categoryLabel) && (
                        <div className="mt-1 flex items-center justify-center gap-2 flex-wrap">
                            {author && <p className={`text-[10px] sm:text-xs truncate max-w-full ${isDark ? 'text-neutral-500' : 'text-neutral-400'}`}>{author}</p>}
                            {categoryLabel && (
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-widest ${isDark
                                    ? 'bg-blue-500/10 text-blue-300 border-blue-500/30'
                                    : 'bg-blue-50 text-blue-700 border-blue-200'
                                    }`}>
                                    <Tag className="w-3 h-3" />
                                    {categoryLabel}
                                </span>
                            )}
                        </div>
                    )}
                </div>
                {user && (
                    <div className="flex items-center gap-2">
                        <div className={`hidden md:flex items-center gap-2 mr-2 px-3 py-1.5 rounded-full border transition-colors shadow-sm ${isDark
                            ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                            : 'bg-amber-100 border-amber-200 text-amber-700'}`}>
                            <Clock className="w-3.5 h-3.5 animate-pulse" />
                            <span className="text-[10px] font-bold uppercase tracking-widest">{formatTime(readingTime)}</span>
                        </div>

                        <div className="relative">
                            <button
                                onClick={() => setShowProfileMenu(!showProfileMenu)}
                                className={`flex items-center gap-2 p-1.5 rounded-full border transition-all duration-300 hover:scale-[1.05] active:scale-95 ${isDark ? 'bg-neutral-800 border-neutral-700 hover:bg-neutral-700' : 'bg-white border-neutral-200 hover:border-neutral-300 shadow-sm'}`}
                            >
                                <div className="w-6 h-6 rounded-full border border-blue-500/10 overflow-hidden bg-neutral-900 flex items-center justify-center shrink-0">
                                    {user.photoURL ? (
                                        <img src={user.photoURL} alt="User" className="w-full h-full object-cover" />
                                    ) : (
                                        <Users className="w-3.5 h-3.5 text-blue-400" />
                                    )}
                                </div>
                            </button>

                            {showProfileMenu && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setShowProfileMenu(false)} />
                                    <div className={`absolute right-0 mt-3 w-56 rounded-2xl border shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 ${isDark ? 'bg-[#0a0a0a] border-neutral-800' : 'bg-white border-neutral-100'}`}>
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
                                            <button
                                                className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${isDark ? 'text-neutral-300 hover:bg-neutral-800' : 'text-neutral-600 hover:bg-neutral-50'}`}
                                            >
                                                <Users className="w-4 h-4 text-blue-500" />
                                                {t.profile}
                                            </button>
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
                    </div>
                )}

                <button
                    onClick={toggleTheme}
                    className={`ml-2 p-2 rounded-full transition-colors ${isDark ? 'hover:bg-neutral-800 text-amber-400' : 'hover:bg-neutral-100 text-blue-600'}`}
                    aria-label="Toggle Theme"
                >
                    {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                </button>
            </header>

            {loading ? (
                <main className="flex-1 flex items-center justify-center">
                    <div className={`flex flex-col items-center gap-4 ${isDark ? 'text-neutral-500' : 'text-neutral-400'}`}>
                        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                        <p>{t.loadingComicBook || 'Loading...'}</p>
                    </div>
                </main>
            ) : showChapterPicker ? (
                <main className="flex-1 overflow-y-auto bg-inherit">
                    <div className="max-w-xl mx-auto py-12 px-6 flex flex-col gap-10">
                        <div className="text-center space-y-3">
                            <h2 className={`text-3xl font-black uppercase tracking-tight ${isDark ? 'text-white' : 'text-neutral-900'}`}>
                                {t.selectChapter}
                            </h2>
                            <div className="h-1.5 w-16 bg-blue-500 mx-auto rounded-full" />
                            <p className={`text-sm font-medium ${isDark ? 'text-neutral-500' : 'text-neutral-400'}`}>
                                {title}
                            </p>
                        </div>

                        <div className="grid gap-4">
                            {chapters.length === 0 ? (
                                <div className="text-center py-12 border-2 border-dashed border-neutral-800 rounded-3xl">
                                    <p className="text-neutral-500 font-bold uppercase tracking-widest text-xs">{t.noContent}</p>
                                </div>
                            ) : (
                                chapters.map((chap, idx) => (
                                    <button
                                        key={chap.id}
                                        onClick={() => scrollToChapter(chap.id)}
                                        className={`group w-full text-left p-6 rounded-[2rem] border-2 transition-all duration-500 flex items-center gap-6 ${currentChapterId === chap.id
                                            ? isDark ? 'bg-blue-500/10 border-blue-500/40 shadow-blue-500/5 shadow-2xl' : 'bg-blue-50 border-blue-200 shadow-xl shadow-blue-500/5'
                                            : isDark ? 'bg-neutral-900/40 border-neutral-800/50 hover:border-neutral-700' : 'bg-white border-neutral-100/50 hover:border-neutral-200 shadow-sm'
                                            } hover:scale-[1.02] active:scale-[0.98]`}
                                    >
                                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black transition-all duration-500 ${currentChapterId === chap.id
                                            ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/40 rotate-3'
                                            : isDark ? 'bg-neutral-800 text-neutral-400 group-hover:bg-neutral-700 group-hover:text-white' : 'bg-neutral-100 text-neutral-500 group-hover:bg-neutral-200'
                                            }`}>
                                            {idx + 1}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <h3 className={`font-chapter font-bold text-xl truncate mb-0.5 transition-colors duration-500 ${currentChapterId === chap.id
                                                ? isDark ? 'text-blue-400' : 'text-blue-700'
                                                : isDark ? 'text-white' : 'text-neutral-900'
                                                }`}>
                                                {chap.title}
                                            </h3>
                                            {currentChapterId === chap.id && (
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                                                    <p className="text-xs font-black uppercase tracking-widest text-blue-500/80">
                                                        {t.youStoppedHere}
                                                    </p>
                                                </div>
                                            )}
                                        </div>

                                        <div className={`w-14 h-14 rounded-xl flex items-center justify-center overflow-hidden transition-all duration-300 ${currentChapterId === chap.id
                                            ? 'ring-2 ring-blue-500 shadow-lg shadow-blue-500/20'
                                            : isDark ? 'bg-neutral-800' : 'bg-neutral-100'
                                            }`}>
                                            {chap.previewUrl ? (
                                                <img src={chap.previewUrl} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                            ) : (
                                                <div className={`w-full h-full flex items-center justify-center text-xl font-black ${currentChapterId === chap.id ? 'bg-blue-500 text-white' : isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                                                    {idx + 1}
                                                </div>
                                            )}
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>

                        {/* Resume Button */}
                        <button
                            onClick={() => {
                                setIsEntering(false);
                                // Small delay to ensure container is visible then scroll
                                setTimeout(() => {
                                    if (currentBlockId) {
                                        scrollToBlock(currentBlockId);
                                    }
                                }, 100);
                            }}
                            className={`group w-full py-5 rounded-3xl font-black uppercase tracking-widest text-sm transition-all duration-500 bg-blue-600 hover:bg-blue-500 text-white shadow-2xl shadow-blue-600/30 flex items-center justify-center gap-4 active:scale-95`}
                        >
                            <BookOpen className="w-6 h-6 group-hover:rotate-12 transition-transform" />
                            {t.resumeReading}
                        </button>
                    </div>
                </main>
            ) : blocks.length === 0 ? (
                <main className="flex-1 flex items-center justify-center">
                    <div className={isDark ? 'text-neutral-500' : 'text-neutral-400'}>{t.noComics}</div>
                </main>
            ) : (
                <div className="flex-1 flex flex-col lg:flex-row overflow-hidden w-full lg:max-w-6xl xl:max-w-7xl mx-auto">
                    <main ref={scrollContainerRef} className="flex-1 overflow-y-auto scroll-smooth relative">
                        <div className="max-w-2xl mx-auto flex flex-col gap-6 py-6 px-4 md:px-0 pb-16">
                            {currentChapterBlocks.map((block, index) => {
                                const blockId = String(block.id || index);
                                const isCheckedPage = checkedBlockId === blockId;
                                const isSavingThisPage = savingCheckedBlockId === blockId;
                                const shouldPulse = checkpointPulseId === blockId;
                                const isActiveBlock = currentBlockId === blockId;

                                return (
                                    <div
                                        key={blockId}
                                        id={`block-${blockId}`}
                                        data-block-id={blockId}
                                        data-chapter-id={block.chapterTitle ? (block.id || `chap_${index}`) : undefined}
                                        className={`group/panel relative rounded-2xl shadow-xl transition-colors duration-300 ${isChapterlessBook ? 'overflow-visible' : 'overflow-hidden'} ${isDark
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
                                            <div className={`absolute -left-3 top-4 z-30 transition-all duration-300 ${isCheckedPage
                                                ? 'opacity-100 translate-x-0 pointer-events-auto'
                                                : isActiveBlock
                                                    ? 'opacity-55 translate-x-0 pointer-events-auto'
                                                    : 'opacity-0 translate-x-1 pointer-events-none group-hover/panel:opacity-65 group-hover/panel:translate-x-0 group-hover/panel:pointer-events-auto'
                                                }`}>
                                                <button
                                                    onClick={() => saveCheckedPage(blockId)}
                                                    disabled={isSavingThisPage}
                                                    aria-label={isCheckedPage ? t.checked : t.checkThisPage}
                                                    className={`relative h-7 w-7 rounded-full border flex items-center justify-center transition-all duration-300 active:scale-95 ${isCheckedPage
                                                        ? 'bg-blue-600 border-blue-600 text-white'
                                                        : isDark
                                                            ? 'bg-transparent border-blue-500/35 text-blue-300/70 hover:border-blue-400/60 hover:text-blue-200'
                                                            : 'bg-transparent border-blue-500/45 text-blue-700/70 hover:border-blue-600 hover:text-blue-800'
                                                        }`}
                                                >
                                                    {shouldPulse && (
                                                        <span className="absolute inset-0 rounded-full bg-blue-400/30 animate-ping" />
                                                    )}
                                                    <CheckCircle2 className={`relative z-10 w-3.5 h-3.5 transition-transform duration-300 ${isCheckedPage ? 'scale-110' : ''}`} />
                                                </button>
                                            </div>
                                        )}

                                        {block.chapterTitle && (
                                            <div className="px-6 pt-6 pb-3 text-center border-b border-neutral-200/20 mx-6 flex flex-col items-center gap-3">
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
                                            <div className={`px-6 ${block.chapterTitle ? 'pt-4 pb-4' : 'py-4'}`}>
                                                <p className={`font-geo-text text-base leading-relaxed whitespace-pre-wrap ${isDark ? 'text-neutral-200' : 'text-neutral-800'
                                                    }`}>
                                                    {block.text}
                                                </p>
                                            </div>
                                        )}
                                        {(block.croppedImageUrl || block.imageUrl) && (
                                            <div className={`px-4 pb-4 ${block.text ? 'pt-0' : 'pt-4'}`}>
                                                <div className="relative w-full rounded-xl overflow-hidden shadow-sm">
                                                    <img
                                                        src={block.croppedImageUrl || block.imageUrl}
                                                        alt={`Panel ${index + 1}`}
                                                        className="w-full h-auto block object-contain"
                                                        loading="lazy"
                                                    />
                                                    {/* Watermark */}
                                                    <img
                                                        src="/CBA.jpg"
                                                        alt=""
                                                        className="absolute bottom-2 right-2 w-7 h-7 object-contain opacity-80 pointer-events-none select-none z-20"
                                                    />
                                                    {/* Character Hotspots */}
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
                                                                className={`absolute rounded-full bg-transparent border border-transparent focus:outline-none transition-all duration-300 ${isActiveHotspot
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
                                                    {/* Speech Bubble Overlays */}
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

                            {/* Chapter Navigation Buttons */}
                            {chapters.length > 1 && currentChapterIndex !== -1 && (
                                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-8 pt-8 border-t border-neutral-200/20">
                                    {currentChapterIndex > 0 ? (
                                        <button
                                            onClick={() => goToChapter(currentChapterIndex - 1)}
                                            className={`flex-1 w-full sm:w-auto flex items-center justify-center gap-3 px-6 py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all duration-300 border-2 ${isDark
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
                                            className="flex-[1.5] w-full sm:w-auto flex items-center justify-center gap-3 px-8 py-5 rounded-2xl font-black uppercase tracking-widest text-sm transition-all duration-300 bg-blue-600 hover:bg-blue-500 text-white shadow-xl shadow-blue-500/20 active:scale-95 group"
                                        >
                                            {t.nextChapter}: {chapters[currentChapterIndex + 1].title}
                                            <ArrowLeft className="w-5 h-5 rotate-180 group-hover:translate-x-1 transition-transform" />
                                        </button>
                                    ) : (
                                        <div className="flex-1 flex flex-col items-center py-6 text-center gap-3">
                                            <h2 className="font-end text-4xl font-black mb-4 text-blue-500">დასასრული</h2>
                                            <p className={`${isDark ? 'text-neutral-500' : 'text-neutral-400'} text-sm font-medium`}>{t.endOfComic}</p>
                                            <Link href="/" className="text-blue-500 hover:text-blue-400 text-sm font-semibold transition-colors">
                                                {t.backToLibrary}
                                            </Link>
                                        </div>
                                    )}
                                </div>
                            )}

                            {chapters.length <= 1 && (
                                <div className="flex flex-col items-center py-12 text-center gap-3">
                                    <h2 className="font-end text-4xl font-black mb-4 text-blue-500">დასასრული</h2>
                                    <p className={`${isDark ? 'text-neutral-500' : 'text-neutral-400'} text-sm font-medium`}>{t.endOfComic}</p>
                                    <Link href="/" className="text-blue-500 hover:text-blue-400 text-sm font-semibold transition-colors">
                                        {t.backToLibrary}
                                    </Link>
                                </div>
                            )}
                        </div>
                    </main>

                    {/* Interactive Sidebar (Desktop) */}
                    <div className="hidden lg:flex flex-col w-[300px] xl:w-[320px] shrink-0 p-6 overflow-y-auto gap-4 custom-scrollbar lg:border-l border-neutral-200/50 dark:border-neutral-800/50 bg-white/20 dark:bg-black/20 backdrop-blur-sm">
                        <h3 className={`font-black uppercase tracking-widest text-sm mb-2 ${isDark ? 'text-neutral-500' : 'text-neutral-400'}`}>
                            {t.bookOverview}
                        </h3>

                        {/* Description Button */}
                        <button
                            onClick={() => setShowDescription(true)}
                            className={`group flex items-center gap-4 p-4 rounded-3xl border-2 transition-all duration-300 hover:scale-[1.02] active:scale-95 shadow-md hover:shadow-xl ${isDark
                                ? 'bg-[#0d0d0d]/80 border-neutral-800 hover:border-blue-500/50 hover:bg-neutral-900 shadow-black/50'
                                : 'bg-white/80 border-neutral-200 hover:border-blue-400 hover:bg-blue-50 shadow-blue-900/5'
                                }`}
                        >
                            <div className={`p-3 rounded-2xl transition-colors duration-300 ${isDark ? 'bg-blue-500/20 text-blue-400 group-hover:bg-blue-500 group-hover:text-white' : 'bg-blue-100 text-blue-600 group-hover:bg-blue-600 group-hover:text-white'}`}>
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
                                className={`group flex items-center gap-4 p-4 rounded-3xl border-2 transition-all duration-300 hover:scale-[1.02] active:scale-95 shadow-md hover:shadow-xl ${isDark
                                    ? 'bg-[#0d0d0d]/80 border-neutral-800 hover:border-indigo-500/50 hover:bg-neutral-900 shadow-black/50'
                                    : 'bg-white/80 border-neutral-200 hover:border-indigo-400 hover:bg-indigo-50 shadow-indigo-900/5'
                                    }`}
                            >
                                <div className={`p-3 rounded-2xl transition-colors duration-300 ${isDark ? 'bg-indigo-500/20 text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white' : 'bg-indigo-100 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white'}`}>
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
                                className={`group flex items-center gap-4 p-4 rounded-3xl border-2 transition-all duration-300 hover:scale-[1.02] active:scale-95 shadow-md hover:shadow-xl ${isDark
                                    ? 'bg-[#0d0d0d]/80 border-neutral-800 hover:border-emerald-500/50 hover:bg-neutral-900 shadow-black/50'
                                    : 'bg-white/80 border-neutral-200 hover:border-emerald-400 hover:bg-emerald-50 shadow-emerald-900/5'
                                    }`}
                            >
                                <div className={`p-3 rounded-2xl transition-colors duration-300 ${isDark ? 'bg-emerald-500/20 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white' : 'bg-emerald-100 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white'}`}>
                                    <Users className="w-7 h-7" />
                                </div>
                                <span className={`font-black uppercase tracking-widest text-base transition-colors ${isDark ? 'text-neutral-300 group-hover:text-white' : 'text-neutral-700 group-hover:text-neutral-900'}`}>
                                    {t.characters || 'Characters'}
                                </span>
                            </button>
                        )}

                        {/* Active Hotspot Character Card (Desktop) */}
                        <div className={`overflow-hidden transition-all duration-300 ${activeHotspotCharacter ? 'max-h-[620px] opacity-100 translate-y-0 mt-1' : 'max-h-0 opacity-0 -translate-y-2 pointer-events-none'}`}>
                            {activeHotspotCharacter && (
                                <div className={`rounded-3xl border-2 p-4 shadow-xl transition-all duration-300 ${isDark
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
                                            <p className={`text-xs leading-relaxed max-h-24 overflow-y-auto pr-1 custom-scrollbar ${isDark ? 'text-neutral-300' : 'text-neutral-700'}`}>
                                                {activeHotspotCharacter.description || (language === 'ka' ? 'აღწერა არ არის მითითებული.' : 'No description provided.')}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="mt-4">
                                        <div className="mb-2 flex items-center justify-between">
                                            <p className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-neutral-500' : 'text-neutral-400'}`}>
                                                {language === 'ka' ? 'გვერდები' : 'Pages'}
                                            </p>
                                            <span className={`text-[10px] font-bold ${isDark ? 'text-neutral-500' : 'text-neutral-600'}`}>
                                                {activeHotspotCharacterPages.length}
                                            </span>
                                        </div>
                                        {activeHotspotCharacterPages.length > 0 ? (
                                            <div className="flex gap-2 overflow-x-auto pb-1 snap-x snap-mandatory custom-scrollbar">
                                                {activeHotspotCharacterPages.map((page, idx) => {
                                                    const isSelected = activeHotspotSelectedPreviewBlockId === page.blockId;
                                                    return (
                                                        <button
                                                            key={`${page.blockId}-${idx}`}
                                                            type="button"
                                                            onClick={() => {
                                                                if (!activeHotspotCharacterId) return;
                                                                setSelectedCharacterPagePreviewById((prev) => ({
                                                                    ...prev,
                                                                    [activeHotspotCharacterId]: page.blockId,
                                                                }));
                                                            }}
                                                            aria-label={`Character page ${page.panelIndex}`}
                                                            className={`relative shrink-0 w-20 h-14 rounded-lg overflow-hidden border-2 snap-start transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/80 ${isSelected
                                                                ? (isDark ? 'border-blue-400 ring-2 ring-blue-400/60' : 'border-blue-500 ring-2 ring-blue-300/70')
                                                                : (isDark ? 'border-neutral-700 hover:border-blue-500/70' : 'border-neutral-300 hover:border-blue-400')
                                                                }`}
                                                        >
                                                            <img src={page.imageUrl} alt="" className="w-full h-full object-cover" />
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <p className={`text-xs ${isDark ? 'text-neutral-500' : 'text-neutral-600'}`}>
                                                {language === 'ka' ? 'ამ პერსონაჟისთვის გვერდები ვერ მოიძებნა.' : 'No pages found for this character.'}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Description Modal */}
            {showDescription && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={e => e.stopPropagation()}>
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity duration-300 animate-in fade-in" onClick={() => setShowDescription(false)} />
                    <div className={`relative w-full max-w-lg max-h-[70vh] overflow-hidden rounded-2xl shadow-2xl border flex flex-col transition-all duration-300 animate-in zoom-in-95 fade-in slide-in-from-bottom-4 ${isDark ? 'bg-[#0a0a0a] border-neutral-800 text-white' : 'bg-white border-neutral-200 text-neutral-900'}`} onClick={e => e.stopPropagation()}>
                        <div className="px-6 py-5 border-b flex items-center justify-between sticky top-0 bg-inherit/90 backdrop-blur-xl z-10 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${isDark ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-600/10 text-blue-600'}`}>
                                    <Info className="w-5 h-5" />
                                </div>
                                <div>
                                    <h2 className="text-base font-black tracking-tight uppercase leading-tight">{t.description || 'Description'}</h2>
                                    <p className={`text-[10px] sm:text-xs font-medium uppercase tracking-widest ${isDark ? 'text-neutral-500' : 'text-neutral-400'}`}>{title}</p>
                                </div>
                            </div>
                            <button onClick={() => setShowDescription(false)} className={`p-2 rounded-full transition-all duration-300 active:scale-90 ${isDark ? 'hover:bg-neutral-800 text-neutral-400 hover:text-white' : 'hover:bg-neutral-100 text-neutral-500 hover:text-neutral-900'}`}>
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto w-full flex flex-col gap-6 custom-scrollbar">
                            <div>
                                <h3 className="text-xl font-black mb-1">{title}</h3>
                                <p className={`text-sm font-bold uppercase tracking-widest ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>{author}</p>
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
                            </div>
                            <div className={`p-5 rounded-xl border ${isDark ? 'bg-neutral-900/50 border-neutral-800' : 'bg-neutral-50 border-neutral-200'}`}>
                                <p className={`font-geo-text text-sm leading-relaxed whitespace-pre-wrap ${isDark ? 'text-neutral-300' : 'text-neutral-700'}`}>
                                    {description || (language === 'ka' ? 'აღწერა არ არის მითითებული.' : 'No description provided.')}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Characters Modal */}
            {showCharacters && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4"
                    onClick={e => e.stopPropagation()}
                >
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity duration-300 animate-in fade-in"
                        onClick={() => setShowCharacters(false)}
                    />
                    <div
                        className={`relative w-full max-w-lg max-h-[70vh] overflow-hidden rounded-2xl shadow-2xl border flex flex-col transition-all duration-300 animate-in zoom-in-95 fade-in slide-in-from-bottom-4 ${isDark
                            ? 'bg-[#0a0a0a] border-neutral-800 text-white'
                            : 'bg-white border-neutral-200 text-neutral-900'
                            }`}
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="px-6 py-5 border-b flex items-center justify-between sticky top-0 bg-inherit/90 backdrop-blur-xl z-10 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${isDark ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-600/10 text-blue-600'}`}>
                                    <Users className="w-5 h-5" />
                                </div>
                                <div>
                                    <h2 className="text-base font-black tracking-tight uppercase leading-tight">{t.characters}</h2>
                                    <p className={`text-[10px] sm:text-xs font-medium uppercase tracking-widest ${isDark ? 'text-neutral-500' : 'text-neutral-400'}`}>{title}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowCharacters(false)}
                                className={`p-2 rounded-full transition-all duration-300 active:scale-90 ${isDark ? 'hover:bg-neutral-800 text-neutral-400 hover:text-white' : 'hover:bg-neutral-100 text-neutral-500 hover:text-neutral-900'}`}
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
                                    <div className={`relative w-16 h-16 sm:w-20 sm:h-20 shrink-0 rounded-full overflow-hidden border-2 transition-all duration-500 group-hover:scale-105 group-hover:rotate-3 shadow-lg ${isDark
                                        ? 'border-neutral-800 bg-neutral-900'
                                        : 'border-white bg-neutral-100'
                                        }`}>
                                        {char.imageUrl ? (
                                            <img src={char.imageUrl} alt={char.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-neutral-400">
                                                <Users className="w-8 h-8 opacity-20" />
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-black text-base sm:text-lg mb-0.5 tracking-tight group-hover:text-blue-400 transition-colors uppercase truncate">{char.name}</h3>
                                        <p className={`text-xs sm:text-sm leading-relaxed font-medium line-clamp-3 ${isDark ? 'text-neutral-400' : 'text-neutral-600'}`}>
                                            {char.description}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Chapters Modal */}
            {showChapters && hasChapters && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4"
                    onClick={e => e.stopPropagation()}
                >
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity duration-300 animate-in fade-in"
                        onClick={() => setShowChapters(false)}
                    />
                    <div
                        className={`relative w-full max-w-lg max-h-[70vh] overflow-hidden rounded-2xl shadow-2xl border flex flex-col transition-all duration-300 animate-in zoom-in-95 fade-in slide-in-from-bottom-4 ${isDark
                            ? 'bg-[#0a0a0a] border-neutral-800 text-white'
                            : 'bg-white border-neutral-200 text-neutral-900'
                            }`}
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="px-6 py-5 border-b flex items-center justify-between sticky top-0 bg-inherit/90 backdrop-blur-xl z-10 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${isDark ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-600/10 text-blue-600'}`}>
                                    <BookOpen className="w-5 h-5" />
                                </div>
                                <div>
                                    <h2 className="text-base font-black tracking-tight uppercase leading-tight">{t.chapters}</h2>
                                    <p className={`text-[10px] sm:text-xs font-medium uppercase tracking-widest ${isDark ? 'text-neutral-500' : 'text-neutral-400'}`}>{title}</p>
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
                            {chapters.length === 0 ? (
                                <div className="text-center py-8 text-neutral-500 text-sm">{t.noContent}</div>
                            ) : (
                                chapters.map((chap, idx) => (
                                    <button
                                        key={chap.id}
                                        onClick={() => scrollToChapter(chap.id)}
                                        className={`w-full text-left px-4 py-3 rounded-xl transition-all duration-300 flex items-center gap-4 group ${currentChapterId === chap.id
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
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
            {/* Active Hotspot Character Card (Mobile) */}
            <div className={`lg:hidden fixed inset-x-4 bottom-4 z-[95] transition-all duration-300 ${activeHotspotCharacter ? 'translate-y-0 opacity-100 pointer-events-auto' : 'translate-y-10 opacity-0 pointer-events-none'}`}>
                {activeHotspotCharacter && (
                    <div className={`rounded-2xl border shadow-2xl backdrop-blur-md overflow-hidden max-h-[72vh] flex flex-col ${isDark ? 'bg-[#0a0a0a]/95 border-blue-500/30 text-white' : 'bg-white/95 border-blue-200 text-neutral-900'}`}>
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
                        <div className="p-4 flex gap-3 overflow-y-auto custom-scrollbar">
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
                                <p className={`text-xs leading-relaxed max-h-24 overflow-y-auto pr-1 custom-scrollbar ${isDark ? 'text-neutral-300' : 'text-neutral-700'}`}>
                                    {activeHotspotCharacter.description || (language === 'ka' ? 'აღწერა არ არის მითითებული.' : 'No description provided.')}
                                </p>
                            </div>
                        </div>
                        <div className="px-4 pb-4">
                            <div className="mb-2 flex items-center justify-between">
                                <p className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-neutral-500' : 'text-neutral-400'}`}>
                                    {language === 'ka' ? 'გვერდები' : 'Pages'}
                                </p>
                                <span className={`text-[10px] font-bold ${isDark ? 'text-neutral-500' : 'text-neutral-600'}`}>
                                    {activeHotspotCharacterPages.length}
                                </span>
                            </div>
                            {activeHotspotCharacterPages.length > 0 ? (
                                <div className="flex gap-2 overflow-x-auto snap-x snap-mandatory custom-scrollbar">
                                    {activeHotspotCharacterPages.map((page, idx) => {
                                        const isSelected = activeHotspotSelectedPreviewBlockId === page.blockId;
                                        return (
                                            <button
                                                key={`mobile-${page.blockId}-${idx}`}
                                                type="button"
                                                onClick={() => {
                                                    if (!activeHotspotCharacterId) return;
                                                    setSelectedCharacterPagePreviewById((prev) => ({
                                                        ...prev,
                                                        [activeHotspotCharacterId]: page.blockId,
                                                    }));
                                                }}
                                                aria-label={`Character page ${page.panelIndex}`}
                                                className={`relative shrink-0 w-16 h-12 rounded-md overflow-hidden border-2 snap-start transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/80 ${isSelected
                                                    ? (isDark ? 'border-blue-400 ring-2 ring-blue-400/60' : 'border-blue-500 ring-2 ring-blue-300/70')
                                                    : (isDark ? 'border-neutral-700 hover:border-blue-500/70' : 'border-neutral-300 hover:border-blue-400')
                                                    }`}
                                            >
                                                <img src={page.imageUrl} alt="" className="w-full h-full object-cover" />
                                            </button>
                                        );
                                    })}
                                </div>
                            ) : (
                                <p className={`text-xs ${isDark ? 'text-neutral-500' : 'text-neutral-600'}`}>
                                    {language === 'ka' ? 'ამ პერსონაჟისთვის გვერდები ვერ მოიძებნა.' : 'No pages found for this character.'}
                                </p>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Reader Up/Down Controls */}
            {!loading && blocks.length > 0 && !showDescription && !showCharacters && !showChapters && (
                <div className="fixed right-4 top-1/2 -translate-y-1/2 z-[99] flex flex-col gap-3">
                    <button
                        type="button"
                        onClick={() => jumpToAdjacentBlock('up', 'auto')}
                        disabled={!canScrollUp}
                        aria-label={language === 'ka' ? 'ზემოთ გადაადგილება' : 'Scroll up'}
                        className={`group h-14 min-w-[64px] px-3 rounded-2xl border flex items-center justify-center gap-1.5 transition-all duration-300 backdrop-blur-xl active:scale-95 ${canScrollUp
                            ? isDark
                                ? 'bg-neutral-900/92 border-blue-500/50 text-blue-200 hover:border-blue-300 hover:text-white hover:-translate-y-0.5 shadow-xl shadow-blue-500/20'
                                : 'bg-white/98 border-blue-300 text-blue-700 hover:border-blue-500 hover:text-blue-900 hover:-translate-y-0.5 shadow-xl shadow-blue-900/15'
                            : isDark
                                ? 'bg-neutral-900/75 border-neutral-700 text-neutral-500 cursor-not-allowed opacity-75'
                                : 'bg-white/90 border-neutral-300 text-neutral-400 cursor-not-allowed opacity-80'
                            }`}
                    >
                        <ArrowUp className={`w-5 h-5 transition-transform duration-300 ${canScrollUp ? 'group-hover:-translate-y-0.5' : ''}`} />
                        <span className="text-[11px] font-black tracking-widest uppercase">{language === 'ka' ? 'ზემოთ' : 'Up'}</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => jumpToAdjacentBlock('down', 'auto')}
                        disabled={!canScrollDown}
                        aria-label={language === 'ka' ? 'ქვემოთ გადაადგილება' : 'Scroll down'}
                        className={`group h-14 min-w-[64px] px-3 rounded-2xl border flex items-center justify-center gap-1.5 transition-all duration-300 backdrop-blur-xl active:scale-95 ${canScrollDown
                            ? isDark
                                ? 'bg-blue-600/95 border-blue-300/70 text-white hover:bg-blue-500 hover:border-blue-200 hover:translate-y-0.5 shadow-xl shadow-blue-500/35'
                                : 'bg-blue-600 border-blue-500 text-white hover:bg-blue-500 hover:border-blue-400 hover:translate-y-0.5 shadow-xl shadow-blue-600/35'
                            : isDark
                                ? 'bg-neutral-900/75 border-neutral-700 text-neutral-500 cursor-not-allowed opacity-75'
                                : 'bg-white/90 border-neutral-300 text-neutral-400 cursor-not-allowed opacity-80'
                            }`}
                    >
                        <ArrowDown className={`w-5 h-5 transition-transform duration-300 ${canScrollDown ? 'group-hover:translate-y-0.5' : ''}`} />
                        <span className="text-[11px] font-black tracking-widest uppercase">{language === 'ka' ? 'ქვემოთ' : 'Down'}</span>
                    </button>
                </div>
            )}
            {/* Floating Timer Widget for mobile or sticky side tracking */}
            {user && (
                <div className={`fixed left-0 top-1/2 -translate-y-1/2 z-40 transition-transform duration-300 md:hidden`}>
                    <div className={`flex flex-col items-center justify-center p-2 rounded-r-xl border border-l-0 shadow-lg backdrop-blur-md ${isDark
                        ? 'bg-[#0a0a0a]/80 border-amber-500/20 text-amber-400'
                        : 'bg-white/90 border-amber-200 text-amber-600'
                        }`}>
                        <Clock className="w-4 h-4 mb-1 animate-[spin_4s_linear_infinite] opacity-80" />
                        <span className="text-[10px] font-black uppercase tracking-wider tabular-nums [writing-mode:vertical-lr] rotate-180">
                            {formatTime(readingTime)}
                        </span>
                    </div>
                </div>
            )}

            {/* Desktop Side floating timer alternative (so it stays literally on the left side) */}
            {user && (
                <div className={`hidden md:block fixed left-4 top-1/2 -translate-y-1/2 z-40 transition-transform`}>
                    <div className={`flex flex-col items-center justify-center py-4 px-2.5 rounded-2xl border shadow-xl backdrop-blur-xl ${isDark
                        ? 'bg-neutral-900/60 border-amber-500/20 text-amber-400 shadow-amber-500/5'
                        : 'bg-white/80 border-amber-200 text-amber-600 shadow-amber-500/10'
                        } group hover:scale-105 transition-transform duration-300`}>
                        <Clock className="w-5 h-5 mb-2 group-hover:rotate-180 transition-transform duration-700" />
                        <span className="text-xs font-black tracking-widest tabular-nums [writing-mode:vertical-lr] rotate-180">
                            {formatTime(readingTime)}
                        </span>
                    </div>
                </div>
            )}

        </div>
    );
}
