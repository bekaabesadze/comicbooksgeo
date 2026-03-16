'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { useLanguage } from '@/context/LanguageContext';

/* ─── Data Model ─── */

export interface CropData {
    x: number;
    y: number;
    width: number;
    height: number;
    unit: '%';
}

export interface BubbleOverlay {
    id: string;
    bubbleType: 'bubble1' | 'bubble2' | 'bubble3' | 'bubble4';
    text: string;
    x: number;  // % from left
    y: number;  // % from top
    scale: number;
}

export interface CharacterHotspot {
    id: string;
    characterId: string;
    x: number; // % from left
    y: number; // % from top
    radius: number; // % of image width
}

export interface CoverTextOverlay {
    id: string;
    text: string;
    x: number;            // % from left
    y: number;            // % from top
    fontSize: number;     // px
    fontFamily: string;
    color: string;        // hex/rgba
    fontWeight: number;   // 100-900
    fontStyle: 'normal' | 'italic';
    textTransform: 'none' | 'uppercase' | 'lowercase';
    letterSpacing: number; // px
    lineHeight: number;    // unitless multiplier
    textAlign: 'left' | 'center' | 'right';
    rotation: number;      // degrees
    opacity: number;       // 0-1
    // Text shadow
    shadowEnabled: boolean;
    shadowColor: string;
    shadowBlur: number;
    shadowOffsetX: number;
    shadowOffsetY: number;
    // Background
    bgEnabled: boolean;
    bgColor: string;
    bgPaddingX: number;
    bgPaddingY: number;
    bgBorderRadius: number;
}

export interface Character {
    id: string;
    name: string;
    description: string;
    imageUrl: string;
}

export interface ComicBlock {
    id: string;
    text: string;
    imageUrl: string;
    croppedImageUrl?: string;
    cropData?: CropData;
    bubbles?: BubbleOverlay[];
    characterHotspots?: CharacterHotspot[];
    chapterTitle?: string;
}

/* ─── Context Type ─── */

interface ComicBlockContextType {
    blocks: ComicBlock[];
    addBlock: () => void;
    addChapter: () => void;
    removeBlock: (id: string) => void;
    updateBlockText: (id: string, text: string) => void;
    updateBlockChapterTitle: (id: string, chapterTitle: string) => void;
    updateBlockImage: (id: string, imageUrl: string) => void;
    updateBlockCrop: (id: string, croppedImageUrl: string, cropData: CropData) => void;
    clearBlockCrop: (id: string) => void;
    addBubble: (blockId: string, bubbleType: BubbleOverlay['bubbleType']) => void;
    updateBubble: (blockId: string, bubbleId: string, changes: Partial<Omit<BubbleOverlay, 'id'>>) => void;
    removeBubble: (blockId: string, bubbleId: string) => void;
    addCharacterHotspot: (blockId: string, characterId?: string) => void;
    updateCharacterHotspot: (blockId: string, hotspotId: string, changes: Partial<Omit<CharacterHotspot, 'id'>>) => void;
    removeCharacterHotspot: (blockId: string, hotspotId: string) => void;
    moveBlockUp: (id: string) => void;
    moveBlockDown: (id: string) => void;
    moveChapter: (chapterId: string, targetChapterId: string) => void;
    // Character functions
    characters: Character[];
    addCharacter: () => void;
    updateCharacter: (id: string, changes: Partial<Omit<Character, 'id'>>) => void;
    removeCharacter: (id: string) => void;
    // Cover text overlay functions
    coverTextOverlays: CoverTextOverlay[];
    addCoverText: () => void;
    updateCoverText: (id: string, changes: Partial<Omit<CoverTextOverlay, 'id'>>) => void;
    removeCoverText: (id: string) => void;
    saveComic: () => Promise<void>;
    publishComic: () => Promise<void>;
    initialDataLoaded: boolean;
    saving: boolean;
    // Metadata
    title: string;
    author: string;
    category: string;
    coverUrl: string;
    rawCoverUrl: string;
    updateMetadata: (changes: { title?: string; author?: string; category?: string; coverUrl?: string; rawCoverUrl?: string }) => void;
}

