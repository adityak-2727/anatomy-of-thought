// The performance budget (BRIEF §10), measured on the production build with this machine's
// own GPU (headless Chromium, Direct3D through ANGLE), not the software renderer.
//
//   node scripts/perf.mjs
//
// For a laptop (1440×900) and a phone (390×844, its CPU slowed four times), it loads the
// atlas as a reader would (the frontispiece plays), and records the largest contentful
// paint, the layout shift and the long tasks while loading. Then it scrolls from the top
// to the bottom at a steady reading pace and records every frame: how long frames take,
// how many miss a 60Hz frame, and the long tasks while scrolling, with the slow frames
// counted separately for each plate as it arrives (its top rising into the screen), where a
// field develops. A second laptop run at 2x density shows what a sharper screen costs.
// The initial JavaScript is weighed from the build, gzipped.

import { build, preview } from 'vite';
import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import { gzipSync } from 'node:zlib';

const BUDGET = { lcp: 2500, cls: 0.05, initialKB: 180, longTask: 50 };
const PACE = 1800; // pixels a second: a brisk read, faster than most

await build({ logLevel: 'error' });
const server = await preview({ logLevel: 'error', preview: { port: 5207, strictPort: false } });
const base = server.resolvedUrls.local[0];

// The initial JavaScript: the entry and whatever it imports statically, gzipped.
const html = await fs.readFile('dist/index.html', 'utf8');
const initial = [...html.matchAll(/(?:src|href)="\.\/(assets\/[^"]+\.js)"/g)].map((m) => m[1]);
let initialBytes = 0;
for (const file of initial) initialBytes += gzipSync(await fs.readFile(path.join('dist', file))).length;
const initialKB = initialBytes / 1024;

const browser = await chromium.launch({ args: ['--enable-gpu', '--use-angle=d3d11', '--ignore-gpu-blocklist'] });
const results = [];

for (const [name, options, cpu] of [
  ['laptop', { viewport: { width: 1440, height: 900 } }, 1],
  ['laptop at 2x', { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 }, 1],
  ['phone', { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true }, 4],
]) {
  const context = await browser.newContext(options);
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  if (cpu > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu });
  // Observers go in before any script of the page runs.
  await page.addInitScript(() => {
    const m = (window.__perf = { lcp: 0, cls: 0, long: [], frames: [], scrolling: false });
    new PerformanceObserver((l) => l.getEntries().forEach((e) => (m.lcp = e.startTime))).observe({ type: 'largest-contentful-paint', buffered: true });
    new PerformanceObserver((l) => l.getEntries().forEach((e) => !e.hadRecentInput && (m.cls += e.value))).observe({ type: 'layout-shift', buffered: true });
    new PerformanceObserver((l) => l.getEntries().forEach((e) => m.long.push({ at: e.startTime, ms: e.duration, scrolling: m.scrolling }))).observe({ type: 'longtask', buffered: true });
    let last = 0;
    m.arriving = {};
    const frame = (t) => {
      if (m.scrolling && last) {
        m.frames.push(t - last);
        // Which plate is arriving: its top between the foot of the screen and half a screen up.
        for (const s of document.querySelectorAll('section.plate')) {
          const top = s.getBoundingClientRect().top;
          if (top < innerHeight && top > -innerHeight * 0.5) {
            const a = (m.arriving[s.id] ??= { frames: 0, slow: 0 });
            a.frames += 1;
            if (t - last > 20) a.slow += 1;
          }
        }
      }
      last = t;
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  });
  const renderer = await page.evaluate(() => {
    const gl = document.createElement('canvas').getContext('webgl2');
    const d = gl?.getExtension('WEBGL_debug_renderer_info');
    return d ? gl.getParameter(d.UNMASKED_RENDERER_WEBGL) : 'unknown';
  });
  await page.goto(base, { waitUntil: 'load' });
  // The frontispiece has its three seconds; the plates load after it.
  await page.waitForTimeout(6000);
  const loading = await page.evaluate(() => ({ lcp: window.__perf.lcp, cls: window.__perf.cls, long: window.__perf.long.length, longest: Math.max(0, ...window.__perf.long.map((l) => l.ms)) }));

  // A steady read from top to bottom: small wheel steps every frame, as a trackpad gives.
  const total = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
  await page.mouse.move(options.viewport.width / 2, options.viewport.height / 2);
  await page.evaluate(() => (window.__perf.scrolling = true));
  const step = PACE / 60;
  const started = Date.now();
  while ((await page.evaluate(() => scrollY)) < total - 2 && Date.now() - started < 90000) {
    await page.mouse.wheel(0, step * 4);
    await page.waitForTimeout(66);
  }
  await page.waitForTimeout(800);
  const scrolled = await page.evaluate(() => {
    const m = window.__perf;
    m.scrolling = false;
    const f = [...m.frames].sort((a, b) => a - b);
    const q = (p) => f[Math.min(f.length - 1, Math.floor(p * f.length))] ?? 0;
    return {
      frames: f.length,
      fps: f.length ? 1000 / (f.reduce((s, v) => s + v, 0) / f.length) : 0,
      p50: q(0.5),
      p95: q(0.95),
      missed: f.filter((v) => v > 25).length,
      long: m.long.filter((l) => l.scrolling).map((l) => Math.round(l.ms)),
      arriving: m.arriving,
    };
  });
  results.push({ name, cpu, renderer, loading, scrolled, seconds: (Date.now() - started) / 1000 });
  await context.close();
}

