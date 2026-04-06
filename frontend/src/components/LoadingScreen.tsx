'use client';

import { useState, useEffect } from 'react';

export default function LoadingScreen() {
    const [visible, setVisible] = useState(true);
    const [fading, setFading] = useState(false);

    useEffect(() => {
        const fadeTimer = setTimeout(() => setFading(true), 1200);
        const removeTimer = setTimeout(() => setVisible(false), 1500);
        return () => {
            clearTimeout(fadeTimer);
            clearTimeout(removeTimer);
        };
    }, []);

    if (!visible) return null;

    return (
        <div
            className={`fixed inset-0 z-[9999] bg-[#080c14] flex flex-col items-center justify-center transition-opacity duration-300 ${fading ? 'opacity-0' : 'opacity-100'}`}
        >
            <img
                src="/CBA.jpg"
                alt="ComicBooksGeo"
                className="w-20 h-20 rounded-2xl shadow-2xl"
            />
            <p className="text-neutral-600 text-sm mt-4 tracking-widest lowercase">
                loading
            </p>
        </div>
    );
}
