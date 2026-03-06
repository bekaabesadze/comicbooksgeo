'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { X, Plus, Minus, GripVertical } from 'lucide-react';
import { useComicBlocks, type BubbleOverlay } from './ComicBlockContext';
import { useLanguage } from '@/context/LanguageContext';
import { usePasteNormalize } from '@/lib/pasteNormalize';

const BUBBLE_TYPES: BubbleOverlay['bubbleType'][] = ['bubble1', 'bubble2', 'bubble3', 'bubble4'];

const BUBBLE_LABELS: Record<BubbleOverlay['bubbleType'], string> = {
    bubble1: 'Speech',
    bubble2: 'Round',
    bubble3: 'Shout',
    bubble4: 'Thought',
};

interface BubbleEditorProps {
    blockId: string;
    imageUrl: string;
    onClose: () => void;
}

/* ─── Single Draggable Bubble ─── */

function DraggableBubble({
    bubble,
    blockId,
    containerRef,
}: {
    bubble: BubbleOverlay;
    blockId: string;
    containerRef: React.RefObject<HTMLDivElement | null>;
}) {
    const { updateBubble, removeBubble } = useComicBlocks();
    const [dragging, setDragging] = useState(false);
    const dragOffset = useRef({ x: 0, y: 0 });
    const draggingRef = useRef(false);

    // Call this from the drag handle's onMouseDown
    const startDrag = (e: React.MouseEvent) => {
        if (e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();

        const container = containerRef.current;
        if (!container) return;

        const rect = container.getBoundingClientRect();
        const bubbleX = (bubble.x / 100) * rect.width;
        const bubbleY = (bubble.y / 100) * rect.height;
        dragOffset.current = {
            x: e.clientX - rect.left - bubbleX,
            y: e.clientY - rect.top - bubbleY,
        };

        draggingRef.current = true;
        setDragging(true);

        const onMouseMove = (me: MouseEvent) => {
            if (!draggingRef.current) return;
            const r = container.getBoundingClientRect();
            const newX = ((me.clientX - r.left - dragOffset.current.x) / r.width) * 100;
            const newY = ((me.clientY - r.top - dragOffset.current.y) / r.height) * 100;
            updateBubble(blockId, bubble.id, {
                x: Math.max(0, Math.min(100, newX)),
                y: Math.max(0, Math.min(100, newY)),
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

    // Bubble image sizing based on scale
    const size = 100 * bubble.scale;

    const onPasteBubbleText = usePasteNormalize({
        value: bubble.text,
        onChange: (v) => updateBubble(blockId, bubble.id, { text: v }),
    });

    return (
        <div
            className="absolute group"
            style={{
                left: `${bubble.x}%`,
                top: `${bubble.y}%`,
                transform: 'translate(-50%, -50%)',
                zIndex: dragging ? 50 : 10,
                userSelect: 'none',
            }}
        >
            {/* Bubble Container */}
            <div className="relative" style={{ width: size, height: size }}>
                {/* Bubble Image */}
                <img
                    src={`/bubbles/${bubble.bubbleType}.png`}
                    alt="Speech bubble"
                    className="w-full h-full object-contain pointer-events-none select-none"
                    draggable={false}
                />
                {/* Editable Text Inside Bubble */}
                <textarea
                    value={bubble.text}
                    onChange={(e) => {
                        updateBubble(blockId, bubble.id, { text: e.target.value });
                    }}
                    onPaste={onPasteBubbleText}
                    onPasteCapture={onPasteBubbleText}
                    onMouseDown={(e) => e.stopPropagation()}
                    placeholder="..."
                    className="font-bubble absolute inset-0 text-center bg-transparent text-black font-bold resize-none border-none outline-none overflow-hidden hover:bg-black/5 focus:bg-white/50 transition-colors rounded-lg"
                    style={{
                        fontFamily: 'BPGNinoTall',
                        fontSize: Math.max(8, size * 0.12),
                        padding: `${size * 0.2}px ${size * 0.15}px`,
                        lineHeight: 1.2,
                        cursor: 'text',
                    }}
                />

                {/* Controls (visible on hover) */}
                <div className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 z-20">
                    {/* Drag Handle */}
                    <button
                        onMouseDown={startDrag}
                        className="w-5 h-5 rounded-full bg-neutral-600 text-white flex items-center justify-center hover:bg-neutral-400 transition-colors shadow-md"
                        style={{ cursor: dragging ? 'grabbing' : 'grab' }}
                        title="Drag to move"
                    >
                        <GripVertical className="w-3 h-3" />
                    </button>
                    {/* Scale up */}
                    <button
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                            e.stopPropagation();
                            updateBubble(blockId, bubble.id, { scale: Math.min(3, bubble.scale + 0.2) });
                        }}
                        className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center hover:bg-blue-500 transition-colors shadow-md"
                    >
                        <Plus className="w-3 h-3" />
                    </button>
                    {/* Scale down */}
                    <button
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                            e.stopPropagation();
                            updateBubble(blockId, bubble.id, { scale: Math.max(0.4, bubble.scale - 0.2) });
                        }}
                        className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center hover:bg-blue-500 transition-colors shadow-md"
                    >
                        <Minus className="w-3 h-3" />
                    </button>
                    {/* Delete */}
                    <button
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                            e.stopPropagation();
                            removeBubble(blockId, bubble.id);
                        }}
                        className="w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center hover:bg-red-500 transition-colors shadow-md"
                    >
                        <X className="w-3 h-3" />
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ─── Bubble Editor Panel ─── */

export default function BubbleEditor({ blockId, imageUrl, onClose }: BubbleEditorProps) {
    const { t } = useLanguage();
    const { blocks, addBubble } = useComicBlocks();
    const block = blocks.find(b => b.id === blockId);
    const bubbles = block?.bubbles || [];
    const containerRef = useRef<HTMLDivElement>(null);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-neutral-900 border border-neutral-700 rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between px-6 py-4 border-b border-neutral-800 gap-4 bg-neutral-950/50">
                    <div className="flex items-center gap-4">
                        <h3 className="text-white font-bold text-lg">{t.bubbles}</h3>
                        {/* Bubble Picker */}
                        <div className="flex items-center gap-2 flex-wrap pl-4 border-l border-neutral-800">
                            {BUBBLE_TYPES.map((type) => (
                                <button
                                    key={type}
                                    onClick={() => addBubble(blockId, type)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 hover:border-purple-500/50 text-neutral-300 hover:text-white text-xs font-medium transition-all shadow-sm"
                                    title={`Add ${BUBBLE_LABELS[type]} Bubble`}
                                >
                                    <img
                                        src={`/bubbles/${type}.png`}
                                        alt={BUBBLE_LABELS[type]}
                                        className="w-5 h-5 object-contain drop-shadow-md"
                                    />
                                    <Plus className="w-3 h-3 opacity-50 hidden sm:block" />
                                </button>
                            ))}
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-colors shadow-md whitespace-nowrap"
                    >
                        Done
                    </button>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 overflow-y-auto p-6 bg-neutral-950 flex flex-col items-center">
                    {/* Image + Bubbles Canvas */}
                    <div
                        ref={containerRef}
                        className="relative rounded-lg overflow-hidden border border-neutral-800 bg-black/50 select-none shadow-2xl w-full max-w-3xl ring-1 ring-white/5"
                    >
                        <img
                            src={imageUrl}
                            alt="Block image"
                            className="w-full h-auto max-h-[70vh] object-contain pointer-events-none"
                            draggable={false}
                        />
                        {/* Render Bubbles */}
                        {bubbles.map((bubble) => (
                            <DraggableBubble
                                key={bubble.id}
                                bubble={bubble}
                                blockId={blockId}
                                containerRef={containerRef}
                            />
                        ))}
                    </div>

                    {bubbles.length > 0 && (
                        <p className="mt-4 text-xs font-medium text-neutral-500 uppercase tracking-widest bg-neutral-900 px-4 py-2 rounded-full border border-neutral-800">
                            Hover over bubbles to move, resize, or delete
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
