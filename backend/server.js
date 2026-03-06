const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const admin = require('firebase-admin');

dotenv.config();

// Initialize Firebase Admin SDK
let credential;
if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    // Parse key from env var if provided (for environments where we can't mount files)
    credential = admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY));
} else {
    // Default to application ADC (requires GOOGLE_APPLICATION_CREDENTIALS env var)
    credential = admin.credential.applicationDefault();
}

admin.initializeApp({
    credential: credential,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'comicbooksgeo.firebasestorage.app'
});

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.send('ComicBooksGeo Backend API is running');
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
