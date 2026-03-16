# comicbooksgeo

## Current status

- Frontend hosting is currently being tested on Hostinger with an upload-based deployment flow.
- Current Hostinger app settings:
  - Framework preset: `Next.js`
  - Node version: `20.x`
  - Root directory: `frontend`
  - Build command: `npm run build`
  - Package manager: `npm`
- Current production issue: the site is returning `503 Service Unavailable` from Hostinger, so this is not fully stable yet.

## Firebase and admin setup

- Firebase project id: `comicbooksgeo`
- Studio/admin password currently intended for deployment: `Stu12345678SSS.`
- Firebase custom admin claim was set for:
  - `bekunakukuna@gmail.com`
- Admin access requires all of the following:
  - user is signed in with Firebase Auth
  - password matches `ADMIN_PASSWORD`
  - Firebase token contains `admin: true`

## Environment variables expected by the frontend

### Public Firebase variables

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID`

### Server-side variables used by admin/server actions

- `ADMIN_PASSWORD`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_STORAGE_BUCKET`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`

## Code changes made during deployment debugging

- Fixed the TypeScript frontend build error around `coverUrl` in `frontend/src/app/page.tsx`.
- Changed Firebase Analytics startup in `frontend/src/lib/firebase.ts` to initialize lazily so analytics support issues do not crash the client immediately.
- Changed Firebase Admin initialization in `frontend/src/lib/firebase/admin.ts` to initialize lazily instead of at module import time.
- Added split Firebase Admin env support in `frontend/src/lib/firebase/admin.ts`:
  - `FIREBASE_PROJECT_ID`
  - `FIREBASE_CLIENT_EMAIL`
  - `FIREBASE_PRIVATE_KEY`
- Updated these files to use lazy Firebase Admin access:
  - `frontend/src/app/actions/auth.ts`
  - `frontend/src/app/actions/comicMetadata.ts`
  - `frontend/src/app/admin/(protected)/layout.tsx`

## Deployment files created locally

- `frontend-hostinger-clean.zip`
  - frontend upload package without local env file
- `frontend-hostinger-with-env.zip`
  - frontend upload package including `frontend/.env.local`
- `frontend-hostinger-admin-503-fix.zip`
  - frontend upload package containing the latest lazy-admin-init changes
- `frontend-hostinger-fix.zip`
  - earlier frontend upload package created during debugging

## Important notes

- `comicbooksgeo-firebase-adminsdk-fbsvc-efe043df3f.json` is a sensitive Firebase service-account file and should not be committed.
- Hostinger deployment in this session behaved like file upload hosting, not Git branch deployment.
- Current next step is to recover a stable frontend deployment on Hostinger first, then retest admin login after the public site is healthy.
