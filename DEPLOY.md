# Deploying the atlas

The atlas is a static site: `npm run build` writes everything to `dist/`, and any static host can serve that folder. The build uses relative paths (`base: './'` in `vite.config.ts`), so the same files work at a domain's root and under a project path such as `/anatomy-of-thought/`.

## Before the first deploy

1. Use Node 20 or newer.
2. Check the build locally:
   ```sh
   npm ci
   npm run build
   npm test
   npm run preview        # serves dist/ at http://localhost:4173
   ```
3. The Open Graph image and the touch icon are committed in `public/`. If the title page changes, run `npm run og` to make them again.

## The site's address (`SITE_URL`)

Link previews (Open Graph and X/Twitter cards) need the page's address and the preview image as absolute URLs. Only the deployment knows the address, so the build reads it from an environment variable:

```sh
SITE_URL=https://example.org/ npm run build
```

With `SITE_URL` set, the build writes `<link rel="canonical">`, `og:url`, and an absolute `og:image` (`<SITE_URL>og.png`). Without it, the build leaves out the canonical link and `og:url` and keeps the image path relative. The site still works, but some services won't show a preview image. The trailing slash is optional; the build adds one.

## Vercel

1. In Vercel, choose **Add New… → Project** and import `adityak-2727/anatomy-of-thought`.
2. Vercel detects Vite. Check these settings:
   - Framework preset: **Vite**
   - Build command: `npm run build`
   - Output directory: `dist`
   - Install command: `npm ci`
3. Under **Settings → Environment Variables**, add `SITE_URL` with the production address, for example `https://anatomy-of-a-thought.vercel.app/` (or your own domain). Apply it to Production.
4. Deploy. Each push to `main` then deploys to production, and each pull request gets a preview deployment.
5. Optional: add a custom domain under **Settings → Domains**, then change `SITE_URL` to match and redeploy.

Nothing else is needed: there are no server routes, rewrites or functions.

## GitHub Pages

The site will live at `https://adityak-2727.github.io/anatomy-of-thought/`.

1. In the repository on GitHub, open **Settings → Pages** and set **Source** to **GitHub Actions**.
2. Add this workflow as `.github/workflows/deploy.yml` and push it to `main`:

   ```yaml
   name: Deploy to GitHub Pages

   on:
     push:
       branches: [main]
     workflow_dispatch:

   permissions:
     contents: read
     pages: write
     id-token: write

   concurrency:
     group: pages
     cancel-in-progress: true

   jobs:
     build:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v4
         - uses: actions/setup-node@v4
           with:
             node-version: 22
             cache: npm
         - run: npm ci
         - run: npm test
         - run: npm run build
           env:
             SITE_URL: https://adityak-2727.github.io/anatomy-of-thought/
         - uses: actions/upload-pages-artifact@v3
           with:
             path: dist

     deploy:
       needs: build
       runs-on: ubuntu-latest
       environment:
         name: github-pages
         url: ${{ steps.deployment.outputs.page_url }}
       steps:
         - id: deployment
           uses: actions/deploy-pages@v4
   ```

3. The workflow runs on every push to `main`. Its progress is under the repository's **Actions** tab, and the address appears on the **Settings → Pages** page when it finishes.

The workflow doesn't install Playwright's browsers. The screenshot, sweep, keyboard, performance and Lighthouse scripts are for checking the site locally, not for building it.

## After deploying

- Open the site and let the title page print; then scroll to the end.
- Paste the address into a link-preview checker (for example, opengraph.xyz) to see the preview image and title.
- Open the site on a phone, turn it on its side and back, and add it to the home screen to see the touch icon.
- Optional: run Lighthouse in Chrome's DevTools against the live address. The local figures are in PROGRESS.md (Phase 8).
