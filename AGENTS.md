# ComicBooksGeo Agent Rules

## Non-Negotiable Rules
- Only do what I explicitly ask.
- Do not change files, code, infrastructure, or settings that I did not mention.
- Every added feature or design must feel premium.
- Everything you add must be implemented with security in mind.

## Production Source Of Truth
- The live production website is hosted on Vercel.
- The correct Vercel production project is `comicbooksgeo`.
- The old Vercel project `comicbooksgeo1` is not the production website.
- The canonical production domain is `https://comicbooksgeo.com/`.
- `https://www.comicbooksgeo.com/` must remain a redirect to `https://comicbooksgeo.com/`.

## Deployment Rules
- Make website changes only in this repository.
- For production website updates, use the Vercel project `comicbooksgeo`.
- Do not upload frontend files to Hostinger to update the live website.
- Do not use Hostinger as the source of truth for site content or deployment.
- Do not change DNS, domain assignments, redirects, SSL, or hosting settings unless I explicitly ask.
- Do not attach the production domain to any project other than `comicbooksgeo` unless I explicitly ask.

## Required Update Workflow
1. Make the requested code changes in this repo only.
2. Deploy through the connected Vercel project flow.
3. Verify the deployment is ready.
4. Verify `https://comicbooksgeo.com/` shows the latest version.
5. Verify `https://www.comicbooksgeo.com/` redirects to `https://comicbooksgeo.com/`.
6. If the deployment does not match on the custom domain, check Vercel project domain mappings before touching anything else.

## Forbidden Shortcuts
- Do not fix production by uploading zip files to Hostinger.
- Do not treat a Hostinger deployment as the live website unless I explicitly change hosting strategy.
- Do not use `comicbooksgeo1` for production rollouts.
- Do not change unrelated files just because they look outdated.

## If Hosting Issues Happen Again
- First confirm the live domain is attached to the Vercel project `comicbooksgeo`.
- Then confirm the apex domain serves the latest deployment.
- Then confirm `www` redirects to the apex.
- Only inspect Hostinger if I explicitly ask, or if there is hard evidence that DNS or hosting ownership changed.
