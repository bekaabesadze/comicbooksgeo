'use client';

import React, { useCallback, useRef, useState } from 'react';
import ReactCrop, { centerCrop, makeAspectCrop, type Crop, type PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { Check, Loader2, X } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

interface CharacterImageCropperProps {
    imageUrl: string;
    onCancel: () => void;
    onApply: (blob: Blob) => Promise<void>;
}

function getCenteredSquareCrop(mediaWidth: number, mediaHeight: number): Crop {
    return centerCrop(
        makeAspectCrop(
            {
                unit: '%',
                width: 90,
            },
            1,
            mediaWidth,
            mediaHeight,
        ),
        mediaWidth,
        mediaHeight,
    );
}

export default function CharacterImageCropper({ imageUrl, onCancel, onApply }: CharacterImageCropperProps) {
    const { t, language } = useLanguage();
    const imgRef = useRef<HTMLImageElement | null>(null);
    const [crop, setCrop] = useState<Crop>({
        unit: '%',
        x: 5,
        y: 5,
        width: 90,
        height: 90,
    });
    const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null);
    const [applying, setApplying] = useState(false);

    const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
        const image = e.currentTarget;
        imgRef.current = image;
        setCrop(getCenteredSquareCrop(image.naturalWidth, image.naturalHeight));
    }, []);

    const handleApply = async () => {
        if (!imgRef.current || !completedCrop || completedCrop.width <= 0 || completedCrop.height <= 0) {
            return;
        }

        setApplying(true);
        try {
            const image = imgRef.current;
            const canvas = document.createElement('canvas');

            const scaleX = image.naturalWidth / image.width;
            const scaleY = image.naturalHeight / image.height;
            const cropWidth = Math.max(1, Math.floor(completedCrop.width * scaleX));
            const cropHeight = Math.max(1, Math.floor(completedCrop.height * scaleY));

            canvas.width = cropWidth;
            canvas.height = cropHeight;

            const ctx = canvas.getContext('2d');
            if (!ctx) {
                throw new Error('Failed to get canvas context');
            }

            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(
                image,
                completedCrop.x * scaleX,
                completedCrop.y * scaleY,
                completedCrop.width * scaleX,
                completedCrop.height * scaleY,
                0,
                0,
                cropWidth,
                cropHeight,
            );

            const blob = await new Promise<Blob>((resolve, reject) => {
                canvas.toBlob(
                    (b) => (b ? resolve(b) : reject(new Error('Canvas toBlob failed'))),
                    'image/jpeg',
                    0.95,
                );
            });

            await onApply(blob);
            onCancel();
        } catch (error) {
            console.error('Error applying character crop:', error);
            alert(language === 'ka' ? 'სურათის მოჭრა ვერ მოხერხდა. სცადეთ თავიდან.' : 'Failed to crop image. Please try again.');
        } finally {
            setApplying(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/95 backdrop-blur-md p-4">
            <div className="bg-neutral-900 border border-neutral-700 rounded-2xl w-full max-w-3xl h-[75vh] flex flex-col overflow-hidden shadow-2xl">
                <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 shrink-0 bg-neutral-900">
                    <h3 className="text-white font-black text-xl tracking-tight">{t.cropImage}</h3>
                    <button
                        onClick={onCancel}
                        disabled={applying}
                        className="p-2.5 rounded-xl bg-neutral-800 hover:bg-red-600 text-neutral-300 hover:text-white transition-all shadow-lg active:scale-95 disabled:opacity-50"
                    >
                        <X className="w-7 h-7" />
                    </button>
                </div>

                <div className="flex-1 min-h-0 relative flex items-center justify-center bg-[#050505] p-4 overflow-auto">
                    <ReactCrop
                        crop={crop}
                        onChange={(nextCrop) => setCrop(nextCrop)}
                        onComplete={(nextCrop) => setCompletedCrop(nextCrop.width > 0 && nextCrop.height > 0 ? nextCrop : null)}
                        aspect={1}
                        circularCrop
                        keepSelection
                        className="max-w-full max-h-full"
                    >
                        <img
                            src={imageUrl}
                            alt="Character crop source"
                            onLoad={onImageLoad}
                            className="max-h-[calc(75vh-160px)] w-auto max-w-full object-contain block mx-auto"
                        />
                    </ReactCrop>
                </div>

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
