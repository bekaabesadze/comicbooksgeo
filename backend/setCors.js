const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: 'comicbooksgeo.firebasestorage.app'
});

async function setCors() {
    try {
        const bucket = admin.storage().bucket();
        await bucket.setCorsConfiguration([
            {
                origin: ['*'],
                method: ['GET', 'PUT', 'POST', 'DELETE', 'HEAD', 'OPTIONS'],
                maxAgeSeconds: 3600
            }
        ]);
        console.log('CORS configured successfully!');
    } catch (error) {
        console.error('Failed to configure CORS:', error);
    }
}

setCors();
