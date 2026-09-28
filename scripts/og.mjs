// The Open Graph image and the touch icon.
//
//   npm run og                  writes public/og.png and public/apple-touch-icon.png
//   npm run og -- --out x.png   writes the Open Graph image somewhere else (to check the script)
//
// The Open Graph image is the developed frontispiece at 1200×630: the script builds the
// site, serves the build and photographs the title page. The touch icon is the favicon,
// drawn at 180×180 without its rounded corners (the phone rounds them itself).

import { build, preview } from 'vite';
import { chromium } from 'playwright';
import fs from 'node:fs/promises';
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
// "Scroll to begin" speaks to someone on the page, not to someone reading a link preview.
await page.addStyleTag({ content: '.frontispiece__hint { visibility: hidden; }' });
await page.waitForTimeout(400);
await page.screenshot({ path: out });
console.log(`Open Graph image written to ${path.relative(process.cwd(), out)}`);

if (outFlag === -1) {
  const svg = (await fs.readFile('public/favicon.svg', 'utf8')).replace(/ rx="[^"]*"/, '');
  const icon = await browser.newPage({ viewport: { width: 180, height: 180 }, deviceScaleFactor: 1 });
  await icon.setContent(`<!doctype html><style>html,body{margin:0}svg{display:block;width:180px;height:180px}</style>${svg}`);
  await icon.screenshot({ path: 'public/apple-touch-icon.png' });
  console.log('Touch icon written to public/apple-touch-icon.png');
}

await browser.close();
await new Promise((resolve) => server.httpServer.close(resolve));
