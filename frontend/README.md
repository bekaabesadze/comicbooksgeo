This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploying to Hostinger

The production site at `https://comicbooksgeo.com` is deployed to Hostinger using a standalone Next.js build.

### 1. Make and verify changes locally

1. Edit the app code in `frontend` (for example `src/app/page.tsx`).
2. Run the dev server:

```bash
npm run dev
```

3. Open `http://localhost:3000` and confirm your changes look correct.

### 2. Build a Hostinger deployment artifact

From the `frontend` directory:

```bash
npm install
npm run build:hostinger
```

This will:

- Clean the previous Next.js build.
- Run `next build` with standalone output.
- Create a `hostinger-deploy` directory based on `hostinger-deploy-2026-03-13` and copy the latest `.next` and `public` assets into it.

### 3. Upload to Hostinger

1. Zip the `hostinger-deploy` directory.
2. In Hostinger hPanel, open the `comicbooksgeo.com` website.
3. Use the deployment UI to upload and deploy the new zip (replacing the previous deployment).
4. Once the deployment status is **Completed**, hard-refresh `https://comicbooksgeo.com` (Cmd/Ctrl+Shift+R) and verify that your latest changes are visible.
