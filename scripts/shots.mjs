// Screenshots and accessibility checks for every checkpoint.
//
//   npm run shots            all pages, 1440×900 and 390×844, normal and reduced motion
//   npm run shots -- styleguide   only the pages whose name contains "styleguide"
//
// Starts its own Vite server and stops it afterwards. Writes PNGs and report.json to /shots.
// Axe runs on every state. In the WebGL render its colour-contrast rule is off, because
// axe cannot see colours drawn by WebGL; the ?nogl render (fields as real CSS colours,
// same tokens) runs every rule including colour contrast. See DESIGN-PLAN §8.9.

import { createServer } from 'vite';
import { chromium } from 'playwright';
import { AxeBuilder } from '@axe-core/playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const OUT = path.resolve('shots');
const filter = process.argv[2] ?? '';

const VIEWPORTS = {
  desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
  phone: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
};

const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'];

const frame = (page) => page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
const settle = async (page, ms = 250) => {
  await frame(page);
  await page.waitForTimeout(ms);
  await frame(page);
};
const scrollToSelector = (page, selector, offset = 0) =>
  page.evaluate(
    ([sel, off]) => {
      const el = document.querySelector(sel);
      if (el) window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY + off);
    },
    [selector, offset],
  );

// Each checkpoint: a name, what to do, and whether it makes sense under reduced motion.
const PAGES = [
  {
    name: 'styleguide',
    url: '/styleguide.html',
    ready: () => window.__tile.ready,
    checkpoints: [
      { name: 'head', run: (p) => p.evaluate(() => window.scrollTo(0, 0)) },
      { name: 'palette', run: (p) => scrollToSelector(p, '[aria-labelledby="proof-palette"]') },
      { name: 'type', run: (p) => scrollToSelector(p, '[aria-labelledby="proof-type"]') },
      { name: 'type-2', run: (p) => scrollToSelector(p, '.specimen:nth-child(4)', -40) },
      { name: 'plate-blank', motion: 'normal', run: async (p) => { await scrollToSelector(p, '[aria-labelledby="proof-plate"]', 40); await p.evaluate(() => window.__tile.printTo(0)); } },
      { name: 'plate-brushing', motion: 'normal', run: (p) => p.evaluate(() => window.__tile.printTo(0.28)) },
      { name: 'plate-developing', motion: 'normal', run: (p) => p.evaluate(() => window.__tile.printTo(0.55)) },
      { name: 'plate-exposed', run: async (p) => { await scrollToSelector(p, '[aria-labelledby="proof-plate"]', 40); await p.evaluate(() => window.__tile.printTo(1)); } },
      { name: 'materials-mid', motion: 'normal', run: (p) => p.evaluate(() => window.__tile.materialsTo(0.55)) },
      { name: 'materials', run: async (p) => { await p.evaluate(() => window.__tile.materialsTo(1)); await scrollToSelector(p, '.materials-field', -80); } },
      { name: 'loupe', run: loupeOver('.materials__pieces .slip') },
      {
        name: 'machine-view',
        run: async (p) => {
          await p.mouse.move(5, 5);
          await p.locator('.loupe-toggle').click();
        },
        after: (p) => p.locator('.loupe-toggle').click(),
      },
      { name: 'eases', run: (p) => scrollToSelector(p, '[aria-labelledby="proof-eases"]') },
    ],
  },
  {
    name: 'index',
    url: '/',
    ready: () => window.__atlas.ready,
    checkpoints: [
      { name: 'frontispiece', run: (p) => p.evaluate(() => window.scrollTo(0, 0)) },
      { name: 'list', run: (p) => p.evaluate(() => window.__atlas.goTo('list')) },
      { name: 'plate-1', run: (p) => p.evaluate(() => window.__atlas.goTo(1)) },
      { name: 'endmatter', run: (p) => p.evaluate(() => window.__atlas.goTo('colophon')) },
    ],
  },
];

function loupeOver(selector) {
  return async (page, ctx) => {
    await scrollToSelector(page, '.materials-field', -80);
    await settle(page);
    const box = await page.locator(selector).nth(1).boundingBox();
    if (!box) return;
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;
    if (ctx.touch) {
      // Press and hold for 350ms+ to raise the lens above the finger.
      const cdp = await page.context().newCDPSession(page);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
      await page.waitForTimeout(500);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + 2, y: y + 1 }] });
      ctx.release = async () => cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    } else {
      await page.mouse.move(x - 40, y + 20);
      await page.mouse.move(x, y, { steps: 8 });
      await page.waitForTimeout(450);
    }
  };
}

