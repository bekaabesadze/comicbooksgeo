import * as admin from 'firebase-admin';

function normalizePrivateKey(privateKey: string): string {
    return privateKey.replace(/\\n/g, '\n').trim();
}

function parseServiceAccountFromParts(): admin.ServiceAccount | null {
    const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.trim();

    if (!projectId || !clientEmail || !privateKey) {
        return null;
    }

    return {
        projectId,
        clientEmail,
        privateKey: normalizePrivateKey(privateKey),
    };
}

function parseServiceAccount(jsonValue: string): admin.ServiceAccount {
    const parsed = JSON.parse(jsonValue) as admin.ServiceAccount & { private_key?: unknown };

    if (!parsed || typeof parsed !== 'object') {
        throw new Error('Service account JSON is not an object.');
    }

    if (typeof parsed.private_key !== 'string') {
        throw new Error('Service account private_key is missing or invalid.');
    }

    parsed.private_key = normalizePrivateKey(parsed.private_key);

    return parsed;
}

function parseServiceAccountFromBase64(base64Value: string): admin.ServiceAccount {
    const trimmed = base64Value.trim();

    try {
        const decoded = Buffer.from(trimmed, 'base64').toString('utf8');
        return parseServiceAccount(decoded);
    } catch (base64Error) {
        // Allow plain JSON in the _B64 env var to avoid hard failures from misconfiguration.
        if (trimmed.startsWith('{')) {
            return parseServiceAccount(trimmed);
        }
        throw base64Error;
    }
}

function ensureAdminApp() {
    if (admin.apps.length) {
        return admin.app();
    }

    let credential: admin.credential.Credential;
    const b64Key = process.env.FIREBASE_SERVICE_ACCOUNT_KEY_B64;
    const rawKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    const splitKey = parseServiceAccountFromParts();

    try {
        if (b64Key) {
            credential = admin.credential.cert(parseServiceAccountFromBase64(b64Key));
        } else if (rawKey) {
            credential = admin.credential.cert(parseServiceAccount(rawKey));
        } else if (splitKey) {
            credential = admin.credential.cert(splitKey);
        } else {
            credential = admin.credential.applicationDefault();
        }
    } catch (error) {
        const source = b64Key
            ? 'FIREBASE_SERVICE_ACCOUNT_KEY_B64'
            : rawKey
            ? 'FIREBASE_SERVICE_ACCOUNT_KEY'
            : splitKey
            ? 'FIREBASE_PROJECT_ID/FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY'
            : 'applicationDefault';
        const message = error instanceof Error ? error.message : 'Unknown error';
        throw new Error(`Failed to initialize Firebase Admin credential from ${source}: ${message}`);
    }

    return admin.initializeApp({
        credential,
        projectId: process.env.FIREBASE_PROJECT_ID || 'comicbooksgeo'
    });
}

export function getAdminAuth() {
    return ensureAdminApp().auth();
}

export function getAdminDb() {
    return ensureAdminApp().firestore();
}

export function getAdminStorage() {
    return ensureAdminApp().storage();
}