await browser.close();
await new Promise((resolve) => server.httpServer.close(resolve));

const ok = (pass) => (pass ? 'within budget' : 'OVER BUDGET');
let over = initialKB > BUDGET.initialKB;
console.log(`Initial JavaScript: ${initialKB.toFixed(1)} KB gzipped (${initial.length} files) — ${ok(initialKB <= BUDGET.initialKB)} (${BUDGET.initialKB} KB)`);
for (const r of results) {
  const longScroll = r.scrolled.long.filter((ms) => ms > BUDGET.longTask);
  over ||= r.loading.lcp > BUDGET.lcp || r.loading.cls > BUDGET.cls || longScroll.length > 0;
  console.log(`\n${r.name}${r.cpu > 1 ? ` (CPU slowed ${r.cpu}×)` : ''} on ${r.renderer}`);
  console.log(`  LCP ${Math.round(r.loading.lcp)}ms — ${ok(r.loading.lcp <= BUDGET.lcp)}; CLS ${r.loading.cls.toFixed(3)} — ${ok(r.loading.cls <= BUDGET.cls)}`);
  console.log(`  while loading: ${r.loading.long} long tasks, the longest ${Math.round(r.loading.longest)}ms`);
  console.log(`  scrolling the whole atlas (${r.seconds.toFixed(0)}s): ${r.scrolled.frames} frames, ${r.scrolled.fps.toFixed(1)} fps on average, median ${r.scrolled.p50.toFixed(1)}ms, 95th percentile ${r.scrolled.p95.toFixed(1)}ms, ${r.scrolled.missed} frames over 25ms`);
  console.log(`  long tasks while scrolling: ${r.scrolled.long.length ? r.scrolled.long.join(', ') + 'ms' : 'none'} — ${ok(longScroll.length === 0)}`);
  console.log(`  frames over 20ms as each plate arrives: ${Object.entries(r.scrolled.arriving).map(([id, a]) => `${id.replace('plate-', 'Plate ')} ${a.slow} of ${a.frames}`).join(', ')}`);
}
await fs.mkdir('shots', { recursive: true });
await fs.writeFile(path.join('shots', 'perf.json'), JSON.stringify({ initialKB, results }, null, 2));
process.exitCode = over ? 1 : 0;
