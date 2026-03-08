import { getApp, getApps, initializeApp } from "firebase/app";
import type { Analytics } from "firebase/analytics";
import type { FirebaseOptions } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

const requiredPublicFirebaseKeys = [
    "apiKey",
    "authDomain",
    "projectId",
    "storageBucket",
    "messagingSenderId",
    "appId",
] as const;

const missingPublicFirebaseKeys = requiredPublicFirebaseKeys.filter((key) => !firebaseConfig[key]);
export const hasFirebasePublicConfig = missingPublicFirebaseKeys.length === 0;

if (!hasFirebasePublicConfig) {
    console.error(
        `Missing Firebase public environment variables: ${missingPublicFirebaseKeys.join(", ")}`
    );
}

function buildSafeFirebaseConfig(): FirebaseOptions {
    return {
        apiKey: firebaseConfig.apiKey || "missing-api-key",
        authDomain: firebaseConfig.authDomain || "comicbooksgeo.local",
        projectId: firebaseConfig.projectId || "comicbooksgeo-fallback",
        storageBucket: firebaseConfig.storageBucket || "comicbooksgeo-fallback.appspot.com",
        messagingSenderId: firebaseConfig.messagingSenderId || "000000000000",
        appId: firebaseConfig.appId || "1:000000000000:web:fallback",
        ...(firebaseConfig.measurementId ? { measurementId: firebaseConfig.measurementId } : {}),
    };
}

const app = getApps().length ? getApp() : initializeApp(buildSafeFirebaseConfig());

let analytics: Analytics | null = null;

export const initAnalytics = async () => {
    if (analytics || typeof window === "undefined" || !firebaseConfig.measurementId) {
        return analytics;
    }

    try {
        const { isSupported, getAnalytics } = await import("firebase/analytics");
        if (await isSupported()) {
            analytics = getAnalytics(app);
        }
    } catch (error) {
        console.error("Firebase analytics initialization failed:", error);
    }

    return analytics;
};

export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app);

export default app;
export { analytics };