const ComicBlockContext = createContext<ComicBlockContextType | null>(null);

function generateId(): string {
    return `block_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function generateBubbleId(): string {
    return `bub_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function generateCharacterHotspotId(): string {
    return `hs_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function generateCharacterId(): string {
    return `char_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function generateCoverTextId(): string {
    return `ctxt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

const DEFAULT_COVER_TEXT: Omit<CoverTextOverlay, 'id'> = {
    text: '',
    x: 50,
    y: 20,
    fontSize: 48,
    fontFamily: 'BPGNinoTall',
    color: '#ffffff',
    fontWeight: 700,
    fontStyle: 'normal',
    textTransform: 'none',
    letterSpacing: 0,
    lineHeight: 1.2,
    textAlign: 'center',
    rotation: 0,
    opacity: 1,
    shadowEnabled: true,
    shadowColor: 'rgba(0,0,0,0.7)',
    shadowBlur: 8,
    shadowOffsetX: 2,
    shadowOffsetY: 4,
    bgEnabled: false,
    bgColor: 'rgba(0,0,0,0.5)',
    bgPaddingX: 12,
    bgPaddingY: 8,
    bgBorderRadius: 4,
};

const MAX_HOTSPOTS_PER_BLOCK = 20;
const DEFAULT_HOTSPOT_RADIUS = 6;
const MIN_HOTSPOT_RADIUS = 2;
const MAX_HOTSPOT_RADIUS = 18;

function clampNumber(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, value));
}

function sanitizeCharacterHotspots(
    rawHotspots: unknown,
    validCharacterIds: Set<string>
): CharacterHotspot[] {
    if (!Array.isArray(rawHotspots) || validCharacterIds.size === 0) return [];

    const sanitized: CharacterHotspot[] = [];
    for (const raw of rawHotspots) {
        if (!raw || typeof raw !== 'object') continue;
        const candidate = raw as Record<string, unknown>;
        const id = typeof candidate.id === 'string' && candidate.id.trim()
            ? candidate.id.trim()
            : generateCharacterHotspotId();
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
            id: id.slice(0, 120),
            characterId,
            x: clampNumber(x, 0, 100),
            y: clampNumber(y, 0, 100),
            radius: clampNumber(radius, MIN_HOTSPOT_RADIUS, MAX_HOTSPOT_RADIUS),
        });

        if (sanitized.length >= MAX_HOTSPOTS_PER_BLOCK) break;
    }

    return sanitized;
}

interface ComicBlockProviderProps {
    children: React.ReactNode;
    comicId?: string;
}

export function ComicBlockProvider({ children, comicId }: ComicBlockProviderProps) {
    const { t } = useLanguage();
    const [blocks, setBlocks] = useState<ComicBlock[]>([
        { id: generateId(), text: '', imageUrl: '' },
    ]);
    const [characters, setCharacters] = useState<Character[]>([]);
    const [title, setTitle] = useState('');
    const [author, setAuthor] = useState('');
    const [category, setCategory] = useState('');
    const [coverUrl, setCoverUrl] = useState('');
    const [rawCoverUrl, setRawCoverUrl] = useState('');
    const [coverTextOverlays, setCoverTextOverlays] = useState<CoverTextOverlay[]>([]);
    const [initialDataLoaded, setInitialDataLoaded] = useState(false);
    const [saving, setSaving] = useState(false);

    const { useRouter } = require('next/navigation');
    const router = useRouter();

    // Load existing comic data
    React.useEffect(() => {
        if (!comicId) {
            setInitialDataLoaded(true);
            return;
        }

        const loadComic = async () => {
            try {
                const { db } = await import('@/lib/firebase');
                const { doc, getDocFromServer } = await import('firebase/firestore');

                const docRef = doc(db, 'comics', comicId);
                const docSnap = await getDocFromServer(docRef);

                if (docSnap.exists()) {
                    const data = docSnap.data();
                    const safeCharacters = Array.isArray(data.characters)
                        ? data.characters.filter((char): char is Character => (
                            !!char &&
                            typeof char === 'object' &&
                            typeof (char as Character).id === 'string'
                        ))
                        : [];
                    const validCharacterIds = new Set(safeCharacters.map(char => char.id));

                    if (data.blocks && Array.isArray(data.blocks) && data.blocks.length > 0) {
                        const safeBlocks = data.blocks
                            .filter((block): block is ComicBlock => !!block && typeof block === 'object')
                            .map((block) => ({
                                ...block,
                                characterHotspots: sanitizeCharacterHotspots(block.characterHotspots, validCharacterIds),
                            }));
                        if (safeBlocks.length > 0) {
                            setBlocks(safeBlocks);
                        }
                    }
                    setCharacters(safeCharacters);
                    if (data.title) setTitle(data.title);
                    if (data.author) setAuthor(data.author);
                    if (typeof data.category === 'string') setCategory(data.category);
                    if (data.coverUrl) setCoverUrl(data.coverUrl);
                    if (data.rawCoverUrl) setRawCoverUrl(data.rawCoverUrl);
                    if (Array.isArray(data.coverTextOverlays)) setCoverTextOverlays(data.coverTextOverlays);
                }
                setInitialDataLoaded(true);
            } catch (error) {
                console.error('Error loading comic data:', error);
                setInitialDataLoaded(true);
            }
        };

        loadComic();
    }, [comicId]);

    /* ─── Block CRUD ─── */

    const addBlock = useCallback(() => {
        setBlocks(prev => [...prev, { id: generateId(), text: '', imageUrl: '' }]);
    }, []);

    const addChapter = useCallback(() => {
        setBlocks(prev => [...prev, { id: generateId(), text: '', imageUrl: '', chapterTitle: 'New Chapter' }]);
    }, []);

    const removeBlock = useCallback((id: string) => {
        setBlocks(prev => {
            if (prev.length <= 1) return prev;
            return prev.filter(b => b.id !== id);
        });
    }, []);

    const updateBlockText = useCallback((id: string, text: string) => {
        setBlocks(prev => prev.map(b => (b.id === id ? { ...b, text } : b)));
    }, []);

    const updateBlockChapterTitle = useCallback((id: string, chapterTitle: string) => {
        setBlocks(prev => prev.map(b => (b.id === id ? { ...b, chapterTitle } : b)));
    }, []);

    const updateBlockImage = useCallback((id: string, imageUrl: string) => {
        // When a new image is uploaded, clear any existing crop, bubbles, and character hotspots.
        setBlocks(prev => prev.map(b =>
            b.id === id
                ? { ...b, imageUrl, croppedImageUrl: undefined, cropData: undefined, bubbles: undefined, characterHotspots: undefined }
                : b
        ));
    }, []);

    /* ─── Crop Functions ─── */

    const updateBlockCrop = useCallback((id: string, croppedImageUrl: string, cropData: CropData) => {
        setBlocks(prev => prev.map(b =>
            b.id === id ? { ...b, croppedImageUrl, cropData } : b
        ));
    }, []);

    const clearBlockCrop = useCallback((id: string) => {
        setBlocks(prev => prev.map(b =>
            b.id === id ? { ...b, croppedImageUrl: undefined, cropData: undefined } : b
        ));
    }, []);

    /* ─── Bubble Functions ─── */

    const addBubble = useCallback((blockId: string, bubbleType: BubbleOverlay['bubbleType']) => {
        setBlocks(prev => prev.map(b => {
            if (b.id !== blockId) return b;
            const newBubble: BubbleOverlay = {
                id: generateBubbleId(),
                bubbleType,
                text: '',
                x: 50,
                y: 50,
                scale: 1,
            };
            return { ...b, bubbles: [...(b.bubbles || []), newBubble] };
        }));
    }, []);

    const updateBubble = useCallback((blockId: string, bubbleId: string, changes: Partial<Omit<BubbleOverlay, 'id'>>) => {
        setBlocks(prev => prev.map(b => {
            if (b.id !== blockId) return b;
            return {
                ...b,
                bubbles: (b.bubbles || []).map(bub =>
                    bub.id === bubbleId ? { ...bub, ...changes } : bub
                ),
            };
        }));
    }, []);

    const removeBubble = useCallback((blockId: string, bubbleId: string) => {
        setBlocks(prev => prev.map(b => {
            if (b.id !== blockId) return b;
            return { ...b, bubbles: (b.bubbles || []).filter(bub => bub.id !== bubbleId) };
        }));
    }, []);

    /* ─── Character Hotspot Functions ─── */

    const addCharacterHotspot = useCallback((blockId: string, characterId?: string) => {
        setBlocks(prev => prev.map(block => {
            if (block.id !== blockId) return block;

            const validCharacterIds = new Set(characters.map(char => char.id));
            const fallbackCharacterId = characters[0]?.id;
            const chosenCharacterId = (characterId && validCharacterIds.has(characterId))
                ? characterId
                : fallbackCharacterId;

            if (!chosenCharacterId || !validCharacterIds.has(chosenCharacterId)) return block;

            const currentHotspots = sanitizeCharacterHotspots(block.characterHotspots, validCharacterIds);
            if (currentHotspots.length >= MAX_HOTSPOTS_PER_BLOCK) return block;

            const newHotspot: CharacterHotspot = {
                id: generateCharacterHotspotId(),
                characterId: chosenCharacterId,
                x: 50,
                y: 50,
                radius: DEFAULT_HOTSPOT_RADIUS,
            };

            return { ...block, characterHotspots: [...currentHotspots, newHotspot] };
        }));
    }, [characters]);

    const updateCharacterHotspot = useCallback((
        blockId: string,
        hotspotId: string,
        changes: Partial<Omit<CharacterHotspot, 'id'>>
    ) => {
        if (!hotspotId) return;

        setBlocks(prev => prev.map(block => {
            if (block.id !== blockId) return block;

            const validCharacterIds = new Set(characters.map(char => char.id));
            const currentHotspots = sanitizeCharacterHotspots(block.characterHotspots, validCharacterIds);

            const updatedHotspots = currentHotspots.map((hotspot) => {
                if (hotspot.id !== hotspotId) return hotspot;

                let nextCharacterId = hotspot.characterId;
                if (changes.characterId !== undefined) {
                    const requestedCharacterId = typeof changes.characterId === 'string'
                        ? changes.characterId.trim()
                        : '';
                    if (validCharacterIds.has(requestedCharacterId)) {
                        nextCharacterId = requestedCharacterId;
                    }
                }

                const nextX = changes.x !== undefined && Number.isFinite(changes.x)
                    ? clampNumber(changes.x, 0, 100)
                    : hotspot.x;
                const nextY = changes.y !== undefined && Number.isFinite(changes.y)
                    ? clampNumber(changes.y, 0, 100)
                    : hotspot.y;
                const nextRadius = changes.radius !== undefined && Number.isFinite(changes.radius)
                    ? clampNumber(changes.radius, MIN_HOTSPOT_RADIUS, MAX_HOTSPOT_RADIUS)
                    : hotspot.radius;

                return {
                    ...hotspot,
                    characterId: nextCharacterId,
                    x: nextX,
                    y: nextY,
                    radius: nextRadius,
                };
            });

            return { ...block, characterHotspots: updatedHotspots };
        }));
    }, [characters]);

    const removeCharacterHotspot = useCallback((blockId: string, hotspotId: string) => {
        setBlocks(prev => prev.map(block => {
            if (block.id !== blockId) return block;
            const remaining = (block.characterHotspots || []).filter(hotspot => hotspot.id !== hotspotId);
            return { ...block, characterHotspots: remaining.length > 0 ? remaining : undefined };
        }));
    }, []);

    /* ─── Reorder ─── */

    const moveBlockUp = useCallback((id: string) => {
        setBlocks(prev => {
            const idx = prev.findIndex(b => b.id === id);
            if (idx <= 0) return prev;
            const next = [...prev];
            [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
            return next;
        });
    }, []);

    const moveBlockDown = useCallback((id: string) => {
        setBlocks(prev => {
            const idx = prev.findIndex(b => b.id === id);
            if (idx === -1 || idx >= prev.length - 1) return prev;
            const next = [...prev];
            [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
            return next;
        });
    }, []);

    const moveChapter = useCallback((chapterId: string, targetChapterId: string) => {
        if (!chapterId || !targetChapterId || chapterId === targetChapterId) return;

        setBlocks(prev => {
            const chapterStarts = prev
                .map((block, index) =>
                    block.chapterTitle && block.chapterTitle.trim()
                        ? { id: block.id, index }
                        : null
                )
                .filter((entry): entry is { id: string; index: number } => entry !== null);

            const fromMeta = chapterStarts.find(entry => entry.id === chapterId);
            const toMeta = chapterStarts.find(entry => entry.id === targetChapterId);
            if (!fromMeta || !toMeta) return prev;

            const fromOrderIndex = chapterStarts.findIndex(entry => entry.id === chapterId);
            const fromStart = fromMeta.index;
            const fromEnd = fromOrderIndex < chapterStarts.length - 1
                ? chapterStarts[fromOrderIndex + 1].index
                : prev.length;

            const chapterSegment = prev.slice(fromStart, fromEnd);
            const remaining = [...prev.slice(0, fromStart), ...prev.slice(fromEnd)];
            const insertAt = remaining.findIndex(block => block.id === targetChapterId);
            if (insertAt === -1) return prev;

            return [
                ...remaining.slice(0, insertAt),
                ...chapterSegment,
                ...remaining.slice(insertAt),
            ];
        });
    }, []);

    /* ─── Character Functions ─── */

    const addCharacter = useCallback(() => {
        setCharacters(prev => [...prev, { id: generateCharacterId(), name: '', description: '', imageUrl: '' }]);
    }, []);

    const updateCharacter = useCallback((id: string, changes: Partial<Omit<Character, 'id'>>) => {
        setCharacters(prev => prev.map(c => (c.id === id ? { ...c, ...changes } : c)));
    }, []);

    const removeCharacter = useCallback((id: string) => {
        setCharacters(prev => prev.filter(c => c.id !== id));
        setBlocks(prev => prev.map(block => {
            const remaining = (block.characterHotspots || []).filter(hotspot => hotspot.characterId !== id);
            return { ...block, characterHotspots: remaining.length > 0 ? remaining : undefined };
        }));
    }, []);

    const updateMetadata = useCallback((changes: { title?: string; author?: string; category?: string; coverUrl?: string; rawCoverUrl?: string }) => {
        if (changes.title !== undefined) setTitle(changes.title);
        if (changes.author !== undefined) setAuthor(changes.author);
        if (changes.category !== undefined) setCategory(changes.category);
        if (changes.coverUrl !== undefined) setCoverUrl(changes.coverUrl);
        if (changes.rawCoverUrl !== undefined) setRawCoverUrl(changes.rawCoverUrl);
    }, []);

    /* ── Cover Text Overlay Functions ── */

    const addCoverText = useCallback(() => {
        setCoverTextOverlays(prev => [
            ...prev,
            { ...DEFAULT_COVER_TEXT, id: generateCoverTextId() },
        ]);
    }, []);

    const updateCoverText = useCallback((id: string, changes: Partial<Omit<CoverTextOverlay, 'id'>>) => {
        setCoverTextOverlays(prev => prev.map(t => (t.id === id ? { ...t, ...changes } : t)));
    }, []);

    const removeCoverText = useCallback((id: string) => {
        setCoverTextOverlays(prev => prev.filter(t => t.id !== id));
    }, []);

    /* ─── Save / Publish ─── */

    // Firestore rejects `undefined` values strictly at any nesting level.
    // This helper recursively strips all `undefined` properties from an object/array.
    const cleanObject = <T,>(obj: T): T => {
        if (obj === null || obj === undefined) return obj;
        if (Array.isArray(obj)) {
            return obj.map(cleanObject).filter(v => v !== undefined) as unknown as T;
        }
        if (typeof obj === 'object') {
            const cleaned: Record<string, any> = {};
            for (const [key, value] of Object.entries(obj)) {
                if (value !== undefined) {
                    cleaned[key] = cleanObject(value);
                }
            }
            return cleaned as T;
        }
        return obj;
    };

    const sanitizeBlocks = (raw: ComicBlock[], validCharacterIds: Set<string>) => cleanObject(
        raw.map((block) => ({
            ...block,
            characterHotspots: sanitizeCharacterHotspots(block.characterHotspots, validCharacterIds),
        }))
    );

    const saveComic = useCallback(async () => {
        setSaving(true);
        try {
            const { db } = await import('@/lib/firebase');
            const { doc, updateDoc, serverTimestamp, collection, addDoc } = await import('firebase/firestore');
            const validCharacterIds = new Set(characters.map(char => char.id));

            const payload = {
                blocks: sanitizeBlocks(blocks, validCharacterIds),
                characters: cleanObject(characters as any),
                title,
                author,
                category,
                coverUrl,
                rawCoverUrl,
                coverTextOverlays: cleanObject(coverTextOverlays),
                updatedAt: serverTimestamp(),
            };

            if (comicId) {
                const docRef = doc(db, 'comics', comicId);
                await updateDoc(docRef, payload);
                alert(t.successSave);
            } else {
                const fullPayload = {
                    ...payload,
                    isPublished: false,
                    createdAt: serverTimestamp(),
                };
                const docRef = await addDoc(collection(db, 'comics'), fullPayload);
                alert(`${t.successSave} ID: ${docRef.id}`);
                router.push('/admin');
            }
        } catch (error) {
            console.error('Error saving to Firebase:', error);
            alert(t.failedSave);
        } finally {
            setSaving(false);
        }
    }, [blocks, characters, title, author, category, coverUrl, rawCoverUrl, coverTextOverlays, comicId, router, t]);

    const publishComic = useCallback(async () => {
        if (!comicId) return;
        setSaving(true);
        try {
            const { db } = await import('@/lib/firebase');
            const { doc, updateDoc, serverTimestamp } = await import('firebase/firestore');
            const validCharacterIds = new Set(characters.map(char => char.id));

            const docRef = doc(db, 'comics', comicId);
            await updateDoc(docRef, {
                blocks: sanitizeBlocks(blocks, validCharacterIds),
                characters: cleanObject(characters as any),
                title,
                author,
                category,
                coverUrl,
                rawCoverUrl,
                coverTextOverlays: cleanObject(coverTextOverlays),
                isPublished: true,
                updatedAt: serverTimestamp(),
            });

            alert(t.successPublish);
            router.push('/admin');
        } catch (error) {
            console.error('Error publishing to Firebase:', error);
            alert(t.failedPublish);
        } finally {
            setSaving(false);
        }
    }, [blocks, characters, title, author, category, coverUrl, rawCoverUrl, coverTextOverlays, comicId, router, t]);

    return (
        <ComicBlockContext.Provider
            value={{
                blocks,
                addBlock,
                addChapter,
                removeBlock,
                updateBlockText,
                updateBlockChapterTitle,
                updateBlockImage,
                updateBlockCrop,
                clearBlockCrop,
                addBubble,
                updateBubble,
                removeBubble,
                addCharacterHotspot,
                updateCharacterHotspot,
                removeCharacterHotspot,
                moveBlockUp,
                moveBlockDown,
                moveChapter,
                characters,
                addCharacter,
                updateCharacter,
                removeCharacter,
                coverTextOverlays,
                addCoverText,
                updateCoverText,
                removeCoverText,
                saveComic,
                publishComic,
                initialDataLoaded,
                saving,
                title,
                author,
                category,
                coverUrl,
                rawCoverUrl,
                updateMetadata,
            }}
        >
            {children}
        </ComicBlockContext.Provider>
    );
}

export function useComicBlocks() {
    const context = useContext(ComicBlockContext);
    if (!context) throw new Error('useComicBlocks must be used within ComicBlockProvider');
    return context;
}
