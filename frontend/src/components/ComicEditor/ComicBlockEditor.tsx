'use client';

import React, { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Trash2, ArrowUp, ArrowDown, Type, Image as ImageIcon, Save, Loader2, Scissors, MessageCircle, Settings, Users, Heart, ArrowLeft, BookOpen, X, RefreshCw, Crosshair } from 'lucide-react';
import { useComicBlocks } from './ComicBlockContext';
import { useLanguage } from '@/context/LanguageContext';
import { usePasteNormalize } from '@/lib/pasteNormalize';
import { inferBookCategory } from '@/lib/bookCategory';
import ImageCropper from './ImageCropper';
import PageImageCropper from './PageImageCropper';
import BubbleEditor from './BubbleEditor';
import CharacterHotspotEditor from './CharacterHotspotEditor';
import CharacterManagement from './CharacterManagement';
import CoverTextEditor from './CoverTextEditor';

type ChapterItem = {
    id: string;
    title: string;
    index: number;
};

function getChapterItems(blocks: { id: string; chapterTitle?: string }[]): ChapterItem[] {
    return blocks
        .map((block, index) => ({
            id: block.id,
            title: block.chapterTitle?.trim() || '',
            index,
        }))
        .filter((chapter) => chapter.title.length > 0);
}

function BlockCard({ blockId, index, total }: { blockId: string; index: number; total: number }) {
    const { t } = useLanguage();
    const { blocks, updateBlockText, updateBlockChapterTitle, updateBlockImage, updateBlockCrop, removeBlock, moveBlockUp, moveBlockDown } = useComicBlocks();
    const block = blocks.find(b => b.id === blockId)!;
    const [uploading, setUploading] = useState(false);
    const [showCropper, setShowCropper] = useState(false);
    const [showBubbles, setShowBubbles] = useState(false);
    const [showHotspots, setShowHotspots] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const displayImage = block.croppedImageUrl || block.imageUrl;
    const hasBubbles = (block.bubbles?.length ?? 0) > 0;
    const hasHotspots = (block.characterHotspots?.length ?? 0) > 0;

    const onPasteBlockText = usePasteNormalize({
        value: block.text,
        onChange: (v) => updateBlockText(blockId, v),
    });
    const onPasteChapterTitle = usePasteNormalize({
        value: block.chapterTitle || '',
        onChange: (v) => updateBlockChapterTitle(blockId, v),
    });

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement> | File) => {
        const file = e instanceof File ? e : e.target.files?.[0];
        if (!file) return;

        if (file.size > 15 * 1024 * 1024) {
            alert((t as any).fileTooLarge || "File is too large. Maximum size is 15MB.");
            return;
        }
        if (!file.type.startsWith('image/')) {
            alert((t as any).invalidFileType || "Only image files are allowed.");
            return;
        }

        setUploading(true);

        try {
            const { storage } = await import('@/lib/firebase');
            const { ref, uploadBytesResumable, getDownloadURL } = await import('firebase/storage');

            const timestamp = Date.now();
            const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '');
            const storageRef = ref(storage, `blocks/${timestamp}_${safeName}`);

            const uploadTask = await uploadBytesResumable(storageRef, file);
            const downloadUrl = await getDownloadURL(uploadTask.ref);

            updateBlockImage(blockId, downloadUrl);
            // After upload (especially for paste), show cropper
            setShowCropper(true);
        } catch (error) {
            console.error('Error uploading image:', error);
            alert(t.deleteFailed);
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handlePaste = async (e: React.ClipboardEvent) => {
        const items = e.clipboardData?.items;
        if (!items) return;

        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                const blob = items[i].getAsFile();
                if (blob) {
                    const file = new File([blob], `pasted_image_${Date.now()}.png`, { type: blob.type });
                    handleImageUpload(file);
                    break;
                }
            }
        }
    };

    return (
        <>
            <div
                className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden shadow-lg"
                onPaste={handlePaste}
            >
                {/* Block Header */}
                <div className="flex items-center justify-between px-3 py-1.5 bg-neutral-950/60 border-b border-neutral-800">
                    <span className="text-sm font-bold text-neutral-400">{t.block(index + 1)}</span>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => moveBlockUp(blockId)}
                            disabled={index === 0}
                            className="p-1.5 rounded-md hover:bg-neutral-800 text-neutral-400 hover:text-white disabled:opacity-30 transition-colors"
                        >
                            <ArrowUp className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => moveBlockDown(blockId)}
                            disabled={index === total - 1}
                            className="p-1.5 rounded-md hover:bg-neutral-800 text-neutral-400 hover:text-white disabled:opacity-30 transition-colors"
                        >
                            <ArrowDown className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => removeBlock(blockId)}
                            disabled={total <= 1}
                            className="p-1.5 rounded-md hover:bg-red-900/50 text-neutral-400 hover:text-red-400 disabled:opacity-30 transition-colors ml-2"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                <div className="p-3 space-y-3">
                    <div>
                        {block.chapterTitle !== undefined && block.chapterTitle !== null ? (
                            <div className="relative group/chapter">
                                <input
                                    type="text"
                                    value={block.chapterTitle || ''}
                                    onChange={(e) => updateBlockChapterTitle(blockId, e.target.value)}
                                    onPaste={onPasteChapterTitle}
                                    onPasteCapture={onPasteChapterTitle}
                                    placeholder={t.chapterTitle}
                                    className="w-full bg-blue-500/5 border border-blue-500/20 rounded-lg px-4 py-2.5 text-blue-400 placeholder-blue-900/40 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all text-sm font-bold shadow-inner font-chapter"
                                    style={{ fontFamily: 'BPGNinoTall' }}
                                    autoFocus
                                />
                                <button
                                    onClick={() => updateBlockChapterTitle(blockId, '')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-blue-500/10 text-blue-900/40 hover:text-blue-400 opacity-0 group-hover/chapter:opacity-100 transition-all"
                                    title={t.removeChapterTitle}
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </div>
                        ) : (
                            <button
                                className="w-full py-1.5 rounded-lg border border-dashed border-neutral-800 text-neutral-600 hover:text-blue-500/70 hover:border-blue-500/30 hover:bg-blue-500/5 transition-all text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 group/addchap"
                            >
                                <Plus className="w-3 h-3 group-hover/addchap:scale-110 transition-transform" />
                                {t.addChapterTitle}
                            </button>
                        )}
                    </div>

                    {/* Text Input Segment */}
                    <div className="space-y-2">
                        <textarea
                            value={block.text}
                            onChange={(e) => updateBlockText(blockId, e.target.value)}
                            onPaste={onPasteBlockText}
                            onPasteCapture={onPasteBlockText}
                            placeholder={t.enterText}
                            className="w-full min-h-[60px] bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-white placeholder-neutral-600 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30 transition-all resize-y text-sm leading-relaxed shadow-inner font-geo-text"
                            style={{ fontFamily: 'GeoText' }}
                        />
                    </div>

                    {/* Image Segment */}
                    <div className="space-y-3 pt-2 border-t border-neutral-800">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">{t.image}</span>
                        </div>
                        <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            ref={fileInputRef}
                            onChange={handleImageUpload}
                        />
                        {!block.imageUrl && (
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                onDragOver={(e) => {
                                    e.preventDefault();
                                    setIsDragging(true);
                                }}
                                onDragLeave={(e) => {
                                    e.preventDefault();
                                    setIsDragging(false);
                                }}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    setIsDragging(false);
                                    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                                        handleImageUpload(e.dataTransfer.files[0]);
                                    }
                                }}
                                disabled={uploading}
                                className={`w-full py-3 rounded-lg border-2 border-dashed transition-colors text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50 ${isDragging ? 'border-blue-500 bg-blue-500/10 text-blue-400' : 'border-neutral-700 hover:border-blue-500/50 text-neutral-400 hover:text-blue-400'}`}
                            >
                                {uploading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        {t.updating}
                                    </>
                                ) : (
                                    <>
                                        <ImageIcon className="w-4 h-4" />
                                        {t.uploadImage}
                                    </>
                                )}
                            </button>
                        )}

                        {block.imageUrl && (
                            <>
                                {/* Crop, Bubble & Hotspot Info */}
                                <div className="flex items-center gap-2 flex-wrap">
                                    {block.croppedImageUrl && (
                                        <span className="text-[10px] text-green-500 font-medium bg-green-500/10 px-2 py-1 rounded-full border border-green-500/20 ml-auto">
                                            ✓ {t.cropApplied}
                                        </span>
                                    )}
                                    {hasBubbles && (
                                        <span className="text-[10px] text-purple-400 font-medium bg-purple-500/10 px-2 py-1 rounded-full border border-purple-500/20">
                                            {t.bubbles}: {block.bubbles?.length}
                                        </span>
                                    )}
                                    {hasHotspots && (
                                        <span className="text-[10px] text-emerald-400 font-medium bg-emerald-500/10 px-2 py-1 rounded-full border border-emerald-500/20">
                                            {t.hotspots || 'Hotspots'}: {block.characterHotspots?.length}
                                        </span>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Preview */}
                {(block.text || block.imageUrl || block.chapterTitle) && (
                    <div className="border-t border-neutral-800 p-3 bg-neutral-950/40">
                        <p className="text-xs font-semibold text-neutral-600 uppercase tracking-wider mb-2">{t.preview}</p>
                        <div className="bg-white rounded-lg p-2.5 text-black space-y-2 shadow-md">
                            {block.chapterTitle && (
                                <h3 className="font-chapter font-black text-lg mb-2 text-center uppercase tracking-widest border-b border-black/10 pb-2 text-indigo-900">{block.chapterTitle}</h3>
                            )}
                            {block.text && (
                                <p className="font-geo-text text-sm leading-relaxed whitespace-pre-wrap">{block.text}</p>
                            )}
                            {displayImage && (
                                <div
                                    className="relative rounded-md overflow-hidden group/preview"
                                    onDragOver={(e) => {
                                        e.preventDefault();
                                        setIsDragging(true);
                                    }}
                                    onDragLeave={(e) => {
                                        e.preventDefault();
                                        setIsDragging(false);
                                    }}
                                    onDrop={(e) => {
                                        e.preventDefault();
                                        setIsDragging(false);
                                        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                                            handleImageUpload(e.dataTransfer.files[0]);
                                        }
                                    }}
                                >
                                    {isDragging && (
                                        <div className="absolute inset-0 bg-blue-500/20 border-2 border-dashed border-blue-500 z-50 pointer-events-none flex items-center justify-center">
                                            <span className="bg-blue-600 text-white font-bold py-1 px-3 rounded text-sm">{t.replaceImage || "Replace"}</span>
                                        </div>
                                    )}
                                    <img
                                        src={displayImage}
                                        alt={`Preview ${index + 1}`}
                                        className="w-full h-auto cursor-pointer"
                                        onClick={() => setShowCropper(true)}
                                    />
                                    {/* Edit Overlay within Preview */}
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/preview:opacity-100 transition-opacity flex items-center justify-center gap-2 pointer-events-none">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                                            className="pointer-events-auto p-2.5 bg-sky-500/90 hover:bg-sky-500 rounded-full text-white shadow-2xl hover:scale-110 transition-all backdrop-blur-md border border-white/40"
                                            title={t.replaceImage}
                                        >
                                            <RefreshCw className="w-5 h-5" />
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setShowCropper(true); }}
                                            className="pointer-events-auto p-2.5 bg-indigo-600/90 hover:bg-indigo-500 rounded-full text-white shadow-2xl hover:scale-110 transition-all backdrop-blur-md border border-white/40"
                                            title={t.cropImage}
                                        >
                                            <Scissors className="w-5 h-5" />
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setShowBubbles(true);
                                            }}
                                            className="pointer-events-auto p-2.5 bg-purple-600/90 hover:bg-purple-600 rounded-full text-white shadow-2xl hover:scale-110 transition-all backdrop-blur-md border border-white/40"
                                            title={t.bubbles}
                                        >
                                            <MessageCircle className="w-5 h-5" />
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setShowHotspots(true);
                                            }}
                                            className="pointer-events-auto p-2.5 bg-emerald-600/90 hover:bg-emerald-500 rounded-full text-white shadow-2xl hover:scale-110 transition-all backdrop-blur-md border border-white/40"
                                            title={t.hotspots || 'Hotspots'}
                                        >
                                            <Crosshair className="w-5 h-5" />
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); updateBlockImage(blockId, ''); }}
                                            className="pointer-events-auto p-2.5 bg-red-600/90 hover:bg-red-600 rounded-full text-white shadow-2xl hover:scale-110 transition-all backdrop-blur-md border border-white/40"
                                            title={t.remove}
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </div>

                                    {/* Watermark in Editor Preview */}
                                    <img
                                        src="/CBA.jpg"
                                        alt=""
                                        className="absolute bottom-1 right-1 w-6 h-6 object-contain opacity-80 pointer-events-none select-none z-10"
                                    />
                                    {/* Preview bubbles */}
                                    {block.bubbles?.map((bubble) => (
                                        <div
                                            key={bubble.id}
                                            className="absolute pointer-events-none"
                                            style={{
                                                left: `${bubble.x}%`,
                                                top: `${bubble.y}%`,
                                                transform: 'translate(-50%, -50%)',
                                                zIndex: 20
                                            }}
                                        >
                                            <div className="relative" style={{ width: 80 * bubble.scale, height: 80 * bubble.scale }}>
                                                <img
                                                    src={`/bubbles/${bubble.bubbleType}.png`}
                                                    alt=""
                                                    className="w-full h-full object-contain"
                                                />
                                                <span
                                                    className="font-bubble absolute inset-0 flex items-center justify-center text-center text-black font-bold"
                                                    style={{
                                                        fontFamily: 'BPGNinoTall',
                                                        fontSize: Math.max(6, 80 * bubble.scale * 0.12),
                                                        padding: `${80 * bubble.scale * 0.2}px ${80 * bubble.scale * 0.15}px`,
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
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Crop Modal */}
            {showCropper && (
                <PageImageCropper
                    imageUrl={block.imageUrl}
                    onCropComplete={(croppedUrl, cropData) => {
                        updateBlockCrop(blockId, croppedUrl, cropData);
                        setShowCropper(false);
                    }}
                    onCancel={() => setShowCropper(false)}
                />
            )}
            {/* Bubble Editor Modal */}
            {showBubbles && displayImage && (
                <BubbleEditor
                    blockId={blockId}
                    imageUrl={displayImage}
                    onClose={() => setShowBubbles(false)}
                />
            )}
            {/* Character Hotspot Editor Modal */}
            {showHotspots && displayImage && (
                <CharacterHotspotEditor
                    blockId={blockId}
                    imageUrl={displayImage}
                    onClose={() => setShowHotspots(false)}
                />
            )}
        </>
    );
}

function ComicSettings() {
    const { t, language } = useLanguage();
    const { title, author, category, coverUrl, rawCoverUrl, updateMetadata, coverTextOverlays } = useComicBlocks();
    const [showCropper, setShowCropper] = useState(false);
    const [showTextEditor, setShowTextEditor] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const suggestedCategory = inferBookCategory(title)?.[language] || '';

    const handleCoverFileSelect = async (file: File) => {
        if (file.size > 15 * 1024 * 1024) {
            alert((t as any).fileTooLarge || "File is too large. Maximum size is 15MB.");
            return;
        }
        if (!file.type.startsWith('image/')) {
            alert((t as any).invalidFileType || "Only image files are allowed.");
            return;
        }

        setUploading(true);

        try {
            const { storage } = await import('@/lib/firebase');
            const { ref, uploadBytesResumable, getDownloadURL } = await import('firebase/storage');

            const timestamp = Date.now();
            const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '');
            const storageRef = ref(storage, `covers/raw_${timestamp}_${safeName}`);

            const uploadTask = await uploadBytesResumable(storageRef, file);
            const downloadUrl = await getDownloadURL(uploadTask.ref);

            updateMetadata({ rawCoverUrl: downloadUrl, coverUrl: downloadUrl });
            setShowCropper(true);
        } catch (error) {
            console.error('Error uploading cover:', error);
            alert(t.deleteFailed);
        } finally {
            setUploading(false);
        }
    };

    const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.[0]) return;
        await handleCoverFileSelect(e.target.files[0]);

    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 space-y-4">
                <h3 className="text-white font-bold flex items-center gap-2">
                    <Settings className="w-4 h-4 text-blue-500" />
                    {t.comicSettings}
                </h3>

                <div className="space-y-4 pt-2">
                    <div>
                        <label className="block text-xs font-bold text-neutral-500 uppercase tracking-widest mb-1.5">{t.comicTitle}</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => updateMetadata({ title: e.target.value })}
                            className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-neutral-500 uppercase tracking-widest mb-1.5">{t.authorName}</label>
                        <input
                            type="text"
                            value={author}
                            onChange={(e) => updateMetadata({ author: e.target.value })}
                            className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-neutral-500 uppercase tracking-widest mb-1.5">{t.category}</label>
                        <div className="space-y-2">
                            <input
                                type="text"
                                value={category}
                                maxLength={120}
                                onChange={(e) => updateMetadata({ category: e.target.value.slice(0, 120) })}
                                placeholder={t.categoryPlaceholder}
                                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                            />
                            {suggestedCategory && category.trim() !== suggestedCategory && (
                                <button
                                    type="button"
                                    onClick={() => updateMetadata({ category: suggestedCategory })}
                                    className="inline-flex items-center gap-2 text-[11px] px-3 py-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-300 hover:bg-blue-500/20 transition-colors"
                                >
                                    <span className="font-black uppercase tracking-widest">{t.suggestedCategory}</span>
                                    <span className="font-medium">{suggestedCategory}</span>
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="pt-2">
                        <label className="block text-xs font-bold text-neutral-500 uppercase tracking-widest mb-3">{t.coverImageOptional}</label>
                        <div className="flex items-start gap-6">
                            <div
                                className={`w-40 aspect-[3/4] rounded-xl overflow-hidden relative border-2 flex-shrink-0 group/card shadow-xl transition-all duration-500 hover:border-blue-500/70 hover:scale-[1.02] hover:shadow-2xl ${isDragging ? 'border-blue-500 bg-blue-500/10' : 'bg-neutral-900 border-neutral-800'}`}
                                onDragOver={(e) => {
                                    e.preventDefault();
                                    setIsDragging(true);
                                }}
                                onDragLeave={(e) => {
                                    e.preventDefault();
                                    setIsDragging(false);
                                }}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    setIsDragging(false);
                                    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                                        handleCoverFileSelect(e.dataTransfer.files[0]);
                                    }
                                }}
                            >
                                {isDragging && (
                                    <div className="absolute inset-0 bg-blue-500/20 border-2 border-dashed border-blue-500 z-50 pointer-events-none flex items-center justify-center">
                                        <span className="bg-blue-600 text-white font-bold py-1 px-3 rounded text-sm">{t.changeCover || "Drop here"}</span>
                                    </div>
                                )}
                                {coverUrl ? (
                                    <>
                                         <img src={coverUrl} alt="Cover" className="w-full h-full object-cover opacity-80 group-hover/card:opacity-100 transition-all duration-700 ease-out" />

                                        {/* Cover text overlays preview */}
                                        {coverTextOverlays.map(overlay => (
                                            <div
                                                key={overlay.id}
                                                className="absolute pointer-events-none"
                                                style={{
                                                    left: `${overlay.x}%`,
                                                    top: `${overlay.y}%`,
                                                    transform: `translate(-50%, -50%) rotate(${overlay.rotation}deg)`,
                                                    zIndex: 15,
                                                }}
                                            >
                                                <span
                                                    style={{
                                                        fontFamily: overlay.fontFamily,
                                                        fontSize: Math.max(6, overlay.fontSize * 0.2),
                                                        fontWeight: overlay.fontWeight,
                                                        fontStyle: overlay.fontStyle,
                                                        color: overlay.color,
                                                        textTransform: overlay.textTransform,
                                                        letterSpacing: overlay.letterSpacing * 0.2,
                                                        lineHeight: overlay.lineHeight,
                                                        opacity: overlay.opacity,
                                                        textShadow: overlay.shadowEnabled
                                                            ? `${overlay.shadowOffsetX * 0.2}px ${overlay.shadowOffsetY * 0.2}px ${overlay.shadowBlur * 0.2}px ${overlay.shadowColor}`
                                                            : 'none',
                                                        whiteSpace: 'pre',
                                                        display: 'block',
                                                    }}
                                                >
                                                    {overlay.text}
                                                </span>
                                            </div>
                                        ))}

                                        {/* Watermark on Cover in Editor Settings */}
                                        <img
                                            src="/CBA.jpg"
                                            alt=""
                                            className="absolute bottom-2 right-2 w-6 h-6 object-contain opacity-80 pointer-events-none select-none z-10"
                                        />

                                        {/* Library-style overlays */}
                                        <div className="absolute inset-0 flex items-end p-3 opacity-0 group-hover/card:opacity-100 transition-opacity duration-300 bg-gradient-to-t from-blue-950/90 via-transparent to-transparent pointer-events-none">
                                            <span className="text-[10px] font-black tracking-wider text-blue-300 uppercase">{t.readNow} →</span>
                                        </div>

                                        <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-blue-500/0 group-hover/card:border-blue-400/80 transition-colors rounded-tl-xl pointer-events-none" />
                                        <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-blue-500/0 group-hover/card:border-blue-400/80 transition-colors rounded-br-xl pointer-events-none" />

                                        <div className="absolute top-2 right-2 p-1.5 opacity-0 group-hover/card:opacity-100 transition-all duration-300 pointer-events-none">
                                            <Heart className="w-4 h-4 text-white/40" />
                                        </div>
                                    </>
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-gradient-to-br from-blue-950/60 to-[#080c14]">
                                        <div className="grid grid-cols-2 grid-rows-2 gap-1 opacity-20 mb-2">
                                            {[...Array(4)].map((_, i) => <div key={i} className="w-3 h-3 border border-blue-700 rounded-sm" />)}
                                        </div>
                                        <ImageIcon className="w-6 h-6 text-blue-800" />
                                    </div>
                                )}
                                {uploading && (
                                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-10">
                                        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                                    </div>
                                )}
                            </div>

                            <div className="flex-1 space-y-3">
                                <div className="flex flex-wrap gap-2">
                                    <input
                                        type="file"
                                        id="cover-change"
                                        className="hidden"
                                        accept="image/*"
                                        onChange={handleCoverUpload}
                                        disabled={uploading}
                                    />
                                    <label
                                        htmlFor="cover-change"
                                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold transition-all cursor-pointer border border-indigo-500/30 active:scale-95 shadow-lg shadow-indigo-500/20"
                                    >
                                        <ImageIcon className="w-4 h-4" />
                                        {t.changeCover}
                                    </label>

                                    {rawCoverUrl && (
                                        <div className="flex flex-col gap-2">
                                            <button
                                                onClick={() => setShowCropper(true)}
                                                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold transition-all border border-blue-400/30 active:scale-95 shadow-lg shadow-blue-500/20"
                                            >
                                                <Scissors className="w-4 h-4" />
                                                {t.adjustCover}
                                            </button>
                                        </div>
                                    )}
                                    {coverUrl && (
                                        <button
                                            onClick={() => setShowTextEditor(true)}
                                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-sm font-bold transition-all border border-purple-400/30 active:scale-95 shadow-lg shadow-purple-500/20"
                                        >
                                            <Type className="w-4 h-4" />
                                            {(t as any).coverText || 'Cover Text'}
                                            {coverTextOverlays.length > 0 && (
                                                <span className="bg-purple-400/30 text-purple-200 text-[10px] font-black px-1.5 py-0.5 rounded-full">{coverTextOverlays.length}</span>
                                            )}
                                        </button>
                                    )}
                                </div>
                                <p className="text-xs text-neutral-500 leading-relaxed">
                                    {t.coverImageHint}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {showCropper && rawCoverUrl && (
                <ImageCropper
                    imageUrl={rawCoverUrl}
                    aspect={3 / 4}
                    onCropComplete={(url: string) => {
                        updateMetadata({ coverUrl: url });
                        setShowCropper(false);
                    }}
                    onCancel={() => setShowCropper(false)}
                />
            )}
            {showTextEditor && coverUrl && (
                <CoverTextEditor
                    imageUrl={coverUrl}
                    onClose={() => setShowTextEditor(false)}
                />
            )}
        </div>
    );
}

