'use client';

import React, { useRef, useState } from 'react';
import { Crosshair, GripVertical, Minus, Plus, X } from 'lucide-react';
import { useComicBlocks, type CharacterHotspot } from './ComicBlockContext';
import { useLanguage } from '@/context/LanguageContext';

interface CharacterHotspotEditorProps {
    blockId: string;
    imageUrl: string;
    onClose: () => void;
}

function HotspotHandle({
    hotspot,
    blockId,
    containerRef,
}: {
    hotspot: CharacterHotspot;
    blockId: string;
    containerRef: React.RefObject<HTMLDivElement | null>;
}) {
    const { characters, updateCharacterHotspot, removeCharacterHotspot } = useComicBlocks();
    const [dragging, setDragging] = useState(false);
    const dragOffset = useRef({ x: 0, y: 0 });
    const draggingRef = useRef(false);

    const startDrag = (e: React.MouseEvent) => {
        if (e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();

        const container = containerRef.current;
        if (!container) return;

        const rect = container.getBoundingClientRect();
        const hotspotX = (hotspot.x / 100) * rect.width;
        const hotspotY = (hotspot.y / 100) * rect.height;
        dragOffset.current = {
            x: e.clientX - rect.left - hotspotX,
            y: e.clientY - rect.top - hotspotY,
        };

        draggingRef.current = true;
        setDragging(true);

        const onMouseMove = (mouseEvent: MouseEvent) => {
            if (!draggingRef.current) return;

            const bounds = container.getBoundingClientRect();
            const newX = ((mouseEvent.clientX - bounds.left - dragOffset.current.x) / bounds.width) * 100;
            const newY = ((mouseEvent.clientY - bounds.top - dragOffset.current.y) / bounds.height) * 100;

            updateCharacterHotspot(blockId, hotspot.id, {
                x: newX,
                y: newY,
            });
        };

        const onMouseUp = () => {
            draggingRef.current = false;
            setDragging(false);
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    };

    return (
        <div
            className="absolute group"
            style={{
                left: `${hotspot.x}%`,
                top: `${hotspot.y}%`,
                width: `${hotspot.radius * 2}%`,
                minWidth: '26px',
                transform: 'translate(-50%, -50%)',
                zIndex: dragging ? 60 : 30,
            }}
        >
            <div
                className={`w-full aspect-square rounded-full border-2 border-emerald-400 bg-emerald-400/20 shadow-[0_0_0_2px_rgba(0,0,0,0.35)] transition-all ${dragging ? 'scale-105' : ''}`}
            />

            <div className="absolute -top-3 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                <button
                    onMouseDown={startDrag}
                    className="w-6 h-6 rounded-full bg-neutral-800 border border-neutral-600 text-white flex items-center justify-center shadow-md"
                    style={{ cursor: dragging ? 'grabbing' : 'grab' }}
                    title="Drag hotspot"
                >
                    <GripVertical className="w-3.5 h-3.5" />
                </button>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        updateCharacterHotspot(blockId, hotspot.id, { radius: hotspot.radius + 1 });
                    }}
                    className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-md hover:bg-blue-500 transition-colors"
                    title="Increase radius"
                >
                    <Plus className="w-3.5 h-3.5" />
                </button>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        updateCharacterHotspot(blockId, hotspot.id, { radius: hotspot.radius - 1 });
                    }}
                    className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-md hover:bg-blue-500 transition-colors"
                    title="Decrease radius"
                >
                    <Minus className="w-3.5 h-3.5" />
                </button>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        removeCharacterHotspot(blockId, hotspot.id);
                    }}
                    className="w-6 h-6 rounded-full bg-red-600 text-white flex items-center justify-center shadow-md hover:bg-red-500 transition-colors"
                    title="Delete hotspot"
                >
                    <X className="w-3.5 h-3.5" />
                </button>
            </div>

            <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                <select
                    value={hotspot.characterId}
                    onChange={(e) => updateCharacterHotspot(blockId, hotspot.id, { characterId: e.target.value })}
                    className="bg-neutral-900 border border-neutral-700 text-white text-[10px] sm:text-xs rounded-md px-2 py-1 shadow-lg min-w-[130px] max-w-[170px]"
                >
                    {characters.map((character) => (
                        <option key={character.id} value={character.id}>
                            {character.name?.trim() || character.id}
                        </option>
                    ))}
                </select>
            </div>
        </div>
    );
}

export default function CharacterHotspotEditor({ blockId, imageUrl, onClose }: CharacterHotspotEditorProps) {
    const { t } = useLanguage();
    const { blocks, characters, addCharacterHotspot } = useComicBlocks();
    const block = blocks.find((entry) => entry.id === blockId);
    const hotspots = block?.characterHotspots || [];
    const containerRef = useRef<HTMLDivElement>(null);
    const noCharacters = characters.length === 0;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-neutral-900 border border-neutral-700 rounded-2xl max-w-5xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between px-6 py-4 border-b border-neutral-800 gap-4 bg-neutral-950/50">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
                            <Crosshair className="w-4 h-4" />
                        </div>
                        <div>
                            <h3 className="text-white font-bold text-lg">{t.hotspots || 'Hotspots'}</h3>
                            <p className="text-[10px] sm:text-xs text-neutral-500 uppercase tracking-widest">
                                {t.characterHotspotHint || 'Add circles on heads and link each one to a character.'}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => addCharacterHotspot(blockId)}
                            disabled={noCharacters}
                            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors shadow-md"
                        >
                            {t.addHotspot || 'Add Hotspot'}
                        </button>
                        <button
                            onClick={onClose}
                            className="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-colors shadow-md"
                        >
                            {t.applyCrop || 'Done'}
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 bg-neutral-950 flex flex-col items-center gap-4">
                    {noCharacters && (
                        <div className="w-full max-w-3xl rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-300 px-4 py-2 text-xs font-semibold">
                            {t.noCharactersForHotspots || 'Add characters first to create linked hotspots.'}
                        </div>
                    )}

                    <div
                        ref={containerRef}
                        className="relative rounded-lg overflow-hidden border border-neutral-800 bg-black/60 select-none shadow-2xl w-full max-w-3xl ring-1 ring-white/5"
                    >
                        <img
                            src={imageUrl}
                            alt="Block image"
                            className="w-full h-auto max-h-[70vh] object-contain pointer-events-none"
                            draggable={false}
                        />

                        {hotspots.map((hotspot) => (
                            <HotspotHandle
                                key={hotspot.id}
                                hotspot={hotspot}
                                blockId={blockId}
                                containerRef={containerRef}
                            />
                        ))}
                    </div>

                    {hotspots.length > 0 && (
                        <p className="text-xs font-medium text-neutral-500 uppercase tracking-widest bg-neutral-900 px-4 py-2 rounded-full border border-neutral-800">
                            {t.characterHotspotControlHint || 'Hover a circle to move, resize, relink, or delete it.'}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
