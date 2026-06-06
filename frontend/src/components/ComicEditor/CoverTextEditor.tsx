'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { X, Plus, Trash2, Type, Bold, Italic, AlignLeft, AlignCenter, AlignRight, Palette, Sparkles, Layers, Shield, PanelRight } from 'lucide-react';
import { useComicBlocks, CoverTextOverlay } from './ComicBlockContext';
import { useLanguage } from '@/context/LanguageContext';
import {
    COVER_GRADIENT_PRESETS,
    TEXT_TEXTURE_PRESETS,
    getCoverGradientStyle,
    getCoverTextBackgroundStyle,
    getCoverTextSpanStyle,
    getCoverTextWrapperStyle,
    type CoverGradientPreset,
    type TextTexturePreset,
} from '@/lib/coverTextStyles';

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

function ControlSection({
    title,
    icon: Icon,
    children,
    description,
}: {
    title: string;
    icon: React.ComponentType<{ className?: string }>;
    children: React.ReactNode;
    description?: string;
}) {
    return (
        <section className="rounded-2xl border border-white/[0.07] bg-white/[0.035] p-4 shadow-lg shadow-black/20">
            <div className="mb-3 flex items-start gap-2.5">
                <div className="rounded-xl border border-blue-400/20 bg-blue-500/10 p-2 text-blue-300">
                    <Icon className="h-4 w-4" />
                </div>
                <div>
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white/80">{title}</h3>
                    {description && <p className="mt-1 text-[11px] leading-relaxed text-neutral-500">{description}</p>}
                </div>
            </div>
            <div className="space-y-3">{children}</div>
        </section>
    );
}

function Toggle({
    checked,
    onChange,
    label,
}: {
    checked: boolean;
    onChange: () => void;
    label: string;
}) {
    return (
        <button
            type="button"
            onClick={onChange}
            className="flex w-full items-center justify-between rounded-xl border border-white/[0.07] bg-neutral-950/80 px-3 py-2 text-left transition-colors hover:border-blue-400/30"
        >
            <span className="text-xs font-bold text-neutral-300">{label}</span>
            <span className={`relative h-5 w-9 rounded-full transition-colors ${checked ? 'bg-blue-600' : 'bg-neutral-700'}`}>
                <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
            </span>
        </button>
    );
}

function RangeControl({
    label,
    value,
    min,
    max,
    step,
    suffix = '',
    onChange,
}: {
    label: string;
    value: number;
    min: number;
    max: number;
    step?: number;
    suffix?: string;
    onChange: (value: number) => void;
}) {
    return (
        <label className="block">
            <span className="mb-1.5 flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-neutral-500">
                <span>{label}</span>
                <span className="text-neutral-300">{Number.isInteger(value) ? value : value.toFixed(2)}{suffix}</span>
            </span>
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={(e) => onChange(Number(e.target.value))}
                className="w-full accent-blue-500"
            />
        </label>
    );
}

function ColorField({
    label,
    value,
    fallback,
    onChange,
}: {
    label: string;
    value: string;
    fallback: string;
    onChange: (value: string) => void;
}) {
    return (
        <label className="block">
            <span className="mb-1.5 block text-[10px] font-black uppercase tracking-widest text-neutral-500">{label}</span>
            <div className="flex items-center gap-2">
                <input
                    type="color"
                    value={value.startsWith('#') ? value : fallback}
                    onChange={(e) => onChange(e.target.value)}
                    className="h-9 w-10 cursor-pointer rounded-lg border border-neutral-700 bg-transparent"
                />
                <input
                    type="text"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="min-w-0 flex-1 rounded-lg border border-neutral-800 bg-neutral-950 px-2 py-2 text-xs text-white focus:border-blue-500/50 focus:outline-none"
                />
            </div>
        </label>
    );
}

type EditorTab = 'content' | 'typography' | 'style' | 'effects';

const EDITOR_TABS: Array<{ id: EditorTab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: 'content', label: 'Content', icon: Layers },
    { id: 'typography', label: 'Type', icon: PanelRight },
    { id: 'style', label: 'Style', icon: Palette },
    { id: 'effects', label: 'Effects', icon: Sparkles },
];

interface CoverTextEditorProps {
    imageUrl: string;
    onClose: () => void;
}

