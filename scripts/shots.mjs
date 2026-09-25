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
// Optional second filter on the pass, e.g. "desktop-normal", "phone-reduce", "desktop-normal-nogl".
const passFilter = process.argv[3] ?? '';
// The software renderer can take many seconds over one frame of a busy page.
const SCREENSHOT_TIMEOUT = 120000;

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
      { name: 'materials-mid', motion: 'normal', gl: true, run: (p) => p.evaluate(() => window.__tile.materialsTo(0.55)) },
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
      { name: 'front-blank', motion: 'normal', gl: true, run: goTo('frontispiece', 0) },
      { name: 'front-brushing', motion: 'normal', gl: true, run: goTo('frontispiece', 0.18) },
      { name: 'front-sensitised', motion: 'normal', gl: true, run: goTo('frontispiece', 0.52) },
      { name: 'front-washing', motion: 'normal', gl: true, run: goTo('frontispiece', 0.68) },
      { name: 'frontispiece', run: goTo('frontispiece', 1) },
      { name: 'list', run: goTo('list') },
      {
        name: 'list-hover',
        only: 'desktop',
        run: async (p) => {
          await p.evaluate(() => window.__atlas.goTo('list'));
          await p.hover('.contents__list li:nth-child(4) .contents__entry');
          await p.waitForTimeout(400);
        },
        after: (p) => p.mouse.move(5, 5),
      },
      { name: 'plate-1-approach', motion: 'normal', gl: true, run: goTo(1, -0.45) },
      { name: 'plate-1-laid', motion: 'normal', run: goTo(1, 0) },
      { name: 'plate-1-exposing', motion: 'normal', gl: true, run: goTo(1, 0.18) },
      { name: 'plate-1', run: goTo(1, 0.75) },
      { name: 'plate-2-approach', motion: 'normal', gl: true, run: goTo(2, -0.4) },
      { name: 'plate-2-cutting', motion: 'normal', gl: true, run: goTo(2, 0.2) },
      { name: 'plate-2-parted', motion: 'normal', gl: true, run: goTo(2, 0.33) },
      { name: 'plate-2-separating', motion: 'normal', run: goTo(2, 0.46) },
      { name: 'plate-2-fixing', motion: 'normal', gl: true, run: goTo(2, 0.72) },
      { name: 'plate-2', run: goTo(2, 0.95) },
      {
        name: 'plate-2-loupe',
        only: 'desktop',
        run: async (p) => {
          await goTo(2, 0.95)(p);
          const box = await p.locator('.dissection__pieces .cut-piece:nth-child(2) .slip').boundingBox();
          if (!box) return;
          await p.mouse.move(box.x + box.width / 2 - 30, box.y + box.height / 2 + 20);
          await p.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 8 });
          await p.waitForTimeout(450);
        },
        after: (p) => p.mouse.move(5, 5),
      },
      {
        name: 'plate-2-machine-view',
        run: async (p) => {
          await goTo(2, 0.95)(p);
          await p.locator('.dissection-field .loupe-toggle').click();
        },
        after: (p) => p.locator('.dissection-field .loupe-toggle').click(),
      },
      {
        // One word is not a sentence: the atlas says so, and how to fix it.
        name: 'reader-error',
        run: async (p, ctx) => {
          await scrollToSelector(p, '.reader-bench', -120);
          await p.fill('#reader-sentence', 'Hello');
          await p.click('.reader-form .sens');
          const said = await p.textContent('.reader-status');
          const invalid = await p.getAttribute('#reader-sentence', 'aria-invalid');
          ctx.check('one word is refused with the brief’s message', said === 'Write at least two words.' && invalid === 'true', { said, invalid });
        },
      },
      {
        // A sentence of one's own is exposed and cut, and handed on to the next plate.
        name: 'reader-exposed',
        run: async (p, ctx) => {
          await scrollToSelector(p, '.reader-bench', -120);
          await p.fill('#reader-sentence', 'The unbreakable raincoat doesn’t fit in my rucksack.');
          await p.click('.reader-form .sens');
          await p.waitForFunction(() => document.querySelector('.reader-status')?.textContent?.startsWith('Exposed.'), null, { timeout: 12000 }).catch(() => {});
          const result = await p.evaluate(() => ({
            said: document.querySelector('.reader-status')?.textContent,
            pieces: [...document.querySelectorAll('.reader-pieces .slip')].map((s) => s.textContent),
            handedOn: window.__atlas.state().readerPieces.length,
          }));
          const ok = result.said === 'Exposed. Your pieces will appear on the next plate.' && result.pieces.length > 8 && result.handedOn === result.pieces.length;
          ctx.check('a sentence of one’s own is exposed, cut and handed on', ok, result);
        },
      },
      {
        name: 'reader-cleared',
        run: async (p, ctx) => {
          await p.click('.reader-clear');
          await p.waitForFunction(() => document.querySelector('.reader-status')?.textContent === 'Cleared.', null, { timeout: 4000 }).catch(() => {});
          const result = await p.evaluate(() => ({
            said: document.querySelector('.reader-status')?.textContent,
            pieces: document.querySelectorAll('.reader-pieces li').length,
            focused: document.activeElement?.id,
            handedOn: window.__atlas.state().readerPieces.length,
          }));
          ctx.check('Clear resets the bench', result.said === 'Cleared.' && result.pieces === 0 && result.focused === 'reader-sentence' && result.handedOn === 0, result);
        },
      },
      { name: 'endmatter', run: goTo('colophon') },
      {
        // A list entry carries the reader to the plate and hands its heading focus.
        name: 'list-travel',
        run: async (p, ctx) => {
          await goTo('list')(p);
          await p.click('.contents__list li:first-child .contents__entry');
          await p.waitForFunction(() => document.activeElement?.id === 'plate-1-title', null, { timeout: 6000 }).catch(() => {});
          const result = await p.evaluate(() => {
            const heading = document.getElementById('plate-1-title').getBoundingClientRect();
            return { focused: document.activeElement?.id === 'plate-1-title', inView: heading.top >= 0 && heading.bottom <= innerHeight };
          });
          ctx.check('the list of plates carries the reader to Plate I and focuses it', result.focused && result.inView, result);
        },
      },
      {
        // "Expose the atlas again" returns to the top and prints the frontispiece anew.
        name: 'replay',
        run: async (p, ctx) => {
          await goTo('colophon')(p);
          await p.click('[data-replay]');
          await p.waitForFunction(() => window.scrollY < 4, null, { timeout: 6000 }).catch(() => {});
          // Smooth scrolling passes the top a few frames before it completes and the replay
          // begins (frames are slow in the software renderer). Wait for the reprint to start;
          // if it never does, the check fails below.
          if (ctx.motion !== 'reduce') {
            await p
              .waitForFunction(() => Number(getComputedStyle(document.querySelector('.frontispiece__imprint')).opacity) < 0.5, null, { timeout: 3000 })
              .catch(() => {});
          }
          const result = await p.evaluate(() => ({
            top: window.scrollY < 4,
            imprint: Number(getComputedStyle(document.querySelector('.frontispiece__imprint')).opacity),
          }));
          const ok = ctx.motion === 'reduce' ? result.top && result.imprint > 0.99 : result.top && result.imprint < 0.5;
          ctx.check('Expose the atlas again returns to the top and prints the frontispiece again', ok, result);
          // Picture the reprint once finished: a moving frame is very slow in the software renderer.
          if (ctx.motion !== 'reduce') await p.waitForFunction(() => Number(getComputedStyle(document.querySelector('.frontispiece__hint')).opacity) > 0.99, null, { timeout: 20000 }).catch(() => {});
        },
      },
    ],
  },
  {
    // The real thing, without ?shots: the sequence plays on arrival, and a key press skips it.
    name: 'live',
    url: '/',
    shots: false,
    waitUntil: 'commit',
    // The instant the sequence starts (its silhouettes are built, then it plays, all in one
    // task), a mutation observer's callback runs, before any frame is drawn: it reads how
    // far the sequence has run, presses a key, and reads again. Deterministic however slow
    // the renderer is.
    init: () => {
      window.__skipTest = new Promise((resolve) => {
        const watch = new MutationObserver(() => {
          if (!document.querySelector('.silhouette') || !window.__atlas) return;
          watch.disconnect();
          const before = window.__atlas.frontispiece();
          window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Shift' }));
          const after = window.__atlas.frontispiece();
          const imprint = Number(getComputedStyle(document.querySelector('.frontispiece__imprint')).opacity);
          resolve({ before: +before.toFixed(3), after, imprint });
        });
        watch.observe(document, { subtree: true, childList: true });
      });
    },
    // Under reduced motion there is no sequence to catch. The `rm` class is set by an
    // inline script in the head, so let the document parse before looking for it.
    ready: () =>
      new Promise((parsed) => (document.readyState === 'loading' ? addEventListener('DOMContentLoaded', parsed, { once: true }) : parsed())).then(() =>
        document.documentElement.classList.contains('rm') ? true : window.__skipTest,
      ),
    checkpoints: [
      // Screenshots in the software renderer take seconds, longer than the sequence, so its
      // frames are pictured by the seeked checkpoints above. Here the behaviour is tested:
      // the sequence must be playing on its own, and a key press must finish it at once.
      {
        name: 'skipped',
        motion: 'normal',
        gl: true,
        run: async (p, ctx) => {
          // Read the result the init script recorded at the sequence's first instant.
          const result = await p.evaluate(() => window.__skipTest);
          const ok = result.before < 1 && result.after === 1 && result.imprint > 0.99;
          ctx.check('frontispiece plays by itself, and a key press skips to the end', ok, result);
        },
      },
    ],
  },
];

