// The responsive and cross-browser pass (BRIEF §10 and §12), on the production build.
//
//   node scripts/sweep.mjs                 every browser, size, resize and rotation
//   node scripts/sweep.mjs firefox         one browser (chromium, firefox or webkit)
//
// For each browser and size it visits the title page, the list, each plate at rest and
// the end matter; photographs each into /shots/sweep; checks that nothing makes the page
// wider than the screen, that a pinned plate's figure is whole on screen, and runs axe.
// Then, in Chromium, it resizes one page from 1920 to 360 pixels wide, and turns a phone
// on its side and back, checking the same things after each change.

import { build, preview } from 'vite';
import { chromium, firefox, webkit } from 'playwright';
import { AxeBuilder } from '@axe-core/playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const OUT = path.resolve('shots', 'sweep');
const only = process.argv[2];
const ENGINES = { chromium, firefox, webkit };
const phone = { isMobile: true, hasTouch: true };
const SIZES = {
  'phone-small': { viewport: { width: 360, height: 740 }, ...phone },
  phone: { viewport: { width: 390, height: 844 }, ...phone },
  'phone-turned': { viewport: { width: 844, height: 390 }, ...phone },
  tablet: { viewport: { width: 768, height: 1024 }, ...phone },
  laptop: { viewport: { width: 1440, height: 900 } },
  wide: { viewport: { width: 1920, height: 1080 } },
};
// Firefox has no mobile emulation; it is checked at the phone's size with a mouse.
const forEngine = (engine, size) => (engine === 'firefox' ? { viewport: size.viewport } : size);
const STOPS = [['frontispiece', 1], ['list'], [1, 0.9], [2, 0.95], [3, 0.95], [4, 0.95], [5, 0.95], [6, 0.95], ['colophon']];
const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'];

const report = { problems: [], modes: {}, shots: 0, notes: new Set() };
const problem = (where, what) => {
  report.problems.push(`${where}: ${what}`);
  console.log(`  ! ${where}: ${what}`);
};

await fs.rm(OUT, { recursive: true, force: true });
await fs.mkdir(OUT, { recursive: true });
await build({ logLevel: 'error' });
const server = await preview({ logLevel: 'error', preview: { port: 5201, strictPort: false } });
const base = server.resolvedUrls.local[0];

/** What is wrong with the page as it stands: overflow, and a pinned figure cut off. */
async function inspect(page, stop) {
  return page.evaluate((stop) => {
    const found = [];
    const wide = document.documentElement.scrollWidth - innerWidth;
    if (wide > 1) found.push(`the page is ${wide}px wider than the screen`);
    if (typeof stop[0] === 'number') {
      // Whatever is pinned (the frame on a desktop, the field in one column) must be whole on screen.
      const pinned = document.querySelector(`#plate-${stop[0]} .pin-spacer > *`);
      const box = pinned?.getBoundingClientRect();
      if (box && (box.top < -2 || box.bottom > innerHeight + 2)) {
        found.push(`what is pinned runs from ${Math.round(box.top)} to ${Math.round(box.bottom)}px on a ${innerHeight}px screen`);
      }
    }
    // The plate indicator must not sit on anything to be read or pressed.
    const slip = document.querySelector('.plate-indicator');
    const style = slip && getComputedStyle(slip);
    if (style && style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) > 0.5) {
      const s = slip.getBoundingClientRect();
      const under = [...document.querySelectorAll('main p, main figcaption, main button, main label, main h2, main .slip')].filter((e) => {
        const b = e.getBoundingClientRect();
        const st = getComputedStyle(e);
        return b.width > 2 && st.visibility !== 'hidden' && Number(st.opacity) > 0.2 && !e.closest('details:not([open]), .visually-hidden') &&
          b.left < s.right && b.right > s.left && b.top < s.bottom && b.bottom > s.top;
      });
      if (under.length) found.push(`the plate indicator sits on ${under.map((e) => e.className || e.tagName).slice(0, 2).join(', ')}`);
    }
    return found;
  }, stop);
}

async function visit(engineName, sizeName) {
  const browser = await ENGINES[engineName].launch(
    engineName === 'chromium' ? { args: ['--enable-gpu', '--use-angle=d3d11', '--ignore-gpu-blocklist'] } : {},
  );
  const context = await browser.newContext(forEngine(engineName, SIZES[sizeName]));
  const page = await context.newPage();
  const tag = `${engineName}-${sizeName}`;
  page.on('console', (m) => {
    if (m.type() !== 'error' && m.type() !== 'warning') return;
    // WebKit loads same-origin fonts without CORS, so the spec-correct font preload (with
    // crossorigin, which Chromium and Firefox need) is not matched and WebKit says so. Noted,
    // not counted: no one preload link serves both (PROGRESS, Phase 8).
    if (engineName === 'webkit' && /\.woff2 was preloaded using link preload but not used/.test(m.text())) {
      report.notes.add('WebKit fetches the two preloaded Old Standard faces a second time (see PROGRESS, Phase 8).');
      return;
    }
    problem(tag, `console ${m.type()}: ${m.text()}`);
  });
  page.on('pageerror', (e) => problem(tag, `page error: ${e}`));
  await page.goto(`${base}?shots`, { waitUntil: 'load', timeout: 60000 });
  await page.evaluate(() => window.__atlas.ready);
  report.modes[tag] = await page.evaluate(() => (document.documentElement.classList.contains('no-gl') ? 'css' : 'gl'));
  process.stdout.write(`${tag} (${report.modes[tag]})`);
  for (const stop of STOPS) {
    await page.evaluate(([t, p]) => window.__atlas.goTo(t, p), stop);
    await page.waitForTimeout(500);
    const name = stop.join('-');
    for (const f of await inspect(page, stop)) problem(`${tag} ${name}`, f);
    await page.screenshot({ path: path.join(OUT, `${tag}-${name}.png`), timeout: 120000 });
    report.shots++;
    const axe = await new AxeBuilder({ page }).withTags(AXE_TAGS).disableRules(report.modes[tag] === 'gl' ? ['color-contrast'] : []).analyze();
    for (const v of axe.violations) problem(`${tag} ${name}`, `axe ${v.id}: ${v.help} (${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(', ')})`);
    process.stdout.write('.');
  }
  process.stdout.write('\n');
  await browser.close();
}