function ChapterNavigator({
    activeChapterId,
    onSelectChapter,
}: {
    activeChapterId: string | null;
    onSelectChapter: (chapterId: string) => void;
}) {
    const { t } = useLanguage();
    const { blocks, moveChapter } = useComicBlocks();
    const [draggedChapterId, setDraggedChapterId] = useState<string | null>(null);
    const [dropTargetId, setDropTargetId] = useState<string | null>(null);

    const chapters = getChapterItems(blocks);

    if (chapters.length === 0) return null;

    return (
        <div className="sticky top-24 hidden xl:block w-64 self-start">
            <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                <BookOpen className="w-3 h-3" />
                {t.chapters}
            </h3>
            <div className="space-y-1 max-h-[calc(100vh-200px)] overflow-y-auto pr-2 custom-scrollbar">
                {chapters.map((chap, chapterIndex) => {
                    const isActive = activeChapterId === chap.id;
                    const stateClass = dropTargetId === chap.id
                        ? 'bg-blue-500/10 border-blue-500/40 text-blue-300'
                        : isActive
                            ? 'bg-blue-500/10 border-blue-500/30 text-blue-300'
                            : 'border-transparent hover:border-neutral-800 hover:bg-neutral-800/50 hover:text-blue-400';

                    return (
                        <button
                            key={chap.id}
                            draggable
                            onDragStart={(e) => {
                                setDraggedChapterId(chap.id);
                                e.dataTransfer.setData('text/chapter-id', chap.id);
                                e.dataTransfer.effectAllowed = 'move';
                            }}
                            onDragEnd={() => {
                                setDraggedChapterId(null);
                                setDropTargetId(null);
                            }}
                            onDragOver={(e) => {
                                e.preventDefault();
                                if (dropTargetId !== chap.id) setDropTargetId(chap.id);
                            }}
                            onDragLeave={() => {
                                if (dropTargetId === chap.id) setDropTargetId(null);
                            }}
                            onDrop={(e) => {
                                e.preventDefault();
                                const sourceId = e.dataTransfer.getData('text/chapter-id') || draggedChapterId;
                                if (sourceId && sourceId !== chap.id) {
                                    moveChapter(sourceId, chap.id);
                                }
                                setDraggedChapterId(null);
                                setDropTargetId(null);
                            }}
                            onClick={() => onSelectChapter(chap.id)}
                            className={`w-full text-left px-3 py-2 rounded-lg text-neutral-400 transition-all group flex items-start gap-2 border ${stateClass} ${draggedChapterId === chap.id ? 'opacity-50' : ''}`}
                            title={t.chapters}
                        >
                            <span className="text-[10px] font-black text-neutral-700 group-hover:text-blue-900 mt-1">{chapterIndex + 1}</span>
                            <span className="text-sm font-bold truncate font-chapter" style={{ fontFamily: 'BPGNinoTall' }}>{chap.title}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

function FloatingActions() {
    const { t } = useLanguage();
    const { addBlock, addChapter, saveComic, saving } = useComicBlocks();
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const toggleVisibility = () => {
            if (window.pageYOffset > 300) {
                setIsVisible(true);
            } else {
                setIsVisible(false);
            }
        };
        window.addEventListener('scroll', toggleVisibility);
        return () => window.removeEventListener('scroll', toggleVisibility);
    }, []);

    return (
        <div className={`fixed bottom-8 right-8 z-40 flex flex-col gap-3 transition-all duration-300 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0 pointer-events-none'}`}>
            <button
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="p-3 bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white rounded-full shadow-2xl hover:scale-110 transition-all group"
                title={t.backToTop}
            >
                <ArrowUp className="w-5 h-5" />
            </button>
            <button
                onClick={addChapter}
                className="p-3 bg-neutral-900 border border-neutral-800 text-blue-400 hover:text-blue-300 rounded-full shadow-2xl hover:scale-110 transition-all group"
                title="Add Chapter"
            >
                <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" />
            </button>
            <button
                onClick={addBlock}
                className="p-3 bg-neutral-900 border border-neutral-800 text-purple-400 hover:text-purple-300 rounded-full shadow-2xl hover:scale-110 transition-all group"
                title="Add Block"
            >
                <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" />
            </button>
            <button
                onClick={saveComic}
                disabled={saving}
                className="p-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl shadow-2xl shadow-blue-500/20 hover:scale-110 transition-all flex items-center justify-center disabled:opacity-50"
                title={t.saveDraft}
            >
                {saving ? <Loader2 className="w-6 h-6 animate-spin" /> : <Save className="w-6 h-6" />}
            </button>
        </div>
    );
}

export default function ComicBlockEditor() {
    const { t } = useLanguage();
    const { blocks, addBlock, addChapter, saveComic, publishComic, initialDataLoaded, saving } = useComicBlocks();
    const [viewMode, setViewMode] = useState<'book' | 'characters' | 'settings'>('book');
    const [activeChapterId, setActiveChapterId] = useState<string | null>(null);

    const chapters = React.useMemo(() => getChapterItems(blocks), [blocks]);
    const blockIndexById = React.useMemo(() => new Map(blocks.map((block, index) => [block.id, index])), [blocks]);

    const effectiveActiveChapterId = React.useMemo(() => {
        if (chapters.length === 0) return null;
        if (activeChapterId && chapters.some(chapter => chapter.id === activeChapterId)) {
            return activeChapterId;
        }
        return chapters[0].id;
    }, [activeChapterId, chapters]);

    const visibleBlocks = React.useMemo(() => {
        if (chapters.length === 0 || !effectiveActiveChapterId) return blocks;

        const chapterIndex = chapters.findIndex(chapter => chapter.id === effectiveActiveChapterId);
        if (chapterIndex === -1) return blocks;

        const startIndex = chapterIndex === 0 ? 0 : chapters[chapterIndex].index;
        const endIndex = chapterIndex < chapters.length - 1 ? chapters[chapterIndex + 1].index : blocks.length;

        return blocks.slice(startIndex, endIndex);
    }, [blocks, chapters, effectiveActiveChapterId]);

    if (!initialDataLoaded) {
        return (
            <div className="flex-1 flex items-center justify-center py-20">
                <div className="flex flex-col items-center text-neutral-500 gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                    <p>{t.loadingComic}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen pb-32 relative">
            <div className="max-w-[1400px] mx-auto p-4 md:p-6 lg:px-8 xl:px-12">
                {/* Header Actions */}
                <div className="flex items-center justify-between sticky top-0 z-10 bg-neutral-900/90 backdrop-blur-md py-3 -mx-4 md:-mx-6 px-4 md:px-6 border-b border-neutral-800 mb-6">
                    <div className="flex items-center gap-4">
                        <Link href="/admin" className="p-2 -ml-2 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors" title={t.cancelCrop}>
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <h2 className="text-lg font-bold text-white tracking-tight">{t.editor}</h2>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={saveComic}
                            disabled={saving}
                            className="flex items-center gap-2 bg-neutral-800 hover:bg-neutral-700 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all border border-neutral-700 hover:border-neutral-600 disabled:opacity-50 active:scale-95 shadow-lg"
                        >
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            {saving ? t.saving : t.saveDraft}
                        </button>
                        <button
                            onClick={publishComic}
                            disabled={saving}
                            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-xl text-sm font-bold transition-all disabled:opacity-50 active:scale-95 shadow-xl shadow-blue-500/20"
                        >
                            {t.publish}
                        </button>
                    </div>
                </div>

                <div className="flex flex-col xl:flex-row gap-8 items-start">
                    {/* Main Content Area */}
                    <div className="flex-1 w-full max-w-3xl mx-auto xl:mx-0 order-2 xl:order-1">
                        {/* Navigation Tabs */}
                        <div className="flex bg-neutral-950/40 p-1 rounded-2xl border border-neutral-800/50 mb-8 max-w-2xl mx-auto">
                            <button
                                onClick={() => setViewMode('book')}
                                className={`flex-1 py-3 text-xs font-black uppercase tracking-widest transition-all rounded-xl flex items-center justify-center gap-2 ${viewMode === 'book'
                                    ? 'text-blue-400 bg-neutral-900 shadow-xl border border-neutral-800'
                                    : 'text-neutral-500 hover:text-neutral-300'
                                    }`}
                            >
                                <ImageIcon className="w-4 h-4" />
                                {t.work}
                            </button>
                            <button
                                onClick={() => setViewMode('characters')}
                                className={`flex-1 py-3 text-xs font-black uppercase tracking-widest transition-all rounded-xl flex items-center justify-center gap-2 ${viewMode === 'characters'
                                    ? 'text-purple-400 bg-neutral-900 shadow-xl border border-neutral-800'
                                    : 'text-neutral-500 hover:text-neutral-300'
                                    }`}
                            >
                                <Users className="w-4 h-4" />
                                {t.characters}
                            </button>
                            <button
                                onClick={() => setViewMode('settings')}
                                className={`flex-1 py-3 text-xs font-black uppercase tracking-widest transition-all rounded-xl flex items-center justify-center gap-2 ${viewMode === 'settings'
                                    ? 'text-amber-400 bg-neutral-900 shadow-xl border border-neutral-800'
                                    : 'text-neutral-500 hover:text-neutral-300'
                                    }`}
                            >
                                <Settings className="w-4 h-4" />
                                {t.settings}
                            </button>
                        </div>

                        {viewMode === 'book' ? (
                            <>
                                {chapters.length > 0 && (
                                    <div className="mb-6 p-3 rounded-xl border border-neutral-800 bg-neutral-950/40">
                                        <p className="text-[10px] font-black tracking-widest uppercase text-neutral-500 mb-3">
                                            {t.editingChapter}
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                            {chapters.map((chapter, chapterIndex) => (
                                                <button
                                                    key={chapter.id}
                                                    onClick={() => setActiveChapterId(chapter.id)}
                                                    className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-colors max-w-full ${effectiveActiveChapterId === chapter.id
                                                        ? 'bg-blue-500/15 border-blue-500/40 text-blue-300'
                                                        : 'border-neutral-800 text-neutral-400 hover:text-neutral-200 hover:border-neutral-700'
                                                        }`}
                                                    title={chapter.title}
                                                >
                                                    {chapterIndex + 1}. {chapter.title}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Block List */}
                                <div className="space-y-6">
                                    {visibleBlocks.map((block) => {
                                        const blockIndex = blockIndexById.get(block.id) ?? 0;
                                        return (
                                            <div key={block.id} id={`editor-block-${block.id}`}>
                                                <BlockCard
                                                    blockId={block.id}
                                                    index={blockIndex}
                                                    total={blocks.length}
                                                />
                                            </div>
                                        );
                                    })}
                                </div>

                                <div className="flex flex-col sm:flex-row gap-4 mt-8">
                                    <button
                                        onClick={addBlock}
                                        className="flex-1 py-5 rounded-2xl border-2 border-dashed border-neutral-800 hover:border-neutral-600 text-neutral-500 hover:text-white transition-all text-sm font-bold flex items-center justify-center gap-2 group shadow-inner bg-neutral-950/20 active:scale-[0.98]"
                                    >
                                        <Plus className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                        {t.addBlock}
                                    </button>
                                    <button
                                        onClick={addChapter}
                                        className="flex-1 py-5 rounded-2xl border-2 border-dashed border-blue-900/20 hover:border-blue-500/30 text-neutral-500 hover:text-blue-400 transition-all text-sm font-bold flex items-center justify-center gap-2 group shadow-inner bg-blue-500/5 active:scale-[0.98]"
                                    >
                                        <Plus className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                        {t.addChapter}
                                    </button>
                                </div>
                            </>
                        ) : viewMode === 'characters' ? (
                            <div className="pt-4">
                                <CharacterManagement />
                            </div>
                        ) : (
                            <div className="pt-4">
                                <ComicSettings />
                            </div>
                        )}
                    </div>

                    {/* Desktop Sidebar Navigator */}
                    {viewMode === 'book' && (
                        <ChapterNavigator
                            activeChapterId={effectiveActiveChapterId}
                            onSelectChapter={(chapterId) => setActiveChapterId(chapterId)}
                        />
                    )}
                </div>
            </div>

            {/* Floating Quick Actions */}
            {viewMode === 'book' && <FloatingActions />}
        </div>
    );
}
