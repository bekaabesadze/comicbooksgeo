import { cookies } from 'next/headers';
import { adminAuth } from '@/lib/firebase/admin';
import { redirect } from 'next/navigation';

export default async function AdminProtectedLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('__session')?.value;

    if (!sessionCookie) {
        redirect('/admin/login');
    }

    try {
        const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie, true);
        if (decodedClaims.admin !== true) {
            console.error('User lacks admin claim.');
            redirect('/');
        }
    } catch (error) {
        console.error('Invalid or expired session cookie:', error);
        redirect('/admin/login');
    }

    return <>{children}</>;
}
