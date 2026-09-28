// A filmstrip of the whole atlas: scroll from the top to the bottom in half-screen steps,
// take a small frame at each, and lay the frames out as a contact sheet, so the rhythm
// of the site (where it hurries, where it pauses, where it breathes) can be read at a glance.
//
//   node scripts/film.mjs            both viewports
//   node scripts/film.mjs desktop    one
//
// Frames and sheets are written to /shots/film.

import { createServer } from 'vite';
import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const OUT = path.resolve('shots', 'film');
const STEP = 0.5; // of a screen
const VIEWPORTS = {
  desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 0.25 },
  phone: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 0.5, isMobile: true, hasTouch: true },
};
const only = process.argv[2];

await fs.rm(OUT, { recursive: true, force: true });
await fs.mkdir(OUT, { recursive: true });

const server = await createServer({ logLevel: 'error', server: { port: 5196, strictPort: false } });
await server.listen();
const base = server.resolvedUrls.local[0].replace(/\/$/, '');
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });

for (const [name, vp] of Object.entries(VIEWPORTS)) {
  if (only && only !== name) continue;
  const context = await browser.newContext(vp);
  const page = await context.newPage();
  await page.goto(`${base}/?shots`);
  await page.evaluate(() => window.__atlas.ready);
  const { total, screen } = await page.evaluate(() => ({ total: document.documentElement.scrollHeight, screen: innerHeight }));
  const frames = [];
  for (let y = 0, i = 0; y <= total - screen + 1; y += screen * STEP, i++) {
    const where = await page.evaluate(async (top) => {
      window.scrollTo(0, top);
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      // Which part of the atlas crosses the middle of the screen.
      const mid = innerHeight / 2;
      const parts = [...document.querySelectorAll('header.frontispiece, nav.contents, section.plate, footer.endmatter')];
      const at = parts.find((p) => {
        const r = p.getBoundingClientRect();
        return r.top <= mid && r.bottom >= mid;
      });
      return at ? (at.id || at.className.split(' ')[1] || at.tagName.toLowerCase()) : 'between';
    }, y);
    await page.waitForTimeout(120);
    const file = `${name}-${String(i).padStart(3, '0')}.png`;
    await page.screenshot({ path: path.join(OUT, file), timeout: 120000 });
    frames.push({ file, vh: Math.round((y / screen) * 100), where });
    process.stdout.write(`  ${name} ${i} ${where}\n`);
  }
  await context.close();

  // The contact sheet: every frame in order, labelled with its depth in screens and its part.
  const cols = name === 'desktop' ? 8 : 12;
  const html = `<!doctype html><meta charset="utf-8"><style>
    body { margin: 16px; background: #fff; font: 12px/1.3 sans-serif; }
    .sheet { display: grid; grid-template-columns: repeat(${cols}, 1fr); gap: 10px 8px; }
    figure { margin: 0; } img { display: block; width: 100%; border: 1px solid #ccc; }
    figcaption { margin-top: 2px; } b { font-weight: 600; }
  </style><div class="sheet">${frames.map((f) => `<figure><img src="${f.file}"><figcaption><b>${f.vh}vh</b> ${f.where}</figcaption></figure>`).join('')}</div>`;
  const sheet = path.join(OUT, `${name}.html`);
  await fs.writeFile(sheet, html);
  const viewer = await browser.newPage({ viewport: { width: 1800, height: 1000 } });
  await viewer.goto(`file://${sheet.replace(/\\/g, '/')}`);
  await viewer.screenshot({ path: path.join(OUT, `${name}-sheet.png`), fullPage: true });
  await viewer.close();
  console.log(`${name}: ${frames.length} frames, ${Math.round(total / screen)} screens deep`);
}

await browser.close();
await server.close();
