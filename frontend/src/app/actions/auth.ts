'use server';

import { cookies } from 'next/headers';
import { adminAuth } from '@/lib/firebase/admin';
import { redirect } from 'next/navigation';
import { isRedirectError } from 'next/dist/client/components/redirect-error';

export async function verifyAdminAccess(prevState: any, formData: FormData) {
    const idToken = formData.get('idToken') as string;
    const password = formData.get('password') as string;

    if (!idToken) return { error: 'Missing authentication token' };

    // Extra passphrase gate if configured
    const securePassword = process.env.ADMIN_PASSWORD;
    if (securePassword && password !== securePassword) {
        return { error: 'Incorrect password' };
    }

    try {
        const decodedToken = await adminAuth.verifyIdToken(idToken);

        if (decodedToken.admin === true) {
            const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 days
            const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn });

            const cookieStore = await cookies();
            cookieStore.set('__session', sessionCookie, {
                maxAge: 60 * 60 * 24 * 5,
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                path: '/',
                sameSite: 'lax'
            });

            redirect('/admin');
        } else {
            return { error: 'Access denied: You do not have admin privileges. Contact owner to assign the claim.' };
        }
    } catch (error) {
        if (isRedirectError(error)) throw error;
        console.error('Session creation failed:', error);
        return { error: 'Invalid or expired token.' };
    }
}
