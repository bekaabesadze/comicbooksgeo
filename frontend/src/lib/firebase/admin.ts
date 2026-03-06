import * as admin from 'firebase-admin';

function normalizePrivateKey(privateKey: string): string {
    return privateKey.replace(/\\n/g, '\n').trim();
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

if (!admin.apps.length) {
    let credential: admin.credential.Credential;
    const b64Key = process.env.FIREBASE_SERVICE_ACCOUNT_KEY_B64;
    const rawKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

    try {
        if (b64Key) {
            credential = admin.credential.cert(parseServiceAccountFromBase64(b64Key));
        } else if (rawKey) {
            credential = admin.credential.cert(parseServiceAccount(rawKey));
        } else {
            credential = admin.credential.applicationDefault();
        }
    } catch (error) {
        const source = b64Key
            ? 'FIREBASE_SERVICE_ACCOUNT_KEY_B64'
            : rawKey
            ? 'FIREBASE_SERVICE_ACCOUNT_KEY'
            : 'applicationDefault';
        const message = error instanceof Error ? error.message : 'Unknown error';
        throw new Error(`Failed to initialize Firebase Admin credential from ${source}: ${message}`);
    }

    admin.initializeApp({
        credential,
        projectId: process.env.FIREBASE_PROJECT_ID || 'comicbooksgeo'
    });
}

export const adminAuth = admin.auth();
export const adminDb = admin.firestore();
export const adminStorage = admin.storage();
