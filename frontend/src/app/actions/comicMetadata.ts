'use server';

import { getAdminDb } from '@/lib/firebase/admin';

export async function getComicMetadata(id: string) {
    try {
        const adminDb = getAdminDb();
        const docSnap = await adminDb.collection('comics').doc(id).get();
        if (!docSnap.exists) return null;

        const data = docSnap.data();
        if (!data) return null;

        // Return ONLY metadata
        return {
            title: data.title || '',
            author: data.author || '',
            category: data.category || '',
            coverUrl: data.coverUrl || '',
            isPublished: data.isPublished || false
        };
    } catch (error) {
        console.error('Failed to fetch comic metadata:', error);
        return null;
    }
}

export async function getAllComicsSecurely() {
    try {
        const adminDb = getAdminDb();
        const snapshot = await adminDb.collection('comics').get();

        const comics = snapshot.docs.map(doc => {
            const data = doc.data();

            // Extract the first page image securely
            let firstPageUrl = data.coverUrl || null;
            if (!firstPageUrl && data.blocks && data.blocks.length > 0) {
                firstPageUrl = data.blocks[0].croppedImageUrl || data.blocks[0].imageUrl || null;
            }

            return {
                id: doc.id,
                title: data.title || '',
                author: data.author || '',
                category: data.category || '',
                isPublished: data.isPublished || false,
                isSchoolMaterial: data.isSchoolMaterial || false,
                grade: data.grade || null,
                coverUrl: data.coverUrl || null,
                firstPageUrl, // Send this securely
                updatedAt: data.updatedAt ? data.updatedAt.toMillis() : 0,
                views: data.views || 0,
                description: data.description || '',
                // We keep blocks EMPTY for drafts to ensure security from hacking
                blocks: data.isPublished ? data.blocks : []
            };
        });

        // Sort by updatedAt descending
        return comics.sort((a, b) => b.updatedAt - a.updatedAt);
    } catch (error) {
        console.error('Failed to fetch comics securely:', error);
        return [];
    }
}
