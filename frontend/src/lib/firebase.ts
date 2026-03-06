// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyBaUi0gqbkN1vvujEvp8lppHflR3CAEYaU",
    authDomain: "comicbooksgeo.firebaseapp.com",
    projectId: "comicbooksgeo",
    // The storage bucket must use the appspot.com domain, not firebasestorage.app
    storageBucket: "comicbooksgeo.appspot.com",
    messagingSenderId: "787996569834",
    appId: "1:787996569834:web:f025691f96d9c30b4ae793",
    measurementId: "G-JLNDV6XDGS"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// We only initialize analytics in the browser
let analytics;
if (typeof window !== "undefined") {
    analytics = getAnalytics(app);
}

export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app);

export default app;
export { analytics };