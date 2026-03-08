"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import {
    User,
    GoogleAuthProvider,
    signInWithPopup,
    signOut as firebaseSignOut,
    onAuthStateChanged
} from "firebase/auth";
import { auth, hasFirebasePublicConfig } from "@/lib/firebase";

interface AuthContextType {
    user: User | null;
    loading: boolean;
    signInWithGoogle: () => Promise<void>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    signInWithGoogle: async () => { },
    signOut: async () => { },
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!hasFirebasePublicConfig) {
            setLoading(false);
            return;
        }

        try {
            const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
                setUser(nextUser);
                setLoading(false);
            });

            return () => unsubscribe();
        } catch (error) {
            console.error("Firebase auth initialization failed:", error);
            setLoading(false);
        }
    }, []);

    const signInWithGoogle = async () => {
        if (!hasFirebasePublicConfig) {
            console.error("Firebase public configuration is incomplete. Google sign-in is unavailable.");
            return;
        }

        try {
            const provider = new GoogleAuthProvider();
            await signInWithPopup(auth, provider);
        } catch (error) {
            console.error("Error signing in with Google:", error);
        }
    };

    const signOut = async () => {
        if (!hasFirebasePublicConfig) {
            return;
        }

        try {
            await firebaseSignOut(auth);
        } catch (error) {
            console.error("Error signing out:", error);
        }
    };

    return (
        <AuthContext.Provider value={{ user, loading, signInWithGoogle, signOut }}>
            {children}
        </AuthContext.Provider>
    );
};