export default function CoverTextEditor({ imageUrl, onClose }: CoverTextEditorProps) {
    const { t } = useLanguage();
    const { coverTextOverlays, addCoverText, updateCoverText, removeCoverText } = useComicBlocks();
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<EditorTab>('content');
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
                <div className="flex-1 flex items-center justify-center p-4 overflow-auto bg-[radial-gradient(circle_at_center,rgba(37,99,235,0.12),transparent_45%),#05070b]">
                    <div ref={canvasRef} className="relative inline-block max-w-full max-h-full overflow-hidden rounded-xl shadow-2xl ring-1 ring-white/10" onClick={() => setSelectedId(null)}>
                        <img src={imageUrl} alt="Cover" className="max-w-full max-h-[calc(100vh-120px)] object-contain select-none pointer-events-none" draggable={false} />

                        {/* Cover gradient washes */}
                        {coverTextOverlays.map((overlay) => {
                            const gradientStyle = getCoverGradientStyle(overlay);
                            if (!gradientStyle) return null;
                            return (
                                <div
                                    key={`${overlay.id}-cover-gradient`}
                                    className="absolute inset-0 pointer-events-none"
                                    style={{ ...gradientStyle, zIndex: 5 }}
                                />
                            );
                        })}

                        {/* Text Overlays */}
                        {coverTextOverlays.map(overlay => {
                            const isSelected = overlay.id === selectedId;

                            return (
                                <div
                                    key={overlay.id}
                                    className={`absolute cursor-move select-none ${isSelected ? 'ring-2 ring-blue-500 ring-offset-1 ring-offset-transparent' : 'hover:ring-1 hover:ring-white/30'}`}
                                    style={{
                                        ...getCoverTextWrapperStyle(overlay),
                                        zIndex: isSelected ? 50 : 10,
                                    }}
                                    onMouseDown={(e) => handleMouseDown(e, overlay)}
                                    onTouchStart={(e) => handleTouchStart(e, overlay)}
                                    onClick={(e) => { e.stopPropagation(); setSelectedId(overlay.id); }}
                                >
                                    {overlay.bgEnabled && (
                                        <div
                                            style={getCoverTextBackgroundStyle(overlay) || undefined}
                                        />
                                    )}
                                    <span
                                        style={getCoverTextSpanStyle(overlay)}
                                    >
                                        {overlay.text || (isSelected ? '…' : '')}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Control Panel */}
                <div className="w-[390px] bg-neutral-900 border-l border-neutral-800 flex flex-col shrink-0">
                    {selectedOverlay ? (
                        <>
                            <div className="grid grid-cols-4 gap-1 border-b border-neutral-800 bg-neutral-950/80 p-2 shrink-0">
                                {EDITOR_TABS.map(({ id, label, icon: Icon }) => (
                                    <button
                                        key={id}
                                        type="button"
                                        onClick={() => setActiveTab(id)}
                                        className={`flex flex-col items-center gap-1 rounded-xl px-2 py-2 text-[10px] font-black uppercase tracking-wider transition-colors ${activeTab === id ? 'bg-blue-500/15 text-blue-200 border border-blue-500/30' : 'text-neutral-500 hover:bg-neutral-800 hover:text-neutral-200 border border-transparent'}`}
                                    >
                                        <Icon className="h-3.5 w-3.5" />
                                        {label}
                                    </button>
                                ))}
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                            {activeTab === 'content' && (
                            <ControlSection title="Layers & Content" icon={Layers} description="Pick a layer, edit copy, then drag it directly on the cover.">
                                <div className="grid gap-1.5">
                                    {coverTextOverlays.map((o, i) => (
                                        <div
                                            key={o.id}
                                            role="button"
                                            tabIndex={0}
                                            className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-left text-xs transition-colors ${o.id === selectedId ? 'border-blue-500/40 bg-blue-500/15 text-blue-200' : 'border-transparent text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200'}`}
                                            onClick={() => setSelectedId(o.id)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' || e.key === ' ') {
                                                    e.preventDefault();
                                                    setSelectedId(o.id);
                                                }
                                            }}
                                        >
                                            <Type className="h-3.5 w-3.5 shrink-0" />
                                            <span className="min-w-0 flex-1 truncate font-semibold">{o.text || `Text ${i + 1}`}</span>
                                            <button
                                                type="button"
                                                onClick={(e) => { e.stopPropagation(); handleDelete(o.id); }}
                                                className="rounded-md p-1 text-neutral-500 transition-colors hover:bg-red-500/10 hover:text-red-300"
                                                aria-label="Delete text layer"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                <label className="block">
                                    <span className="mb-1.5 block text-[10px] font-black uppercase tracking-widest text-neutral-500">{(t as any).text || 'Text'}</span>
                                    <textarea
                                        value={selectedOverlay.text}
                                        onChange={(e) => update({ text: e.target.value })}
                                        placeholder="Enter text..."
                                        className="min-h-[92px] w-full resize-y rounded-xl border border-neutral-800 bg-neutral-950 p-3 text-sm text-white focus:border-blue-500/50 focus:outline-none"
                                        style={{ fontFamily: selectedOverlay.fontFamily }}
                                    />
                                </label>
                            </ControlSection>
                            )}

                            {activeTab === 'typography' && (
                            <ControlSection title="Typography" icon={PanelRight} description="Size, wrapping, italic style, alignment, and spacing live together.">
                                <label className="block">
                                    <span className="mb-1.5 block text-[10px] font-black uppercase tracking-widest text-neutral-500">{(t as any).fontFamily || 'Font'}</span>
                                    <select
                                        value={selectedOverlay.fontFamily}
                                        onChange={(e) => update({ fontFamily: e.target.value })}
                                        className="w-full rounded-xl border border-neutral-800 bg-neutral-950 p-2.5 text-sm text-white focus:border-blue-500/50 focus:outline-none"
                                    >
                                        {FONT_OPTIONS.map(f => (
                                            <option key={f.value} value={f.value}>{f.label}</option>
                                        ))}
                                    </select>
                                </label>
                                <RangeControl label={(t as any).fontSize || 'Size'} value={selectedOverlay.fontSize ?? 48} min={8} max={220} suffix="px" onChange={(value) => update({ fontSize: value })} />
                                <RangeControl label="Text width" value={selectedOverlay.textBoxWidth ?? 340} min={80} max={760} step={10} suffix="px" onChange={(value) => update({ textBoxWidth: value })} />
                                <RangeControl label={(t as any).fontWeight || 'Weight'} value={selectedOverlay.fontWeight ?? 700} min={100} max={900} step={100} onChange={(value) => update({ fontWeight: value })} />
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <span className="mb-1.5 block text-[10px] font-black uppercase tracking-widest text-neutral-500">Style</span>
                                        <div className="flex gap-1.5">
                                            <button
                                                type="button"
                                                onClick={() => update({ fontWeight: (selectedOverlay.fontWeight ?? 700) >= 700 ? 400 : 700 })}
                                                className={`rounded-lg border px-3 py-2 ${selectedOverlay.fontWeight >= 700 ? 'border-blue-500/40 bg-blue-500/20 text-blue-300' : 'border-neutral-800 text-neutral-500 hover:text-neutral-300'}`}
                                                aria-label="Toggle bold"
                                            >
                                                <Bold className="h-4 w-4" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => update({ fontStyle: selectedOverlay.fontStyle === 'italic' ? 'normal' : 'italic' })}
                                                className={`rounded-lg border px-3 py-2 ${selectedOverlay.fontStyle === 'italic' ? 'border-blue-500/40 bg-blue-500/20 text-blue-300' : 'border-neutral-800 text-neutral-500 hover:text-neutral-300'}`}
                                                aria-label="Toggle italic"
                                            >
                                                <Italic className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                    <div>
                                        <span className="mb-1.5 block text-[10px] font-black uppercase tracking-widest text-neutral-500">Align</span>
                                        <div className="flex gap-1.5">
                                            {[{ v: 'left' as const, I: AlignLeft }, { v: 'center' as const, I: AlignCenter }, { v: 'right' as const, I: AlignRight }].map(({ v, I }) => (
                                                <button
                                                    type="button"
                                                    key={v}
                                                    onClick={() => update({ textAlign: v })}
                                                    className={`rounded-lg border px-3 py-2 ${selectedOverlay.textAlign === v ? 'border-blue-500/40 bg-blue-500/20 text-blue-300' : 'border-neutral-800 text-neutral-500 hover:text-neutral-300'}`}
                                                    aria-label={`Align ${v}`}
                                                >
                                                    <I className="h-4 w-4" />
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <span className="mb-1.5 block text-[10px] font-black uppercase tracking-widest text-neutral-500">Transform</span>
                                    <div className="flex gap-1.5">
                                        {(['none', 'uppercase', 'lowercase'] as const).map(v => (
                                            <button
                                                type="button"
                                                key={v}
                                                onClick={() => update({ textTransform: v })}
                                                className={`rounded-lg border px-3 py-1.5 text-[10px] font-black uppercase tracking-wider ${selectedOverlay.textTransform === v ? 'border-blue-500/40 bg-blue-500/20 text-blue-300' : 'border-neutral-800 text-neutral-500 hover:text-neutral-300'}`}
                                            >
                                                {v === 'none' ? 'Aa' : v === 'uppercase' ? 'AA' : 'aa'}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <RangeControl label={(t as any).letterSpacing || 'Spacing'} value={selectedOverlay.letterSpacing ?? 0} min={-5} max={35} step={0.5} suffix="px" onChange={(value) => update({ letterSpacing: value })} />
                                <RangeControl label="Line height" value={selectedOverlay.lineHeight ?? 1.2} min={0.6} max={3} step={0.05} onChange={(value) => update({ lineHeight: value })} />
                                <RangeControl label="Rotation" value={selectedOverlay.rotation ?? 0} min={-180} max={180} suffix="°" onChange={(value) => update({ rotation: value })} />
                                <RangeControl label={(t as any).textOpacity || 'Opacity'} value={selectedOverlay.opacity ?? 1} min={0} max={1} step={0.05} onChange={(value) => update({ opacity: value })} />
                            </ControlSection>
                            )}

                            {activeTab === 'style' && (
                            <>
                            <ControlSection title="Color & Texture" icon={Palette} description="Use a solid color or clip one of the built-in premium textures into the text.">
                                <ColorField label="Base color" value={selectedOverlay.color || '#ffffff'} fallback="#ffffff" onChange={(value) => update({ color: value })} />
                                <div>
                                    <span className="mb-2 block text-[10px] font-black uppercase tracking-widest text-neutral-500">Texture preset</span>
                                    <div className="grid grid-cols-2 gap-2">
                                        {TEXT_TEXTURE_PRESETS.map((preset) => (
                                            <button
                                                type="button"
                                                key={preset.value}
                                                onClick={() => update({ texturePreset: preset.value as TextTexturePreset })}
                                                className={`overflow-hidden rounded-xl border p-2 text-left transition-all ${selectedOverlay.texturePreset === preset.value ? 'border-blue-400/60 bg-blue-500/15 text-blue-100' : 'border-neutral-800 bg-neutral-950 text-neutral-400 hover:border-neutral-600 hover:text-neutral-200'}`}
                                            >
                                                <span
                                                    className="mb-1 block h-7 rounded-lg border border-white/10"
                                                    style={{ background: preset.background || selectedOverlay.color || '#ffffff', backgroundSize: preset.backgroundSize || '160% 160%' }}
                                                />
                                                <span className="block truncate text-[10px] font-black uppercase tracking-wider">{preset.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </ControlSection>

                            <ControlSection title="Stroke & Border" icon={Shield} description="Add crisp borders around text for busy artwork.">
                                <Toggle checked={selectedOverlay.strokeEnabled ?? false} onChange={() => update({ strokeEnabled: !selectedOverlay.strokeEnabled })} label="Text border / stroke" />
                                {selectedOverlay.strokeEnabled && (
                                    <div className="space-y-3 rounded-xl border border-neutral-800 bg-neutral-950/50 p-3">
                                        <ColorField label="Stroke color" value={selectedOverlay.strokeColor || '#111827'} fallback="#111827" onChange={(value) => update({ strokeColor: value })} />
                                        <RangeControl label="Stroke width" value={selectedOverlay.strokeWidth ?? 2} min={0.5} max={12} step={0.5} suffix="px" onChange={(value) => update({ strokeWidth: value })} />
                                    </div>
                                )}
                            </ControlSection>
                            </>
                            )}

                            {activeTab === 'effects' && (
                            <ControlSection title="Readability & Depth" icon={Sparkles} description="Add a full-cover gradient wash, text plate, or shadow to keep titles readable.">
                                <Toggle checked={selectedOverlay.coverGradientEnabled ?? false} onChange={() => update({ coverGradientEnabled: !selectedOverlay.coverGradientEnabled })} label="Cover gradient wash" />
                                {selectedOverlay.coverGradientEnabled && (
                                    <div className="space-y-3 rounded-xl border border-neutral-800 bg-neutral-950/50 p-3">
                                        <div className="grid grid-cols-2 gap-2">
                                            {COVER_GRADIENT_PRESETS.filter((preset) => preset.value !== 'none').map((preset) => (
                                                <button
                                                    type="button"
                                                    key={preset.value}
                                                    onClick={() => update({ coverGradientPreset: preset.value as CoverGradientPreset })}
                                                    className={`overflow-hidden rounded-xl border p-2 text-left transition-all ${selectedOverlay.coverGradientPreset === preset.value ? 'border-blue-400/60 bg-blue-500/15 text-blue-100' : 'border-neutral-800 bg-neutral-950 text-neutral-400 hover:border-neutral-600 hover:text-neutral-200'}`}
                                                >
                                                    <span className="mb-1 block h-7 rounded-lg border border-white/10" style={{ background: preset.background }} />
                                                    <span className="block truncate text-[10px] font-black uppercase tracking-wider">{preset.label}</span>
                                                </button>
                                            ))}
                                        </div>
                                        <RangeControl label="Wash strength" value={selectedOverlay.coverGradientOpacity ?? 0.78} min={0.1} max={1} step={0.05} onChange={(value) => update({ coverGradientOpacity: value })} />
                                    </div>
                                )}
                                <Toggle checked={selectedOverlay.bgEnabled ?? false} onChange={() => update({ bgEnabled: !selectedOverlay.bgEnabled })} label={(t as any).textBackground || 'Text background'} />
                                {selectedOverlay.bgEnabled && (
                                    <div className="space-y-3 rounded-xl border border-neutral-800 bg-neutral-950/50 p-3">
                                        <ColorField label="Background color / CSS" value={selectedOverlay.bgColor || 'rgba(0,0,0,0.5)'} fallback="#000000" onChange={(value) => update({ bgColor: value })} />
                                        <div className="grid grid-cols-2 gap-3">
                                            <RangeControl label="Pad X" value={selectedOverlay.bgPaddingX ?? 12} min={0} max={90} suffix="px" onChange={(value) => update({ bgPaddingX: value })} />
                                            <RangeControl label="Pad Y" value={selectedOverlay.bgPaddingY ?? 8} min={0} max={90} suffix="px" onChange={(value) => update({ bgPaddingY: value })} />
                                        </div>
                                        <RangeControl label="Radius" value={selectedOverlay.bgBorderRadius ?? 4} min={0} max={60} suffix="px" onChange={(value) => update({ bgBorderRadius: value })} />
                                    </div>
                                )}
                                <Toggle checked={selectedOverlay.shadowEnabled ?? false} onChange={() => update({ shadowEnabled: !selectedOverlay.shadowEnabled })} label={(t as any).textShadow || 'Shadow'} />
                                {selectedOverlay.shadowEnabled && (
                                    <div className="space-y-3 rounded-xl border border-neutral-800 bg-neutral-950/50 p-3">
                                        <ColorField label="Shadow color" value={selectedOverlay.shadowColor || 'rgba(0,0,0,0.7)'} fallback="#000000" onChange={(value) => update({ shadowColor: value })} />
                                        <RangeControl label="Blur" value={selectedOverlay.shadowBlur ?? 8} min={0} max={60} suffix="px" onChange={(value) => update({ shadowBlur: value })} />
                                        <div className="grid grid-cols-2 gap-3">
                                            <RangeControl label="Offset X" value={selectedOverlay.shadowOffsetX ?? 2} min={-40} max={40} suffix="px" onChange={(value) => update({ shadowOffsetX: value })} />
                                            <RangeControl label="Offset Y" value={selectedOverlay.shadowOffsetY ?? 4} min={-40} max={40} suffix="px" onChange={(value) => update({ shadowOffsetY: value })} />
                                        </div>
                                    </div>
                                )}
                            </ControlSection>
                            )}
                            </div>
                        </>
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