async function run() {
  await fs.rm(OUT, { recursive: true, force: true });
  await fs.mkdir(OUT, { recursive: true });

  const server = await createServer({ logLevel: 'error', server: { port: 5199, strictPort: false } });
  await server.listen();
  const base = server.resolvedUrls.local[0].replace(/\/$/, '');

  const browser = await chromium.launch({
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
  });

  const report = { base, runs: [], violations: [], consoleProblems: [], environment: [] };
  const passes = [];
  for (const [vpName, vp] of Object.entries(VIEWPORTS)) {
    for (const motion of ['normal', 'reduce']) passes.push({ vpName, vp, motion, gl: true });
    passes.push({ vpName, vp, motion: 'normal', gl: false });
  }

  for (const pass of passes) {
    for (const def of PAGES) {
      if (filter && !def.name.includes(filter)) continue;
      const context = await browser.newContext({ ...pass.vp });
      const page = await context.newPage();
      await page.emulateMedia({ reducedMotion: pass.motion === 'reduce' ? 'reduce' : 'no-preference' });
      const tag = `${def.name}-${pass.vpName}-${pass.motion}${pass.gl ? '' : '-nogl'}`;

      page.on('console', (msg) => {
        const type = msg.type();
        if (type !== 'error' && type !== 'warning') return;
        const where = msg.location()?.url ?? '';
        const entry = { tag, type, text: msg.text(), where };
        // GPU driver chatter from the software renderer is not ours.
        if (!where.startsWith(base) && /GL Driver|GPU stall|swiftshader|WebGL/i.test(msg.text())) report.environment.push(entry);
        else report.consoleProblems.push(entry);
      });
      page.on('pageerror', (err) => report.consoleProblems.push({ tag, type: 'pageerror', text: String(err) }));

      await page.goto(`${base}${def.url}?shots${pass.gl ? '' : '&nogl'}`, { waitUntil: 'load' });
      await page.evaluate(def.ready);
      const mode = await page.evaluate(() => (document.documentElement.classList.contains('no-gl') ? 'css' : 'gl'));
      report.runs.push({ tag, mode });

      for (const cp of def.checkpoints) {
        if (cp.motion && cp.motion !== pass.motion) continue;
        if (!pass.gl && ['plate-brushing', 'plate-developing', 'materials-mid', 'loupe'].includes(cp.name)) continue;
        const ctx = { touch: pass.vpName === 'phone' };
        await cp.run(page, ctx);
        await settle(page, 350);
        const file = `${tag}-${cp.name}.png`;
        await page.screenshot({ path: path.join(OUT, file) });

        const axe = new AxeBuilder({ page }).withTags(AXE_TAGS);
        if (pass.gl) axe.disableRules(['color-contrast']);
        const result = await axe.analyze();
        for (const v of result.violations) {
          report.violations.push({ shot: file, id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.map((n) => n.target.join(' ')).slice(0, 5) });
        }
        if (ctx.release) await ctx.release();
        if (cp.after) await cp.after(page);
      }
      await context.close();
    }
  }

  await browser.close();
  await server.close();
  await fs.writeFile(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));

  const shots = (await fs.readdir(OUT)).filter((f) => f.endsWith('.png')).length;
  const modes = [...new Set(report.runs.map((r) => r.mode))].join(', ');
  console.log(`${shots} screenshots in /shots (render modes seen: ${modes})`);
  console.log(`axe violations: ${report.violations.length}`);
  for (const v of report.violations) console.log(`  ${v.shot}: ${v.id} (${v.impact}) ${v.help} -> ${v.nodes.join(', ')}`);
  console.log(`console errors and warnings: ${report.consoleProblems.length}`);
  for (const c of report.consoleProblems) console.log(`  ${c.tag}: [${c.type}] ${c.text} ${c.where ?? ''}`);
  if (report.environment.length) console.log(`(software-GPU messages ignored: ${report.environment.length})`);
  process.exitCode = report.violations.length || report.consoleProblems.length ? 1 : 0;
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