function goTo(target, progress = 0) {
  return (page) => page.evaluate(([t, pr]) => window.__atlas.goTo(t, pr), [target, progress]);
}

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
  // A filtered run replaces only its own pictures; a full run starts clean.
  await fs.mkdir(OUT, { recursive: true });
  for (const file of await fs.readdir(OUT)) {
    if (!filter || file.startsWith(filter)) await fs.rm(path.join(OUT, file), { force: true });
  }

  const server = await createServer({ logLevel: 'error', server: { port: 5199, strictPort: false } });
  await server.listen();
  const base = server.resolvedUrls.local[0].replace(/\/$/, '');

  const browser = await chromium.launch({
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
  });

  const report = { base, runs: [], violations: [], consoleProblems: [], environment: [], checks: [] };
  const passes = [];
  for (const [vpName, vp] of Object.entries(VIEWPORTS)) {
    for (const motion of ['normal', 'reduce']) passes.push({ vpName, vp, motion, gl: true });
    passes.push({ vpName, vp, motion: 'normal', gl: false });
  }

  for (const pass of passes) {
    for (const def of PAGES) {
      if (filter && !def.name.includes(filter)) continue;
      const passTag = `${pass.vpName}-${pass.motion}${pass.gl ? '' : '-nogl'}`;
      if (passFilter && passTag !== passFilter) continue;
      const context = await browser.newContext({ ...pass.vp });
      if (def.init) await context.addInitScript(def.init);
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

      const query = [def.shots === false ? '' : 'shots', pass.gl ? '' : 'nogl'].filter(Boolean).join('&');
      await page.goto(`${base}${def.url}${query ? `?${query}` : ''}`, { waitUntil: def.waitUntil ?? 'load' });
      await page.evaluate(def.ready);
      const mode = await page.evaluate(() => (document.documentElement.classList.contains('no-gl') ? 'css' : 'gl'));
      report.runs.push({ tag, mode });

      for (const cp of def.checkpoints) {
        if (cp.motion && cp.motion !== pass.motion) continue;
        if (cp.only && cp.only !== pass.vpName) continue;
        if (!pass.gl && (cp.gl || ['plate-brushing', 'plate-developing', 'loupe'].includes(cp.name))) continue;
        const ctx = {
          touch: pass.vpName === 'phone',
          motion: pass.motion,
          check: (what, ok, detail) => report.checks.push({ tag, what, ok, detail }),
        };
        const started = Date.now();
        process.stdout.write(`  ${tag} ${cp.name} `);
        await cp.run(page, ctx);
        await settle(page, cp.settle ?? 350);
        const file = `${tag}-${cp.name}.png`;
        await page.screenshot({ path: path.join(OUT, file), timeout: SCREENSHOT_TIMEOUT });
        process.stdout.write(`${((Date.now() - started) / 1000).toFixed(1)}s\n`);

        // Frames caught mid-sequence skip axe (it takes a second, and the page is moving);
        // the same page is checked once it has settled.
        if (cp.noAxe) {
          if (cp.after) await cp.after(page);
          continue;
        }
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
  const failed = report.checks.filter((c) => !c.ok);
  console.log(`behaviour checks: ${report.checks.length - failed.length} of ${report.checks.length} passed`);
  for (const c of report.checks) console.log(`  ${c.ok ? 'ok  ' : 'FAIL'} ${c.tag}: ${c.what} ${JSON.stringify(c.detail)}`);
  process.exitCode = report.violations.length || report.consoleProblems.length || failed.length ? 1 : 0;
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
