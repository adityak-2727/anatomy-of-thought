// The keyboard-only pass and the screen-reader pass (BRIEF §12).
//
//   node scripts/keyboard.mjs
//
// Keyboard: from the top of the page, Tab through everything, one stop at a time. Each
// stop must be on screen, uncovered, and show a focus ring; the order is written to
// /shots/keyboard.txt. Then every control is worked with keys alone: the skip link, the
// list, the reader's sentence, a loupe toggle, the list of the stars, a constellation's
// name, the big/small switch and the readers, the temperature, the lever, the index and
// “Expose the atlas again”.
//
// Screen reader: the page's accessibility tree, as a screen reader is given it, written
// to /shots/a11y-tree.yml: headings, landmarks, figures, controls and live regions.

import { createServer } from 'vite';
import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const OUT = path.resolve('shots');
const problems = [];
const checks = [];
const check = (what, ok, detail) => {
  checks.push({ what, ok });
  console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${what}${detail === undefined ? '' : ` ${JSON.stringify(detail)}`}`);
};

const server = await createServer({ logLevel: 'error', server: { port: 5202, strictPort: false } });
await server.listen();
const base = server.resolvedUrls.local[0].replace(/\/$/, '');
const browser = await chromium.launch({ args: ['--enable-gpu', '--use-angle=d3d11', '--ignore-gpu-blocklist'] });

async function open(motion) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.emulateMedia({ reducedMotion: motion });
  page.on('console', (m) => m.type() === 'error' && problems.push(`console error: ${m.text()}`));
  page.on('pageerror', (e) => problems.push(`page error: ${e}`));
  await page.goto(`${base}/`);
  await page.evaluate(() => window.__atlas.ready);
  return page;
}

/** The focused element: what it is, what it is called, and whether it can be seen. */
const describeFocus = () => {
  const el = document.activeElement;
  if (!el || el === document.body) return null;
  const name =
    el.getAttribute('aria-label') ||
    (el.labels && el.labels[0]?.textContent) ||
    el.textContent ||
    el.value ||
    el.getAttribute('title') ||
    '';
  const r = el.getBoundingClientRect();
  // A visually hidden control draws its ring on what stands for it: the temperature on the
  // dial's face, each reader on its word.
  const stand = el.matches('.dial__input') ? el.parentElement.querySelector('.dial__face') : el.matches('input[type="radio"]') ? el.nextElementSibling : el;
  const s = stand.getBoundingClientRect();
  const st = getComputedStyle(stand);
  const ring = st.outlineStyle !== 'none' && parseFloat(st.outlineWidth) >= 2;
  const cx = s.left + s.width / 2;
  const cy = s.top + s.height / 2;
  const onScreen = s.bottom > 0 && s.top < innerHeight && s.right > 0 && s.left < innerWidth;
  const hit = onScreen ? document.elementFromPoint(Math.min(innerWidth - 1, Math.max(0, cx)), Math.min(innerHeight - 1, Math.max(0, cy))) : null;
  const covered = onScreen && hit && !stand.contains(hit) && !hit.contains(stand) && !el.contains(hit);
  return {
    what: `${el.tagName.toLowerCase()}${el.type ? `[${el.type}]` : ''}`,
    name: name.replace(/\s+/g, ' ').trim().slice(0, 48),
    onScreen,
    ring,
    covered: covered ? (hit.className?.baseVal ?? hit.className ?? hit.tagName) : null,
    size: `${Math.round(r.width)}×${Math.round(r.height)}`,
  };
};

// ---- Tab through the whole page ------------------------------------------------------

for (const motion of ['no-preference', 'reduce']) {
  const page = await open(motion);
  const stops = [];
  for (let i = 0; i < 160; i++) {
    await page.keyboard.press('Tab');
    await page.waitForTimeout(motion === 'reduce' ? 60 : 260);
    const f = await page.evaluate(describeFocus);
    if (!f) break;
    if (stops.length && stops[0].name === f.name && stops[0].what === f.what && i > 5) break;
    stops.push(f);
    const where = `Tab ${i + 1} (${f.what} “${f.name}”)`;
    if (!f.onScreen) problems.push(`${motion}: ${where} is off screen when focused`);
    if (!f.ring) problems.push(`${motion}: ${where} shows no focus ring`);
    if (f.covered) problems.push(`${motion}: ${where} is covered by ${f.covered}`);
  }
  if (motion === 'no-preference') {
    await fs.writeFile(
      path.join(OUT, 'keyboard.txt'),
      stops.map((s, i) => `${String(i + 1).padStart(3)}  ${s.what.padEnd(16)} ${s.name}${s.onScreen ? '' : '  [off screen]'}${s.ring ? '' : '  [no ring]'}`).join('\n') + '\n',
    );
  }
  check(`${motion === 'reduce' ? 'reduced motion' : 'normal motion'}: Tab reaches ${stops.length} stops, the first is the skip link`, stops[0]?.name === 'Skip to the plates', stops.length);
  const names = stops.filter((s) => s.what === 'button[submit]' || s.what === 'button[button]').filter((s) => /^The [A-Z]/.test(s.name)).length;
  check(`${motion === 'reduce' ? 'reduced motion' : 'normal motion'}: every constellation’s name is in the Tab order`, names === 15, names);
  await page.close();
}

// ---- Work every control with keys alone ----------------------------------------------

const page = await open('no-preference');
const key = async (selector, keys, wait = 500) => {
  await page.locator(selector).first().focus();
  for (const k of [].concat(keys)) await page.keyboard.press(k);
  await page.waitForTimeout(wait);
};
const active = () => page.evaluate(() => document.activeElement?.id || document.activeElement?.className || document.activeElement?.tagName);

await page.keyboard.press('Tab');
await page.keyboard.press('Enter');
await page.waitForTimeout(1200);
check('the skip link takes focus to the plates', (await active()) === 'plates', await active());

await key('.contents__entry[href="#plate-3"]', 'Enter', 2200);
check('a list entry takes focus to its plate', (await active()) === 'plate-3-title', await active());

await page.evaluate(() => window.__atlas.goTo(2, 1));
await key('#reader-sentence', []);
await page.keyboard.type('A small dog sleeps by the fire.');
await page.keyboard.press('Enter');
// The sentence is cut, pinned and numbered in time; the status is written at the end.
await page.waitForFunction(() => /Exposed/.test(document.querySelector('#reader-status').textContent), null, { timeout: 15000 }).catch(() => {});
const status = await page.textContent('#reader-status');
check('the reader’s sentence is exposed with Enter', /Exposed/.test(status), status);

// The toggle says what it will do next, so its label changes (and it carries no aria-pressed).
await key('#plate-1 .loupe-toggle', 'Space', 400);
const label = await page.textContent('#plate-1 .loupe-toggle');
check('Space works a machine’s-view toggle', /Hide the machine’s view/.test(label), label);
await key('#plate-1 .loupe-toggle', 'Enter', 300);

await page.evaluate(() => window.__atlas.goTo(3, 1));
await key('.star-list__summary', 'Enter', 400);
const listOpen = await page.evaluate(() => document.querySelector('.star-list').open);
check('Enter opens the list of the stars', listOpen === true);
await key('.star-list__summary', 'Enter', 300);

const names = await page.locator('#plate-3 button.chart-name').count();
if (names) {
  await key('#plate-3 button.chart-name', 'Enter', 2500);
  const caption = await page.evaluate(() => [...document.querySelectorAll('.chart-stop')].filter((s) => getComputedStyle(s).opacity > 0.5).length);
  check('Enter on a constellation’s name takes the chart there', caption >= 1, { names, caption });
} else {
  check('the constellations’ names are buttons', false, { names });
}

await page.evaluate(() => window.__atlas.goTo(4, 1));
await key('.variant-switch', 'Enter', 1500);
const said = await page.evaluate(() => [...document.querySelectorAll('[aria-live]')].map((r) => r.textContent.trim()).filter(Boolean).join(' | '));
check('Enter changes big to small, and it is announced', /suitcase is too small/.test(said), said);
await key('.variant-switch', 'Enter', 1200);
await key('input[name="readers"]:checked', 'ArrowRight', 500);
const reader = await page.evaluate(() => document.querySelector('input[name="readers"]:checked').value);
check('the arrow keys choose a reader', reader === '0', reader);
await key('input[name="readers"]:checked', ['ArrowLeft'], 300);

await page.evaluate(() => window.__atlas.goTo(5, 1));
await key('#temperature', ['ArrowRight', 'ArrowRight'], 600);
const t1 = await page.inputValue('#temperature');
await key('#temperature', 'Home', 600);
const t0 = await page.inputValue('#temperature');
await key('#temperature', 'End', 600);
const t2 = await page.inputValue('#temperature');
check('the temperature turns with the arrow keys, Home and End', Number(t1) === 1.1 && Number(t0) === 0 && Number(t2) === 2, { t1, t0, t2 });
await key('#temperature', ['Home'], 300);
for (let i = 0; i < 20; i++) await page.keyboard.press('ArrowRight');
await key('.lever', 'Enter', 1200);
const drawn = await page.evaluate(() => document.querySelector('.draw-status')?.textContent ?? '');
check('Enter pulls the lever and the draw is announced', /Drawn:/.test(drawn), drawn);

await key('#index a[href="#plate-5"]', 'Enter', 2200);
check('an index term takes focus to its plate', (await active()) === 'plate-5-title', await active());

await key('.colophon__again', 'Enter', 3500);
const top = await page.evaluate(() => ({ y: Math.round(scrollY), focus: document.activeElement?.tagName }));
check('“Expose the atlas again” returns to the top', top.y < 5, top);

// ---- What a screen reader is given ----------------------------------------------------

const tree = await page.locator('body').ariaSnapshot();
await fs.writeFile(path.join(OUT, 'a11y-tree.yml'), tree);
const outline = await page.evaluate(() => ({
  headings: [...document.querySelectorAll('h1, h2, h3')].map((h) => `${h.tagName} ${h.textContent.replace(/\s+/g, ' ').trim()}`),
  landmarks: [...document.querySelectorAll('header, nav, main, footer, aside, [role="region"], section[aria-labelledby]')].map((l) => `${l.tagName.toLowerCase()}${l.getAttribute('aria-labelledby') ? ` (${document.getElementById(l.getAttribute('aria-labelledby'))?.textContent.replace(/\s+/g, ' ').trim()})` : ''}`),
  live: [...document.querySelectorAll('[aria-live], [role="status"], [role="alert"]')].map((l) => `${l.getAttribute('aria-live') ?? l.getAttribute('role')}: ${l.id || l.className}`),
  images: [...document.querySelectorAll('[role="img"]')].map((i) => (i.getAttribute('aria-label') ?? (i.getAttribute('aria-labelledby') && document.getElementById(i.getAttribute('aria-labelledby'))?.textContent) ?? i.querySelector('title')?.textContent ?? '(no name)').replace(/\s+/g, ' ').trim()),
}));
console.log('\nheadings:\n  ' + outline.headings.join('\n  '));
console.log('landmarks:\n  ' + outline.landmarks.join('\n  '));
console.log('live regions:\n  ' + outline.live.join('\n  '));
console.log('figures drawn as images:\n  ' + outline.images.join('\n  '));

await browser.close();
await server.close();

const failed = checks.filter((c) => !c.ok).length;
console.log(`\nkeyboard checks: ${checks.length - failed} of ${checks.length} passed`);
console.log(problems.length ? `${problems.length} problems:\n  ${problems.join('\n  ')}` : 'no focus problems');
console.log('Tab order in shots/keyboard.txt; the accessibility tree in shots/a11y-tree.yml');
process.exitCode = failed || problems.length ? 1 : 0;
