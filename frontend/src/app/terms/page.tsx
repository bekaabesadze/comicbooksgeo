'use client';

import { useLanguage } from "@/context/LanguageContext";
import Link from 'next/link';

export default function TermsAndConditions() {
    const { t, language } = useLanguage();

    const isKa = language === 'ka';

    return (
        <main className="min-h-screen bg-black text-white p-8 md:p-24 font-sans">
            <div className="max-w-3xl mx-auto border border-white/10 rounded-2xl p-8 md:p-12 bg-white/5 backdrop-blur-sm">
                <Link
                    href="/"
                    className="text-white/40 hover:text-white mb-8 inline-block transition-colors"
                >
                    {t.backToLibrary}
                </Link>

                <h1 className="text-4xl md:text-5xl font-bold mb-8 bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
                    {t.termsAndConditions}
                </h1>

                <div className="space-y-6 text-lg text-white/70 leading-relaxed">
                    <p>
                        {t.welcomeTerms}
                    </p>
                    <ul className="list-disc pl-6 space-y-3">
                        <li>
                            {t.termContentUsage}
                        </li>
                        <li>
                            {t.termIntellectualProperty}
                        </li>
                        <li>
                            {t.termFreePlatform}
                        </li>
                    </ul>
                    <p>
                        {t.termChanges}
                    </p>
                </div>
            </div>
        </main>
    );
}
