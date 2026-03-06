'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { db, storage } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { useLanguage } from '@/context/LanguageContext';
import { inferBookCategory } from '@/lib/bookCategory';
import { ImageIcon, Heart, X, Loader2 } from 'lucide-react';
import ImageCropper from './ImageCropper';

interface CreateComicModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function CreateComicModal({ isOpen, onClose }: CreateComicModalProps) {
    const { t, language } = useLanguage();
    const router = useRouter();
    const [title, setTitle] = useState('');
    const [author, setAuthor] = useState('Admin');
    const [category, setCategory] = useState('');
    const [coverFile, setCoverFile] = useState<File | null>(null);
    const [tempImageUrl, setTempImageUrl] = useState<string | null>(null);
    const [croppedUrl, setCroppedUrl] = useState('');
    const [showCropper, setShowCropper] = useState(false);
    const [loading, setLoading] = useState(false);
    const [isSchoolMaterial, setIsSchoolMaterial] = useState(false);
    const [grade, setGrade] = useState<number>(8);
    const [isDragging, setIsDragging] = useState(false);
    const suggestedCategory = useMemo(() => inferBookCategory(title)?.[language] || '', [title, language]);

    const handleFileSelect = (file: File) => {
        if (file.size > 15 * 1024 * 1024) {
            alert((t as any).fileTooLarge || "File is too large. Maximum size is 15MB.");
            return;
        }
        if (!file.type.startsWith('image/')) {
            alert((t as any).invalidFileType || "Only image files are allowed.");
            return;
        }
        setCoverFile(file);
        setTempImageUrl(URL.createObjectURL(file));
        setShowCropper(true);
    };

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !author.trim()) return;

        setLoading(true);
        try {
            const coverUrl = croppedUrl;
            let rawCoverUrl = '';

            if (coverFile) {
                const timestamp = Date.now();
                const safeName = coverFile.name.replace(/[^a-zA-Z0-9.\-_]/g, '');
                const storageRef = ref(storage, `covers/raw_${timestamp}_${safeName}`);

                const uploadTask = await uploadBytesResumable(storageRef, coverFile);
                rawCoverUrl = await getDownloadURL(uploadTask.ref);
            }

            const safeCategory = category.trim().slice(0, 120) || suggestedCategory;
            const payload = {
                title,
                author,
                category: safeCategory,
                coverUrl,
                rawCoverUrl,
                isPublished: false,
                isSchoolMaterial,
                grade: isSchoolMaterial ? grade : null,
                blocks: [{ id: `block_${Date.now()}_init`, text: '', imageUrl: '' }],
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            };

            const docRef = await addDoc(collection(db, 'comics'), payload);

            onClose();
            router.push(`/admin/editor/${docRef.id}`);
        } catch (error) {
            console.error('Error creating comic placeholder:', error);
            alert(t.failedToStart);
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div
                className="bg-[#0d1117] border border-white/[0.08] p-8 rounded-xl shadow-2xl max-w-md w-full relative animate-in zoom-in-95 fade-in"
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-white/20 hover:text-white/60 transition-colors p-1"
                >
                    <X className="w-5 h-5" />
                </button>

                <h2 className="text-xl font-bold text-white mb-1">{t.createNew}</h2>
                <p className="text-white/30 text-sm mb-6">{t.startNewDraft}</p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-[11px] font-bold text-white/25 uppercase tracking-wider mb-1 pointer-events-none">{t.comicTitle}</label>
                        <input
                            type="text"
                            required
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg p-3 text-white text-sm focus:outline-none focus:border-blue-500/50 transition-colors placeholder:text-white/15"
                            placeholder={t.titlePlaceholder}
                        />
                    </div>

                    <div>
                        <label className="block text-[11px] font-bold text-white/25 uppercase tracking-wider mb-1 pointer-events-none">{t.authorName}</label>
                        <input
                            type="text"
                            required
                            value={author}
                            onChange={(e) => setAuthor(e.target.value)}
                            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg p-3 text-white text-sm focus:outline-none focus:border-blue-500/50 transition-colors placeholder:text-white/15"
                            placeholder={t.authorPlaceholder}
                        />
                    </div>

                    <div>
                        <label className="block text-[11px] font-bold text-white/25 uppercase tracking-wider mb-1 pointer-events-none">{t.category}</label>
                        <div className="space-y-2">
                            <input
                                type="text"
                                maxLength={120}
                                value={category}
                                onChange={(e) => setCategory(e.target.value.slice(0, 120))}
                                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg p-3 text-white text-sm focus:outline-none focus:border-blue-500/50 transition-colors placeholder:text-white/15"
                                placeholder={t.categoryPlaceholder}
                            />
                            {suggestedCategory && category.trim() !== suggestedCategory && (
                                <button
                                    type="button"
                                    onClick={() => setCategory(suggestedCategory)}
                                    className="inline-flex items-center gap-2 text-[11px] px-3 py-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-300 hover:bg-blue-500/20 transition-colors"
                                >
                                    <span className="font-black uppercase tracking-widest">{t.suggestedCategory}</span>
                                    <span className="font-medium">{suggestedCategory}</span>
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-white/[0.03] border border-white/[0.06] rounded-lg">
                        <label className="text-sm font-bold text-white/70 cursor-pointer" htmlFor="school-material-toggle">
                            {t.schoolMaterial}
                        </label>
                        <button
                            type="button"
                            id="school-material-toggle"
                            onClick={() => setIsSchoolMaterial(!isSchoolMaterial)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${isSchoolMaterial ? 'bg-blue-600' : 'bg-white/10'
                                }`}
                        >
                            <span
                                className={`${isSchoolMaterial ? 'translate-x-6' : 'translate-x-1'
                                    } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                            />
                        </button>
                    </div>

                    {isSchoolMaterial && (
                        <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                            <label className="block text-[11px] font-bold text-white/25 uppercase tracking-wider mb-2 pointer-events-none">{t.grade}</label>
                            <div className="grid grid-cols-5 gap-2">
                                {[8, 9, 10, 11, 12].map((g) => (
                                    <button
                                        key={g}
                                        type="button"
                                        onClick={() => setGrade(g)}
                                        className={`py-2 rounded-lg text-sm font-bold transition-all border ${grade === g
                                            ? 'bg-blue-600 border-blue-500 text-white'
                                            : 'bg-white/[0.03] border-white/[0.06] text-white/30 hover:border-white/[0.12] hover:text-white/50'
                                            }`}
                                    >
                                        {g}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="block text-[11px] font-bold text-white/25 uppercase tracking-wider mb-3 pointer-events-none">{t.coverImageOptional}</label>
                        <div className="space-y-4">
                            {!croppedUrl ? (
                                <div className="flex gap-4">
                                    <input
                                        type="file"
                                        id="cover-upload"
                                        accept="image/*"
                                        onChange={(e) => {
                                            if (e.target.files && e.target.files.length > 0) {
                                                handleFileSelect(e.target.files[0]);
                                            }
                                        }}
                                        className="hidden"
                                    />
                                    <label
                                        htmlFor="cover-upload"
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
                                                handleFileSelect(e.dataTransfer.files[0]);
                                            }
                                        }}
                                        className={`flex-1 border-2 border-dashed rounded-xl p-5 text-sm transition-colors cursor-pointer text-center font-bold flex flex-col items-center gap-2 group ${isDragging ? 'border-blue-500 bg-blue-500/10 text-blue-400' : 'bg-white/[0.02] border-white/[0.08] text-white hover:border-blue-500/30 hover:bg-blue-500/[0.02]'}`}
                                    >
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${isDragging ? 'bg-blue-500/20' : 'bg-white/[0.04] group-hover:bg-blue-500/15'}`}>
                                            <ImageIcon className={`w-5 h-5 transition-colors ${isDragging ? 'text-blue-400' : 'text-white/20 group-hover:text-blue-400'}`} />
                                        </div>
                                        <span className={`text-xs transition-colors ${isDragging ? 'text-blue-300' : 'text-white/25 group-hover:text-white/40'}`}>{t.uploadImage}</span>
                                    </label>
                                </div>
                            ) : (
                                <div className="flex justify-center">
                                    <div className="relative w-40 aspect-[3/4] bg-neutral-900 rounded-xl overflow-hidden border-2 border-blue-500/30 group shadow-2xl">
                                        <img src={croppedUrl} alt="Preview" className="w-full h-full object-cover" />

                                        <div className="absolute inset-0 flex items-end p-3 bg-gradient-to-t from-blue-950/90 via-transparent to-transparent pointer-events-none">
                                            <span className="text-[10px] font-black tracking-wider text-blue-300 uppercase">{t.readNow} →</span>
                                        </div>

                                        <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-blue-400/80 rounded-tl-xl pointer-events-none" />
                                        <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-blue-400/80 rounded-br-xl pointer-events-none" />

                                        <div className="absolute top-2 right-2 p-1.5 pointer-events-none">
                                            <Heart className="w-4 h-4 text-white/40" />
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => setShowCropper(true)}
                                            className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold font-mono uppercase tracking-widest"
                                        >
                                            {t.adjustCover}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg transition-colors mt-4 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>{t.initializing}</span>
                            </>
                        ) : (
                            <span>{t.startCreating}</span>
                        )}
                    </button>
                </form>

                {showCropper && tempImageUrl && (
                    <ImageCropper
                        imageUrl={tempImageUrl}
                        aspect={3 / 4}
                        onCropComplete={(url) => {
                            setCroppedUrl(url);
                            setShowCropper(false);
                        }}
                        onCancel={() => setShowCropper(false)}
                    />
                )}
            </div>
        </div>
    );
}
