'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { X, Plus, Trash2, Type, Bold, Italic, AlignLeft, AlignCenter, AlignRight, RotateCw, Eye } from 'lucide-react';
import { useComicBlocks, CoverTextOverlay } from './ComicBlockContext';
import { useLanguage } from '@/context/LanguageContext';

const FONT_OPTIONS = [
    { value: 'BPGNinoTall', label: 'BPG Nino Tall' },
    { value: 'GeoText', label: 'Geo Text' },
    { value: 'Georgia, serif', label: 'Georgia' },
    { value: 'Impact, sans-serif', label: 'Impact' },
    { value: 'Arial Black, sans-serif', label: 'Arial Black' },
    { value: 'Helvetica, sans-serif', label: 'Helvetica' },
    { value: 'Times New Roman, serif', label: 'Times New Roman' },
    { value: 'Courier New, monospace', label: 'Courier New' },
];

interface CoverTextEditorProps {
    imageUrl: string;
    onClose: () => void;
}

export default function CoverTextEditor({ imageUrl, onClose }: CoverTextEditorProps) {
    const { t } = useLanguage();
    const { coverTextOverlays, addCoverText, updateCoverText, removeCoverText } = useComicBlocks();
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const canvasRef = useRef<HTMLDivElement>(null);
    const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);

    const selectedOverlay = coverTextOverlays.find(o => o.id === selectedId) || null;

    // Auto-select first overlay if none selected
    useEffect(() => {
        if (!selectedId && coverTextOverlays.length > 0) {
            setSelectedId(coverTextOverlays[0].id);
        }
    }, [coverTextOverlays, selectedId]);

    const handleAddText = () => {
        addCoverText();
        // Select will happen via useEffect
        setSelectedId(null);
    };

    const handleDelete = (id: string) => {
        removeCoverText(id);
        if (selectedId === id) {
            const remaining = coverTextOverlays.filter(o => o.id !== id);
            setSelectedId(remaining.length > 0 ? remaining[0].id : null);
        }
    };

    /* ─── Drag Logic ─── */
    const handleMouseDown = useCallback((e: React.MouseEvent, overlay: CoverTextOverlay) => {
        e.preventDefault();
        e.stopPropagation();
        setSelectedId(overlay.id);
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;
        dragRef.current = {
            startX: e.clientX,
            startY: e.clientY,
            origX: overlay.x,
            origY: overlay.y,
        };

        const handleMouseMove = (ev: MouseEvent) => {
            if (!dragRef.current || !rect) return;
            const dx = ((ev.clientX - dragRef.current.startX) / rect.width) * 100;
            const dy = ((ev.clientY - dragRef.current.startY) / rect.height) * 100;
            const newX = Math.max(0, Math.min(100, dragRef.current.origX + dx));
            const newY = Math.max(0, Math.min(100, dragRef.current.origY + dy));
            updateCoverText(overlay.id, { x: newX, y: newY });
        };

        const handleMouseUp = () => {
            dragRef.current = null;
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    }, [updateCoverText]);

    /* ─── Touch Drag ─── */
    const handleTouchStart = useCallback((e: React.TouchEvent, overlay: CoverTextOverlay) => {
        e.stopPropagation();
        setSelectedId(overlay.id);
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;
        const touch = e.touches[0];
        dragRef.current = {
            startX: touch.clientX,
            startY: touch.clientY,
            origX: overlay.x,
            origY: overlay.y,
        };

        const handleTouchMove = (ev: TouchEvent) => {
            ev.preventDefault();
            if (!dragRef.current || !rect) return;
            const t = ev.touches[0];
            const dx = ((t.clientX - dragRef.current.startX) / rect.width) * 100;
            const dy = ((t.clientY - dragRef.current.startY) / rect.height) * 100;
            const newX = Math.max(0, Math.min(100, dragRef.current.origX + dx));
            const newY = Math.max(0, Math.min(100, dragRef.current.origY + dy));
            updateCoverText(overlay.id, { x: newX, y: newY });
        };

        const handleTouchEnd = () => {
            dragRef.current = null;
            window.removeEventListener('touchmove', handleTouchMove);
            window.removeEventListener('touchend', handleTouchEnd);
        };

        window.addEventListener('touchmove', handleTouchMove, { passive: false });
        window.addEventListener('touchend', handleTouchEnd);
    }, [updateCoverText]);

    /* ─── Helper: update selected ─── */
    const update = (changes: Partial<Omit<CoverTextOverlay, 'id'>>) => {
        if (selectedId) updateCoverText(selectedId, changes);
    };

    return (
        <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-neutral-900 border-b border-neutral-800 shrink-0">
                <div className="flex items-center gap-3">
                    <Type className="w-5 h-5 text-blue-400" />
                    <h2 className="text-white font-bold text-sm">{(t as any).editCoverText || 'Edit Cover Text'}</h2>
                    <span className="text-neutral-500 text-xs">{coverTextOverlays.length} {coverTextOverlays.length === 1 ? 'layer' : 'layers'}</span>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={handleAddText} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-colors">
                        <Plus className="w-3.5 h-3.5" />
                        {(t as any).addText || 'Add Text'}
                    </button>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>
            </div>

            <div className="flex flex-1 min-h-0 overflow-hidden">
                {/* Canvas Area */}
                <div className="flex-1 flex items-center justify-center p-4 overflow-auto">
                    <div ref={canvasRef} className="relative inline-block max-w-full max-h-full shadow-2xl rounded-lg overflow-hidden" onClick={() => setSelectedId(null)}>
                        <img src={imageUrl} alt="Cover" className="max-w-full max-h-[calc(100vh-120px)] object-contain select-none pointer-events-none" draggable={false} />

                        {/* Text Overlays */}
                        {coverTextOverlays.map(overlay => {
                            const isSelected = overlay.id === selectedId;
                            const shadowStyle = overlay.shadowEnabled
                                ? `${overlay.shadowOffsetX}px ${overlay.shadowOffsetY}px ${overlay.shadowBlur}px ${overlay.shadowColor}`
                                : 'none';

                            return (
                                <div
                                    key={overlay.id}
                                    className={`absolute cursor-move select-none ${isSelected ? 'ring-2 ring-blue-500 ring-offset-1 ring-offset-transparent' : 'hover:ring-1 hover:ring-white/30'}`}
                                    style={{
                                        left: `${overlay.x}%`,
                                        top: `${overlay.y}%`,
                                        transform: `translate(-50%, -50%) rotate(${overlay.rotation}deg)`,
                                        zIndex: isSelected ? 50 : 10,
                                    }}
                                    onMouseDown={(e) => handleMouseDown(e, overlay)}
                                    onTouchStart={(e) => handleTouchStart(e, overlay)}
                                    onClick={(e) => { e.stopPropagation(); setSelectedId(overlay.id); }}
                                >
                                    {overlay.bgEnabled && (
                                        <div
                                            className="absolute inset-0 pointer-events-none"
                                            style={{
                                                background: overlay.bgColor,
                                                borderRadius: overlay.bgBorderRadius,
                                                margin: `-${overlay.bgPaddingY}px -${overlay.bgPaddingX}px`,
                                                padding: `${overlay.bgPaddingY}px ${overlay.bgPaddingX}px`,
                                            }}
                                        />
                                    )}
                                    <span
                                        style={{
                                            fontFamily: overlay.fontFamily,
                                            fontSize: overlay.fontSize,
                                            fontWeight: overlay.fontWeight,
                                            fontStyle: overlay.fontStyle,
                                            color: overlay.color,
                                            textTransform: overlay.textTransform,
                                            letterSpacing: overlay.letterSpacing,
                                            lineHeight: overlay.lineHeight,
                                            textAlign: overlay.textAlign,
                                            opacity: overlay.opacity,
                                            textShadow: shadowStyle,
                                            whiteSpace: 'pre',
                                            display: 'block',
                                            position: 'relative',
                                        }}
                                    >
                                        {overlay.text || (isSelected ? '…' : '')}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Control Panel */}
                <div className="w-80 bg-neutral-900 border-l border-neutral-800 overflow-y-auto shrink-0 custom-scrollbar">
                    {selectedOverlay ? (
                        <div className="p-4 space-y-4">
                            {/* Layer List */}
                            <div>
                                <label className="block text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-2">Layers</label>
                                <div className="space-y-1">
                                    {coverTextOverlays.map((o, i) => (
                                        <div
                                            key={o.id}
                                            className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer text-xs transition-colors ${o.id === selectedId ? 'bg-blue-500/15 text-blue-300 border border-blue-500/30' : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 border border-transparent'}`}
                                            onClick={() => setSelectedId(o.id)}
                                        >
                                            <Type className="w-3 h-3 shrink-0" />
                                            <span className="truncate flex-1 font-medium">{o.text || `Text ${i + 1}`}</span>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleDelete(o.id); }}
                                                className="p-0.5 hover:text-red-400 transition-colors shrink-0"
                                            >
                                                <Trash2 className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="border-t border-neutral-800 pt-4">
                                {/* Text Input */}
                                <label className="block text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-1.5">{(t as any).text || 'Text'}</label>
                                <textarea
                                    value={selectedOverlay.text}
                                    onChange={(e) => update({ text: e.target.value })}
                                    placeholder="Enter text…"
                                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-white text-sm focus:outline-none focus:border-blue-500/50 resize-y min-h-[60px]"
                                    style={{ fontFamily: selectedOverlay.fontFamily }}
                                />
                            </div>

                            {/* Font Family */}
                            <div>
                                <label className="block text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-1.5">{(t as any).fontFamily || 'Font'}</label>
                                <select
                                    value={selectedOverlay.fontFamily}
                                    onChange={(e) => update({ fontFamily: e.target.value })}
                                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-white text-sm focus:outline-none focus:border-blue-500/50"
                                >
                                    {FONT_OPTIONS.map(f => (
                                        <option key={f.value} value={f.value}>{f.label}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Font Size */}
                            <div>
                                <label className="block text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-1.5">{(t as any).fontSize || 'Size'} — {selectedOverlay.fontSize}px</label>
                                <input type="range" min={8} max={200} value={selectedOverlay.fontSize} onChange={(e) => update({ fontSize: Number(e.target.value) })} className="w-full accent-blue-500" />
                            </div>

                            {/* Color */}
                            <div>
                                <label className="block text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-1.5">Color</label>
                                <div className="flex items-center gap-2">
                                    <input type="color" value={selectedOverlay.color.startsWith('#') ? selectedOverlay.color : '#ffffff'} onChange={(e) => update({ color: e.target.value })} className="w-8 h-8 rounded border border-neutral-700 cursor-pointer bg-transparent" />
                                    <input type="text" value={selectedOverlay.color} onChange={(e) => update({ color: e.target.value })} className="flex-1 bg-neutral-950 border border-neutral-800 rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none focus:border-blue-500/50" />
                                </div>
                            </div>

                            {/* Font Weight & Style */}
                            <div className="flex gap-3">
                                <div className="flex-1">
                                    <label className="block text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-1.5">{(t as any).fontWeight || 'Weight'} — {selectedOverlay.fontWeight}</label>
                                    <input type="range" min={100} max={900} step={100} value={selectedOverlay.fontWeight} onChange={(e) => update({ fontWeight: Number(e.target.value) })} className="w-full accent-blue-500" />
                                </div>
                                <div className="shrink-0 flex flex-col items-center gap-1">
                                    <label className="block text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-1">Style</label>
                                    <div className="flex gap-1">
                                        <button
                                            onClick={() => update({ fontWeight: selectedOverlay.fontWeight >= 700 ? 400 : 700 })}
                                            className={`p-1.5 rounded ${selectedOverlay.fontWeight >= 700 ? 'bg-blue-500/20 text-blue-400' : 'text-neutral-500 hover:text-neutral-300'}`}
                                        >
                                            <Bold className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            onClick={() => update({ fontStyle: selectedOverlay.fontStyle === 'italic' ? 'normal' : 'italic' })}
                                            className={`p-1.5 rounded ${selectedOverlay.fontStyle === 'italic' ? 'bg-blue-500/20 text-blue-400' : 'text-neutral-500 hover:text-neutral-300'}`}
                                        >
                                            <Italic className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Text Align */}
                            <div>
                                <label className="block text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-1.5">Align</label>
                                <div className="flex gap-1">
                                    {[{ v: 'left' as const, I: AlignLeft }, { v: 'center' as const, I: AlignCenter }, { v: 'right' as const, I: AlignRight }].map(({ v, I }) => (
                                        <button
                                            key={v}
                                            onClick={() => update({ textAlign: v })}
                                            className={`p-1.5 rounded ${selectedOverlay.textAlign === v ? 'bg-blue-500/20 text-blue-400' : 'text-neutral-500 hover:text-neutral-300'}`}
                                        >
                                            <I className="w-3.5 h-3.5" />
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Text Transform */}
                            <div>
                                <label className="block text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-1.5">Transform</label>
                                <div className="flex gap-1">
                                    {(['none', 'uppercase', 'lowercase'] as const).map(v => (
                                        <button
                                            key={v}
                                            onClick={() => update({ textTransform: v })}
                                            className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${selectedOverlay.textTransform === v ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'text-neutral-500 border border-neutral-800 hover:text-neutral-300'}`}
                                        >
                                            {v === 'none' ? 'Aa' : v === 'uppercase' ? 'AA' : 'aa'}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Letter Spacing */}
                            <div>
                                <label className="block text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-1.5">{(t as any).letterSpacing || 'Spacing'} — {selectedOverlay.letterSpacing}px</label>
                                <input type="range" min={-5} max={30} step={0.5} value={selectedOverlay.letterSpacing} onChange={(e) => update({ letterSpacing: Number(e.target.value) })} className="w-full accent-blue-500" />
                            </div>

                            {/* Line Height */}
                            <div>
                                <label className="block text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-1.5">Line Height — {selectedOverlay.lineHeight.toFixed(1)}</label>
                                <input type="range" min={0.5} max={3} step={0.1} value={selectedOverlay.lineHeight} onChange={(e) => update({ lineHeight: Number(e.target.value) })} className="w-full accent-blue-500" />
                            </div>

                            {/* Rotation */}
                            <div>
                                <label className="flex items-center gap-1 text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-1.5">
                                    <RotateCw className="w-3 h-3" /> Rotation — {selectedOverlay.rotation}°
                                </label>
                                <input type="range" min={-180} max={180} value={selectedOverlay.rotation} onChange={(e) => update({ rotation: Number(e.target.value) })} className="w-full accent-blue-500" />
                            </div>

                            {/* Opacity */}
                            <div>
                                <label className="flex items-center gap-1 text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-1.5">
                                    <Eye className="w-3 h-3" /> {(t as any).textOpacity || 'Opacity'} — {Math.round(selectedOverlay.opacity * 100)}%
                                </label>
                                <input type="range" min={0} max={1} step={0.05} value={selectedOverlay.opacity} onChange={(e) => update({ opacity: Number(e.target.value) })} className="w-full accent-blue-500" />
                            </div>

                            {/* Shadow Section */}
                            <div className="border-t border-neutral-800 pt-4">
                                <div className="flex items-center justify-between mb-3">
                                    <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">{(t as any).textShadow || 'Shadow'}</label>
                                    <button
                                        onClick={() => update({ shadowEnabled: !selectedOverlay.shadowEnabled })}
                                        className={`w-9 h-5 rounded-full transition-colors relative ${selectedOverlay.shadowEnabled ? 'bg-blue-600' : 'bg-neutral-700'}`}
                                    >
                                        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform shadow ${selectedOverlay.shadowEnabled ? 'left-[18px]' : 'left-0.5'}`} />
                                    </button>
                                </div>
                                {selectedOverlay.shadowEnabled && (
                                    <div className="space-y-3 pl-1">
                                        <div>
                                            <label className="block text-[10px] text-neutral-600 mb-1">Color</label>
                                            <div className="flex items-center gap-2">
                                                <input type="color" value={selectedOverlay.shadowColor.startsWith('#') ? selectedOverlay.shadowColor : '#000000'} onChange={(e) => update({ shadowColor: e.target.value })} className="w-6 h-6 rounded cursor-pointer bg-transparent border border-neutral-700" />
                                                <input type="text" value={selectedOverlay.shadowColor} onChange={(e) => update({ shadowColor: e.target.value })} className="flex-1 bg-neutral-950 border border-neutral-800 rounded px-2 py-1 text-white text-[10px] focus:outline-none" />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] text-neutral-600 mb-1">Blur — {selectedOverlay.shadowBlur}px</label>
                                            <input type="range" min={0} max={50} value={selectedOverlay.shadowBlur} onChange={(e) => update({ shadowBlur: Number(e.target.value) })} className="w-full accent-blue-500" />
                                        </div>
                                        <div className="flex gap-3">
                                            <div className="flex-1">
                                                <label className="block text-[10px] text-neutral-600 mb-1">Offset X — {selectedOverlay.shadowOffsetX}px</label>
                                                <input type="range" min={-30} max={30} value={selectedOverlay.shadowOffsetX} onChange={(e) => update({ shadowOffsetX: Number(e.target.value) })} className="w-full accent-blue-500" />
                                            </div>
                                            <div className="flex-1">
                                                <label className="block text-[10px] text-neutral-600 mb-1">Offset Y — {selectedOverlay.shadowOffsetY}px</label>
                                                <input type="range" min={-30} max={30} value={selectedOverlay.shadowOffsetY} onChange={(e) => update({ shadowOffsetY: Number(e.target.value) })} className="w-full accent-blue-500" />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Background Section */}
                            <div className="border-t border-neutral-800 pt-4">
                                <div className="flex items-center justify-between mb-3">
                                    <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">{(t as any).textBackground || 'Background'}</label>
                                    <button
                                        onClick={() => update({ bgEnabled: !selectedOverlay.bgEnabled })}
                                        className={`w-9 h-5 rounded-full transition-colors relative ${selectedOverlay.bgEnabled ? 'bg-blue-600' : 'bg-neutral-700'}`}
                                    >
                                        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform shadow ${selectedOverlay.bgEnabled ? 'left-[18px]' : 'left-0.5'}`} />
                                    </button>
                                </div>
                                {selectedOverlay.bgEnabled && (
                                    <div className="space-y-3 pl-1">
                                        <div>
                                            <label className="block text-[10px] text-neutral-600 mb-1">Color</label>
                                            <div className="flex items-center gap-2">
                                                <input type="color" value={selectedOverlay.bgColor.startsWith('#') ? selectedOverlay.bgColor : '#000000'} onChange={(e) => update({ bgColor: e.target.value })} className="w-6 h-6 rounded cursor-pointer bg-transparent border border-neutral-700" />
                                                <input type="text" value={selectedOverlay.bgColor} onChange={(e) => update({ bgColor: e.target.value })} className="flex-1 bg-neutral-950 border border-neutral-800 rounded px-2 py-1 text-white text-[10px] focus:outline-none" />
                                            </div>
                                        </div>
                                        <div className="flex gap-3">
                                            <div className="flex-1">
                                                <label className="block text-[10px] text-neutral-600 mb-1">Padding X — {selectedOverlay.bgPaddingX}px</label>
                                                <input type="range" min={0} max={60} value={selectedOverlay.bgPaddingX} onChange={(e) => update({ bgPaddingX: Number(e.target.value) })} className="w-full accent-blue-500" />
                                            </div>
                                            <div className="flex-1">
                                                <label className="block text-[10px] text-neutral-600 mb-1">Padding Y — {selectedOverlay.bgPaddingY}px</label>
                                                <input type="range" min={0} max={60} value={selectedOverlay.bgPaddingY} onChange={(e) => update({ bgPaddingY: Number(e.target.value) })} className="w-full accent-blue-500" />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] text-neutral-600 mb-1">Radius — {selectedOverlay.bgBorderRadius}px</label>
                                            <input type="range" min={0} max={30} value={selectedOverlay.bgBorderRadius} onChange={(e) => update({ bgBorderRadius: Number(e.target.value) })} className="w-full accent-blue-500" />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-neutral-600 p-8 text-center">
                            <Type className="w-10 h-10 mb-3 text-neutral-700" />
                            <p className="text-sm font-medium mb-1">{(t as any).coverTextHint || 'No text layers yet'}</p>
                            <p className="text-xs text-neutral-700 mb-4">Click &quot;Add Text&quot; to place text on your cover</p>
                            <button onClick={handleAddText} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-colors">
                                <Plus className="w-3.5 h-3.5" />
                                {(t as any).addText || 'Add Text'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
