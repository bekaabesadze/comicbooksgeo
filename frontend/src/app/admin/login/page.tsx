'use client';

import { useState, useActionState, useEffect } from 'react';
import { useFormStatus } from 'react-dom';
import { verifyAdminAccess } from '@/app/actions/auth';
import { Lock, ArrowRight, ShieldAlert, Loader2 } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';

function SubmitButton() {
    const { pending } = useFormStatus();
    const { t } = useLanguage();

    return (
        <button
            type="submit"
            disabled={pending}
            className="w-full group flex items-center justify-center gap-2 py-3.5 px-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
        >
            {pending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
                <>
                    <span>{t.accessCreatorStudio}</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
            )}
        </button>
    );
}

export default function AdminLogin() {
    const { theme } = useTheme();
    const { t } = useLanguage();
    const isDark = theme === 'dark';
    const { user, loading: authLoading } = useAuth();
    const [idToken, setIdToken] = useState<string>('');

    useEffect(() => {
        if (user) {
            user.getIdToken().then(token => setIdToken(token));
        }
    }, [user]);

    const [state, formAction] = useActionState(verifyAdminAccess, { error: '' });
    const [password, setPassword] = useState('');

    const translatedError = state?.error === 'Password is required' ? t.passwordRequired :
        state?.error === 'Incorrect password' ? t.incorrectPassword :
            state?.error;

    if (authLoading) {
        return (
            <div className="min-h-screen bg-[#080c14] flex items-center justify-center">
                <div className="animate-spin w-8 h-8 border-[3px] border-blue-500/30 border-t-blue-500 rounded-full" />
            </div>
        );
    }

    if (!user) {
        return (
            <div className={`min-h-screen flex items-center justify-center p-4 transition-colors duration-300 ${isDark ? 'bg-[#080c14]' : 'bg-neutral-50'}`}>
                <div className={`text-center p-8 rounded-xl max-w-sm w-full ${isDark ? 'text-white bg-white/[0.03] border border-white/[0.06]' : 'text-black bg-white shadow-lg border border-neutral-200'}`}>
                    <ShieldAlert className="w-10 h-10 text-blue-500 mx-auto mb-4" />
                    <h2 className="text-lg font-bold mb-2">Authentication Required</h2>
                    <p className={`text-sm mb-6 ${isDark ? 'text-white/40' : 'text-neutral-500'}`}>You must be logged in to proceed to the Creator Studio.</p>
                    <a href="/" className="inline-block px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors font-bold text-sm">
                        Return Home to Login
                    </a>
                </div>
            </div>
        );
    }

    return (
        <div className={`min-h-screen flex items-center justify-center p-4 transition-colors duration-300 ${isDark ? 'bg-[#080c14]' : 'bg-neutral-50'}`}>

            <div className={`relative w-full max-w-md p-8 md:p-10 rounded-2xl border ${isDark ? 'bg-white/[0.03] border-white/[0.06]' : 'bg-white border-neutral-200 shadow-lg'
                }`}>

                {/* Header */}
                <div className="flex flex-col items-center mb-8 text-center">
                    <img
                        src="/CBA.jpg"
                        alt="ComicBooksGeo"
                        className="w-12 h-12 rounded-xl object-contain mb-5"
                    />
                    <h1 className={`text-xl font-black tracking-tight mb-1 ${isDark ? 'text-white' : 'text-neutral-900'}`}>
                        {t.creatorAuthentication}
                    </h1>
                    <p className={`text-sm ${isDark ? 'text-white/35' : 'text-neutral-500'}`}>
                        {t.enterPassphrase}
                    </p>
                </div>

                {/* Form */}
                <form action={formAction} className="space-y-5">
                    <input type="hidden" name="idToken" value={idToken} />
                    <div className="space-y-2">
                        <div className="relative">
                            <input
                                type="password"
                                name="password"
                                id="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder={t.enterPassword}
                                className={`w-full px-5 py-4 pl-12 rounded-xl outline-none font-medium !text-lg transition-colors ${isDark
                                    ? 'bg-white/[0.04] border border-white/[0.08] text-white focus:border-blue-500/50 placeholder:text-white/20'
                                    : 'bg-neutral-50 border border-neutral-200 text-neutral-900 focus:border-blue-500 placeholder:text-neutral-400'
                                    }`}
                                required
                                autoFocus
                            />
                            <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${password ? 'text-blue-500' : (isDark ? 'text-white/15' : 'text-neutral-400')
                                }`} />
                        </div>

                        {/* Error Message */}
                        {state?.error && (
                            <div className="flex items-center gap-2 p-3 mt-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-medium animate-in slide-in-from-top-2 fade-in">
                                <ShieldAlert className="w-4 h-4 shrink-0" />
                                <p>{translatedError}</p>
                            </div>
                        )}
                    </div>

                    <SubmitButton />
                </form>

                {/* Footer info */}
                <div className={`mt-8 text-center text-xs font-medium space-y-1 ${isDark ? 'text-white/15' : 'text-neutral-400'}`}>
                    <p>{t.restrictedArea}</p>
                    <p>{t.accessLogged}</p>
                </div>
            </div>
        </div>
    );
}
