// The Open Graph image: the developed frontispiece at 1200×630.
//
//   npm run og                  writes public/og.png
//   npm run og -- --out x.png   writes somewhere else (used to check the script)
//
// Builds the site, serves the build, and photographs the title page.

import { build, preview } from 'vite';
import { chromium } from 'playwright';
import path from 'node:path';

const outFlag = process.argv.indexOf('--out');
const out = path.resolve(outFlag > -1 ? process.argv[outFlag + 1] : 'public/og.png');

await build({ logLevel: 'error' });
const server = await preview({ logLevel: 'error', preview: { port: 5198, strictPort: false } });
const base = server.resolvedUrls.local[0];

const browser = await chromium.launch({
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await page.emulateMedia({ reducedMotion: 'reduce' });
await page.goto(`${base}?shots`, { waitUntil: 'load' });
await page.evaluate(() => window.__atlas.ready);
await page.waitForTimeout(400);
await page.screenshot({ path: out });
await browser.close();
await new Promise((resolve) => server.httpServer.close(resolve));
console.log(`Open Graph image written to ${path.relative(process.cwd(), out)}`);
