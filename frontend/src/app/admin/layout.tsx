'use client';

import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Globe } from 'lucide-react';

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !user) {
            router.push('/');
        }
    }, [user, loading, router]);

    if (loading || !user) {
        return (
            <div className="min-h-screen bg-[#080c14] flex items-center justify-center">
                <div className="animate-spin w-8 h-8 border-[3px] border-blue-500/30 border-t-blue-500 rounded-full" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#080c14] text-white flex flex-col">
            <header className="h-14 border-b border-white/[0.06] bg-[#0a0f1a] flex items-center px-5 justify-between shrink-0">
                <Link href="/admin" className="flex items-center gap-2.5">
                    <img
                        src="/CBA.jpg"
                        alt="Logo"
                        className="w-7 h-7 rounded-md object-contain"
                    />
                    <span className="font-bold text-sm tracking-tight text-white/90">
                        Comic<span className="text-blue-400">Books</span><span className="text-blue-600">Geo</span>
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400/70 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/15">
                        Creator
                    </span>
                </Link>
                <div className="flex gap-1.5 items-center">
                    <Link
                        href="/"
                        className="flex items-center gap-1.5 text-xs font-medium text-white/40 hover:text-white/70 transition-colors px-3 py-1.5 rounded-lg hover:bg-white/[0.04]"
                    >
                        <Globe className="w-3.5 h-3.5" />
                        Public Site
                    </Link>
                </div>
            </header>
            <main className="flex-1 overflow-hidden">{children}</main>
        </div>
    );
}
