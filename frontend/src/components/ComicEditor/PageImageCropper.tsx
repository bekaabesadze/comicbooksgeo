'use client';

import React, { useState, useRef, useCallback } from 'react';
import ReactCrop, { type Crop, type PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { X, Check, Loader2 } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

interface PageImageCropperProps {
    imageUrl: string;
    onCropComplete: (croppedImageUrl: string, cropData: { x: number; y: number; width: number; height: number; unit: '%' }) => void;
    onCancel: () => void;
}

export default function PageImageCropper({ imageUrl, onCropComplete, onCancel }: PageImageCropperProps) {
    const { t } = useLanguage();
    const imgRef = useRef<HTMLImageElement | null>(null);
    // Locked 16:9 aspect ratio
    const [aspect] = useState<number>(16 / 9);
    const [crop, setCrop] = useState<Crop>({
        unit: '%',
        x: 0,
        y: 0,
        width: 100,
        height: 100,
    });
    const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null);
    const [applying, setApplying] = useState(false);

    const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
        imgRef.current = e.currentTarget;
    }, []);

    const handleApply = async () => {
        if (!imgRef.current || !completedCrop) return;

        setApplying(true);
        try {
            const image = imgRef.current;
            const canvas = document.createElement('canvas');

            // Use naturalWidth/Height to get full-resolution crop
            const scaleX = image.naturalWidth / image.width;
            const scaleY = image.naturalHeight / image.height;

            canvas.width = completedCrop.width * scaleX;
            canvas.height = completedCrop.height * scaleY;

            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error('Failed to get canvas context');

            ctx.drawImage(
                image,
                completedCrop.x * scaleX,
                completedCrop.y * scaleY,
                completedCrop.width * scaleX,
                completedCrop.height * scaleY,
                0,
                0,
                canvas.width,
                canvas.height,
            );

            // Convert canvas to blob
            const blob = await new Promise<Blob>((resolve, reject) => {
                canvas.toBlob(
                    (b) => (b ? resolve(b) : reject(new Error('Canvas toBlob failed'))),
                    'image/jpeg',
                    0.92,
                );
            });

            if (blob.size > 15 * 1024 * 1024) {
                alert((t as any).fileTooLarge || "File is too large. Maximum size is 15MB.");
                setApplying(false);
                return;
            }

            // Upload to Firebase Storage
            const { storage } = await import('@/lib/firebase');
            const { ref, uploadBytesResumable, getDownloadURL } = await import('firebase/storage');

            const timestamp = Date.now();
            const storageRef = ref(storage, `blocks/cropped_page_${timestamp}.jpg`);
            const uploadTask = await uploadBytesResumable(storageRef, blob);
            const downloadUrl = await getDownloadURL(uploadTask.ref);

            // Calculate %-based crop data from the displayed crop
            const cropData = {
                x: (completedCrop.x / image.width) * 100,
                y: (completedCrop.y / image.height) * 100,
                width: (completedCrop.width / image.width) * 100,
                height: (completedCrop.height / image.height) * 100,
                unit: '%' as const,
            };

            onCropComplete(downloadUrl, cropData);
        } catch (error) {
            console.error('Error applying crop:', error);
            alert('Failed to apply crop. Please try again.');
        } finally {
            setApplying(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-md p-4">
            <div className="bg-neutral-900 border border-neutral-700 rounded-2xl w-full max-w-4xl h-[75vh] flex flex-col overflow-hidden shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 shrink-0 bg-neutral-900">
                    <div className="flex items-center gap-4">
                        <h3 className="text-white font-black text-xl tracking-tight">{t.cropImage}</h3>
                        <span className="text-[10px] px-3 py-1 bg-blue-600/20 text-blue-400 rounded-full border border-blue-500/30 font-black tracking-widest uppercase shadow-inner">
                            16:9 Balanced
                        </span>
                    </div>
                    <button
                        onClick={onCancel}
                        className="p-2.5 rounded-xl bg-neutral-800 hover:bg-red-600 text-neutral-300 hover:text-white transition-all shadow-lg active:scale-95"
                    >
                        <X className="w-7 h-7" />
                    </button>
                </div>

                {/* Crop Area */}
                <div className="flex-1 min-h-0 relative flex items-center justify-center bg-[#050505] p-4 overflow-auto">
                    <div className="w-full h-full flex items-center justify-center">
                        <ReactCrop
                            crop={crop}
                            onChange={(c) => setCrop(c)}
                            onComplete={(c) => setCompletedCrop(c)}
                            aspect={aspect}
                            className="max-w-full max-h-full"
                        >
                            <img
                                src={imageUrl}
                                alt="Crop source"
                                onLoad={onImageLoad}
                                className="max-h-[calc(75vh-160px)] w-auto max-w-full object-contain block mx-auto"
                                crossOrigin="anonymous"
                            />
                        </ReactCrop>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-neutral-800 shrink-0">
                    <button
                        onClick={onCancel}
                        disabled={applying}
                        className="px-5 py-2.5 rounded-lg text-sm font-semibold text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors disabled:opacity-50"
                    >
                        {t.cancelCrop}
                    </button>
                    <button
                        onClick={handleApply}
                        disabled={applying || !completedCrop}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold bg-green-600 hover:bg-green-500 text-white transition-colors disabled:opacity-50"
                    >
                        {applying ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                {t.updating}
                            </>
                        ) : (
                            <>
                                <Check className="w-4 h-4" />
                                {t.applyCrop}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