/** One page resized from 1920 to 360 wide and back, and a phone turned on its side. */
async function resizeAndTurn() {
  const browser = await chromium.launch({ args: ['--enable-gpu', '--use-angle=d3d11', '--ignore-gpu-blocklist'] });
  const errors = (tag, page) => {
    page.on('console', (m) => m.type() === 'error' && problem(tag, `console error: ${m.text()}`));
    page.on('pageerror', (e) => problem(tag, `page error: ${e}`));
  };

  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  errors('resize', page);
  await page.goto(`${base}?shots`, { waitUntil: 'load' });
  await page.evaluate(() => window.__atlas.ready);
  // Every plate built and measured once before the window starts to change.
  await page.evaluate(async () => {
    await window.__atlas.goTo(6, 1);
    await window.__atlas.goTo(1, 0);
  });
  const widths = [1920, 1680, 1440, 1280, 1180, 1100, 1024, 900, 820, 768, 700, 600, 480, 414, 390, 360];
  process.stdout.write('resize');
  for (const width of [...widths, ...widths.slice(0, -1).reverse()]) {
    await page.setViewportSize({ width, height: width < 768 ? 800 : 900 });
    // Past the re-measure and the second or so the page holds the reader's place through it.
    await page.waitForTimeout(1500);
    // A plate held mid-sequence, the hardest place to be when the window changes.
    await page.evaluate(() => window.__atlas.goTo(4, 0.5));
    await page.waitForTimeout(250);
    for (const f of await inspect(page, [4, 0.5])) problem(`resize to ${width}`, f);
    const inPlace = await page.evaluate(() => {
      const r = document.getElementById('plate-4').getBoundingClientRect();
      return r.top < innerHeight / 2 && r.bottom > innerHeight / 2;
    });
    if (!inPlace) problem(`resize to ${width}`, 'Plate IV is not on screen after jumping to it');
    if ([1680, 1100, 768, 360].includes(width)) {
      await page.screenshot({ path: path.join(OUT, `resize-${width}.png`), timeout: 120000 });
      report.shots++;
    }
    process.stdout.write('.');
  }
  process.stdout.write('\n');
  await page.close();

  // A phone turned while a plate is on screen: the reader should still be at that plate.
  for (const engine of ['chromium', 'webkit']) {
    const b = engine === 'chromium' ? browser : await webkit.launch();
    const context = await b.newContext(SIZES.phone);
    const p = await context.newPage();
    errors(`turn ${engine}`, p);
    await p.goto(`${base}?shots`, { waitUntil: 'load' });
    await p.evaluate(() => window.__atlas.ready);
    await p.evaluate(() => window.__atlas.goTo(3, 0.6));
    for (const [w, h, label] of [[844, 390, 'turned'], [390, 844, 'back']]) {
      await p.setViewportSize({ width: w, height: h });
      await p.waitForTimeout(900);
      const where = await p.evaluate(() => {
        const mid = innerHeight / 2;
        const at = [...document.querySelectorAll('section.plate')].find((s) => {
          const r = s.getBoundingClientRect();
          return r.top <= mid && r.bottom >= mid;
        });
        return at?.id ?? 'between plates';
      });
      if (where !== 'plate-3') problem(`turn ${engine} ${label}`, `the reader was at Plate III and is now at ${where}`);
      const wide = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      if (wide > 1) problem(`turn ${engine} ${label}`, `the page is ${wide}px wider than the screen`);
      await p.screenshot({ path: path.join(OUT, `turn-${engine}-${label}.png`), timeout: 120000 });
      report.shots++;
    }
    await context.close();
    if (b !== browser) await b.close();
  }
  await browser.close();
}

for (const engine of Object.keys(ENGINES)) {
  if (only && only !== engine) continue;
  for (const size of Object.keys(SIZES)) await visit(engine, size);
}
if (!only || only === 'chromium') await resizeAndTurn();

await new Promise((resolve) => server.httpServer.close(resolve));
await fs.writeFile(path.join(OUT, 'report.json'), JSON.stringify({ ...report, notes: [...report.notes] }, null, 2));
console.log(`\n${report.shots} screenshots in /shots/sweep`);
console.log(`render modes: ${Object.entries(report.modes).map(([k, v]) => `${k} ${v}`).join(', ')}`);
for (const n of report.notes) console.log(`note: ${n}`);
console.log(report.problems.length ? `${report.problems.length} problems` : 'no problems');
process.exitCode = report.problems.length ? 1 : 0;
