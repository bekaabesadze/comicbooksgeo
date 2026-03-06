'use client';

import React, { useEffect, useRef, useState } from 'react';
import { UserPlus, ImageIcon, Loader2, X } from 'lucide-react';
import { useComicBlocks } from './ComicBlockContext';
import { useLanguage } from '@/context/LanguageContext';
import CharacterImageCropper from './CharacterImageCropper';

const MAX_IMAGE_SIZE_BYTES = 15 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export default function CharacterManagement() {
    const { t, language } = useLanguage();
    const { characters, addCharacter, updateCharacter, removeCharacter } = useComicBlocks();
    const [uploadingId, setUploadingId] = useState<string | null>(null);
    const [draggingId, setDraggingId] = useState<string | null>(null);
    const [cropperState, setCropperState] = useState<{ charId: string; imageUrl: string } | null>(null);
    const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
    const cropObjectUrlRef = useRef<string | null>(null);

    useEffect(() => {
        return () => {
            if (cropObjectUrlRef.current) {
                URL.revokeObjectURL(cropObjectUrlRef.current);
                cropObjectUrlRef.current = null;
            }
        };
    }, []);

    const resetCropperState = () => {
        if (cropObjectUrlRef.current) {
            URL.revokeObjectURL(cropObjectUrlRef.current);
            cropObjectUrlRef.current = null;
        }
        setCropperState(null);
    };

    const validateImageFile = (file: File): string | null => {
        if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
            return t.onlyImagesAllowed;
        }
        if (file.size > MAX_IMAGE_SIZE_BYTES) {
            return t.imageSizeLimit;
        }
        return null;
    };

    const handleFileSelect = (charId: string, file: File) => {
        const validationError = validateImageFile(file);
        if (validationError) {
            alert(validationError);
            if (fileInputRefs.current[charId]) {
                fileInputRefs.current[charId]!.value = '';
            }
            return;
        }

        if (cropObjectUrlRef.current) {
            URL.revokeObjectURL(cropObjectUrlRef.current);
        }

        const localImageUrl = URL.createObjectURL(file);
        cropObjectUrlRef.current = localImageUrl;
        setCropperState({ charId, imageUrl: localImageUrl });

        if (fileInputRefs.current[charId]) {
            fileInputRefs.current[charId]!.value = '';
        }
    };

    const handleImageSelect = (charId: string, e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.[0]) return;
        handleFileSelect(charId, e.target.files[0]);
    };

    const handleCroppedImageUpload = async (blob: Blob) => {
        if (!cropperState) return;
        setUploadingId(cropperState.charId);
        try {
            const { storage } = await import('@/lib/firebase');
            const { ref, uploadBytesResumable, getDownloadURL } = await import('firebase/storage');

            const timestamp = Date.now();
            const storageRef = ref(storage, `characters/${timestamp}_${cropperState.charId}.jpg`);

            const uploadTask = await uploadBytesResumable(storageRef, blob, {
                contentType: 'image/jpeg',
            });
            const downloadUrl = await getDownloadURL(uploadTask.ref);

            updateCharacter(cropperState.charId, { imageUrl: downloadUrl });
        } catch (error) {
            console.error('Error uploading character image:', error);
            alert(t.uploadFailed);
        } finally {
            setUploadingId(null);
            resetCropperState();
        }
    };

    return (
        <>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <UserPlus className="w-5 h-5 text-blue-400" />
                        {t.characters}
                    </h3>
                    <button
                        onClick={addCharacter}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-md text-xs font-bold transition-colors flex items-center gap-2"
                    >
                        <UserPlus className="w-4 h-4" />
                        {t.addCharacter}
                    </button>
                </div>

                {characters.length === 0 ? (
                    <div className="text-center py-10 bg-neutral-950/30 rounded-xl border border-neutral-800/50 border-dashed">
                        <p className="text-neutral-500 text-sm italic">{t.noCharacters}</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        {characters.map((char) => (
                            <div key={char.id} className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 flex gap-4 relative group">
                                <button
                                    onClick={() => removeCharacter(char.id)}
                                    className="absolute top-2 right-2 p-1.5 rounded-md bg-neutral-900 border border-neutral-800 text-neutral-500 hover:text-red-400 hover:border-red-900/50 transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>

                                <div
                                    className={`w-24 h-24 shrink-0 rounded-full overflow-hidden relative border ${draggingId === char.id ? 'border-blue-500 bg-blue-500/20' : 'bg-neutral-900 border-neutral-800'}`}
                                    onDragOver={(e) => {
                                        e.preventDefault();
                                        setDraggingId(char.id);
                                    }}
                                    onDragLeave={(e) => {
                                        e.preventDefault();
                                        if (draggingId === char.id) setDraggingId(null);
                                    }}
                                    onDrop={(e) => {
                                        e.preventDefault();
                                        setDraggingId(null);
                                        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                                            handleFileSelect(char.id, e.dataTransfer.files[0]);
                                        }
                                    }}
                                >
                                    {char.imageUrl ? (
                                        <img src={char.imageUrl} alt={char.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-neutral-700">
                                            <ImageIcon className="w-8 h-8" />
                                        </div>
                                    )}
                                    <input
                                        type="file"
                                        accept="image/jpeg,image/png,image/webp"
                                        className="hidden"
                                        ref={(el) => { fileInputRefs.current[char.id] = el; }}
                                        onChange={(e) => handleImageSelect(char.id, e)}
                                    />
                                    <button
                                        onClick={() => fileInputRefs.current[char.id]?.click()}
                                        disabled={uploadingId === char.id}
                                        className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                                    >
                                        {uploadingId === char.id ? (
                                            <Loader2 className="w-5 h-5 text-white animate-spin" />
                                        ) : (
                                            <ImageIcon className="w-5 h-5 text-white" />
                                        )}
                                    </button>
                                </div>

                                <div className="flex-1 space-y-3">
                                    <div>
                                        <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-1">{t.charName}</label>
                                        <input
                                            type="text"
                                            value={char.name}
                                            onChange={(e) => updateCharacter(char.id, { name: e.target.value })}
                                            placeholder={t.charName}
                                            className="w-full bg-neutral-900 border border-neutral-800 rounded-md px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500/50"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-1">{t.charDescription}</label>
                                        <textarea
                                            value={char.description}
                                            onChange={(e) => updateCharacter(char.id, { description: e.target.value })}
                                            placeholder={t.charDescription}
                                            className="w-full bg-neutral-900 border border-neutral-800 rounded-md px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500/50 min-h-[60px] resize-y"
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {cropperState && (
                <CharacterImageCropper
                    imageUrl={cropperState.imageUrl}
                    onCancel={resetCropperState}
                    onApply={handleCroppedImageUpload}
                />
            )}
        </>
    );
}
