import type { Language } from './translations';

type LocalizedCategory = {
    ka: string;
    en: string;
};

const RESEARCHED_CATEGORY_RULES: Array<{
    matchers: string[];
    category: LocalizedCategory;
}> = [
        {
            matchers: [
                'ვეფხისტყაოსანი',
                'the knight in the panther s skin',
            ],
            category: {
                ka: 'ეპიკური პოემა (რაინდული რომანსი)',
                en: 'Epic poem (chivalric romance)',
            },
        },
        {
            matchers: [
                'მესაფლავე',
                'mesaflave',
                'the gravedigger',
            ],
            category: {
                ka: 'ლექსი / ბალადა',
                en: 'Poem / ballad',
            },
        },
        {
            matchers: [
                'აბოს წამება',
                'აბო თბილელის წამება',
                'martyrdom of abo',
                'martyrdom of saint abo',
            ],
            category: {
                ka: 'ჰაგიოგრაფიული თხზულება (მარტვილობა)',
                en: 'Hagiographic work (martyrdom)',
            },
        },
    ];

function normalizeTitle(value: string): string {
    return value
        .normalize('NFKC')
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s]/gu, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

export function inferBookCategory(title?: string | null): LocalizedCategory | null {
    if (!title) return null;
    const normalizedTitle = normalizeTitle(title);
    if (!normalizedTitle) return null;

    const match = RESEARCHED_CATEGORY_RULES.find((rule) =>
        rule.matchers.some((matcher) => normalizedTitle.includes(matcher))
    );

    return match ? match.category : null;
}

export function resolveBookCategory(params: {
    title?: string | null;
    category?: string | null;
    language: Language;
}): string {
    const explicitCategory = params.category?.trim();
    if (explicitCategory) return explicitCategory;

    const inferred = inferBookCategory(params.title);
    return inferred ? inferred[params.language] : '';
}
