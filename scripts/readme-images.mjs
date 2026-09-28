// The pictures in README.md, photographed from the built site as light JPEGs.
//
//   npm run readme-images       writes .github/readme/*.jpg
//
// Each plate at rest on a laptop, the machine's view and the loupe, and three plates on a
// phone. Run it again whenever the plates change, so the README shows the atlas as it is.

import { build, preview } from 'vite';
import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const OUT = path.resolve('.github', 'readme');
const QUALITY = 82;

await fs.mkdir(OUT, { recursive: true });
await build({ logLevel: 'error' });
const server = await preview({ logLevel: 'error', preview: { port: 5220, strictPort: false } });
const base = server.resolvedUrls.local[0];
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });

async function open(options) {
  const context = await browser.newContext(options);
  const page = await context.newPage();
  await page.goto(`${base}?shots`, { waitUntil: 'load' });
  await page.evaluate(() => window.__atlas.ready);
  return { context, page };
}

// Long enough for a field's sharp pass, which waits until the page has been still.
const still = (page) => page.waitForTimeout(1200);
const toned = (page) =>
  page.waitForFunction(() => Number(getComputedStyle(document.querySelector('.stick__answer')).opacity) > 0.99, null, { timeout: 15000 }).catch(() => {});
const save = (page, name) => page.screenshot({ path: path.join(OUT, `${name}.jpg`), type: 'jpeg', quality: QUALITY, timeout: 120000 });

// On a laptop: every plate at rest.
{
  const { context, page } = await open({ viewport: { width: 1440, height: 900 } });
  for (const [n, at] of [[1, 0.9], [2, 0.95], [3, 0.97], [4, 0.95], [5, 0.95], [6, 0.95]]) {
    await page.evaluate(([n, at]) => window.__atlas.goTo(n, at), [n, at]);
    if (n === 6) await toned(page);
    await still(page);
    await save(page, `plate-${n}`);
    process.stdout.write(`plate-${n} `);
  }

  // The machine's view of Plate II, and the loupe over Plate I.
  await page.evaluate(() => window.__atlas.goTo(2, 0.95));
  await page.locator('#plate-2 .loupe-toggle').click();
  await still(page);
  await save(page, 'machine-view');
  await page.locator('#plate-2 .loupe-toggle').click();

  await page.evaluate(() => window.__atlas.goTo(1, 0.9));
  await still(page);
  const box = await page.locator('.slip--specimen').first().boundingBox();
  if (box) {
    await page.mouse.move(box.x + 60, box.y + 40);
    await page.mouse.move(box.x + 150, box.y + box.height * 0.4, { steps: 8 });
    await page.waitForTimeout(600);
    await save(page, 'loupe');
  }
  await context.close();
  process.stdout.write('machine-view loupe ');
}

// On a phone: the threads on end, the weighing, and the toned answer.
{
  const { context, page } = await open({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  for (const n of [4, 5, 6]) {
    await page.evaluate((n) => window.__atlas.goTo(n, 0.95), n);
    if (n === 6) await toned(page);
    await still(page);
    await save(page, `phone-plate-${n}`);
    process.stdout.write(`phone-plate-${n} `);
  }
  await context.close();
}

await browser.close();
await new Promise((resolve) => server.httpServer.close(resolve));
const files = (await fs.readdir(OUT)).filter((f) => f.endsWith('.jpg'));
let bytes = 0;
for (const f of files) bytes += (await fs.stat(path.join(OUT, f))).size;
console.log(`\n${files.length} pictures in .github/readme (${(bytes / 1024).toFixed(0)} KB in all)`);
