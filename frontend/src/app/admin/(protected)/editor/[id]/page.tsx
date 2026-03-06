'use client';

import React from 'react';
import { ComicBlockProvider } from '@/components/ComicEditor/ComicBlockContext';
import ComicBlockEditor from '@/components/ComicEditor/ComicBlockEditor';

export default function ComicCreatorPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = React.use(params);

    return (
        <ComicBlockProvider comicId={id}>
            <div className="flex-1 overflow-y-auto bg-[#080c14]">
                <ComicBlockEditor />
            </div>
        </ComicBlockProvider>
    );
}
