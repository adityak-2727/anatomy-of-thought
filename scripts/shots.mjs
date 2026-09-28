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
// And a third narrows it to checkpoints whose names start with it (e.g. plate-3).
const cpFilter = process.argv[4] ?? '';
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
      { name: 'plate-3-approach', motion: 'normal', gl: true, run: chartAt(-0.4) },
      { name: 'plate-3-handoff', motion: 'normal', run: chartAt(0.12) },
      { name: 'plate-3-developing', motion: 'normal', gl: true, run: chartAt(0.2) },
      { name: 'plate-3-lettered', motion: 'normal', run: chartAt(0.265) },
      { name: 'plate-3-laurel', motion: 'normal', run: chartAt(0.38) },
      { name: 'plate-3-chest', motion: 'normal', gl: true, run: chartAt(0.555) },
      { name: 'plate-3-wardrobe', motion: 'normal', gl: true, run: chartAt(0.705) },
      { name: 'plate-3-rule', motion: 'normal', run: chartAt(0.845) },
      {
        name: 'plate-3',
        run: async (p, ctx) => {
          await chartAt(0.97)(p);
          const result = await p.evaluate(() => {
            const shown = [...document.querySelectorAll('.chart-stop')].filter((c) => Number(getComputedStyle(c).opacity) > 0.9).map((c) => c.dataset.stop);
            return {
              drawing: document.getElementById('plate-3').dataset.chart,
              names: [...document.querySelectorAll('.chart-name')].filter((b) => getComputedStyle(b).visibility === 'visible').length,
              shown,
            };
          });
          const drawing = ctx.gl ? 'gl' : 'svg';
          const captions = ctx.motion === 'reduce' ? result.shown.length === 5 : result.shown.join() === 'centre';
          ctx.check(`the chart is drawn (${drawing}), lettered, and at rest with its caption`, result.drawing === drawing && result.names > 0 && captions, result);
        },
      },
      {
        // The reader's own words on the chart: ringed if charted, set at The Uncharted if not.
        name: 'plate-3-yours',
        run: async (p, ctx) => {
          await scrollToSelector(p, '.reader-bench', -120);
          if (await p.isVisible('.reader-clear')) await p.click('.reader-clear');
          await p.fill('#reader-sentence', 'My cat doesn’t fit in the red box.');
          await p.click('.reader-form .sens');
          await p.waitForFunction(() => document.querySelector('.reader-status')?.textContent?.startsWith('Exposed.'), null, { timeout: 12000 }).catch(() => {});
          await chartAt(0.97)(p);
          const result = await p.evaluate(() => ({
            rings: document.querySelectorAll('.chart-ring').length,
            note: !document.querySelector('.chart-uncharted').hidden,
            yours: document.querySelector('.star-list__yours').textContent,
            uncharted: document.querySelector('[data-uncharted]').textContent,
          }));
          const ok = result.rings === 9 && result.note && result.yours.includes('cat') && result.uncharted.includes('My');
          ctx.check('the reader’s pieces are ringed on the chart, and the unknown one set at The Uncharted', ok, result);
        },
        after: async (p) => {
          await scrollToSelector(p, '.reader-bench', -120);
          await p.click('.reader-clear');
        },
      },
      {
        name: 'plate-3-flight',
        run: async (p, ctx) => {
          await chartAt(0.97)(p);
          // Whichever name points the way from the border, take it.
          const id = await p.evaluate(() => {
            const shown = [...document.querySelectorAll('.chart-name')].filter((b) => getComputedStyle(b).visibility === 'visible' && b.dataset.constellation !== 'centre');
            const stop = shown.find((b) => ['laurel', 'chest', 'wardrobe', 'rule'].includes(b.dataset.constellation));
            return (stop ?? shown[0])?.dataset.constellation ?? null;
          });
          if (id) await p.locator(`.chart-name[data-constellation="${id}"]`).click();
          await p.waitForTimeout(400);
          const result = await p.evaluate((target) => {
            const caption = document.querySelector(`.chart-stop[data-stop="${target}"]`);
            return {
              target,
              caption: caption ? Number(getComputedStyle(caption).opacity) : null,
              arrived: [...document.querySelectorAll('.chart-name')].some((b) => b.dataset.constellation === target && getComputedStyle(b).visibility === 'visible' && !b.classList.contains('is-edge')),
            };
          }, id);
          const ok = !!id && result.arrived && (ctx.motion === 'reduce' || result.caption === null || result.caption > 0.9);
          ctx.check('a constellation’s name takes the chart there', ok, result);
        },
      },
      {
        name: 'plate-3-loupe',
        only: 'desktop',
        run: async (p, ctx) => {
          await chartAt(0.97)(p);
          const box = await p.locator('.chart-field').boundingBox();
          if (!box) return;
          await p.mouse.move(box.x + box.width / 2 - 40, box.y + box.height * 0.4);
          await p.mouse.move(box.x + box.width / 2, box.y + box.height * 0.45, { steps: 8 });
          await p.waitForTimeout(450);
          const lens = await p.evaluate(() => document.querySelector('.chart-field .machine__star')?.textContent ?? '');
          ctx.check('under the loupe, a star is written as coordinates and thousands more', /\d\.\d{3}.*and thousands more/.test(lens), { lens });
        },
        after: (p) => p.mouse.move(5, 5),
      },
      {
        // A gentle drag turns the chart a little: the names move with it.
        name: 'plate-3-drag',
        only: 'desktop',
        run: async (p, ctx) => {
          await chartAt(0.97)(p);
          const where = () => p.evaluate(() => [...document.querySelectorAll('.chart-name')].map((b) => b.style.transform).join('|'));
          const before = await where();
          const box = await p.locator('.chart-field').boundingBox();
          if (!box) return;
          await p.mouse.move(box.x + box.width * 0.3, box.y + box.height * 0.5);
          await p.mouse.down();
          await p.mouse.move(box.x + box.width * 0.3 + 160, box.y + box.height * 0.5 + 40, { steps: 12 });
          await p.mouse.up();
          await p.waitForTimeout(1500);
          const after = await where();
          ctx.check('a drag at rest turns the chart', before !== after, { moved: before !== after });
        },
        after: (p) => p.mouse.move(5, 5),
      },
      {
        name: 'plate-3-machine-view',
        run: async (p) => {
          await chartAt(0.97)(p);
          await p.locator('.chart-field .loupe-toggle').click();
        },
        after: (p) => p.locator('.chart-field .loupe-toggle').click(),
      },
      {
        name: 'plate-3-stars',
        run: async (p, ctx) => {
          await chartAt(1)(p);
          await scrollToSelector(p, '.star-bench', -60);
          await p.locator('.star-list__summary').click();
          const text = await p.textContent('.star-list__body');
          ctx.check('the list of the stars gives every constellation and its words', text.includes('The Crowded Centre') && text.includes('trophy, medal'), { length: text.length });
        },
        after: (p) => p.locator('.star-list__summary').click(),
      },
      { name: 'plate-4-approach', motion: 'normal', gl: true, run: goTo(4, -0.4) },
      { name: 'plate-4-reading', motion: 'normal', gl: true, run: goTo(4, 0.2) },
      { name: 'plate-4-it', motion: 'normal', run: goTo(4, 0.45) },
      { name: 'plate-4-big', motion: 'normal', run: goTo(4, 0.604) },
      {
        name: 'plate-4',
        run: async (p, ctx) => {
          await goTo(4, 0.95)(p);
          const result = await p.evaluate(() => {
            const shown = [...document.querySelectorAll('.thread-note')].filter((n) => Number(getComputedStyle(n).opacity) > 0.9).length;
            const laid = [...document.querySelectorAll('.read-piece .slip')].filter((s) => Number(getComputedStyle(s).opacity) > 0.9).length;
            const threads = document.querySelectorAll('.threads-field .threads:not(.threads--ghosts) .thread').length;
            return { shown, laid, threads };
          });
          const notes = ctx.motion === 'reduce' ? result.shown === 3 : result.shown === 1;
          ctx.check('the reading ends on the question mark, every piece laid and its threads drawn', notes && result.laid === 20 && result.threads > 0, result);
        },
      },
      {
        // Change big to small: the words, the threads, the inset, the caption, the address and the announcement.
        name: 'plate-4-small',
        run: async (p, ctx) => {
          await goTo(4, 0.95)(p);
          await toControls(p, ctx);
          await p.locator('.variant-switch').click();
          await p.waitForTimeout(ctx.motion === 'reduce' ? 300 : 900);
          const result = await p.evaluate(() => ({
            variant: window.__atlas.state().variant,
            hash: location.hash,
            label: document.querySelector('.variant-switch').textContent.trim(),
            said: document.querySelector('.variant-status').textContent,
            piece: document.querySelectorAll('.read-piece .slip')[13].textContent,
            answer: document.querySelector('[data-answer]').textContent,
            note: document.querySelectorAll('.thread-note')[1].textContent,
            table: document.querySelectorAll('[data-strongest] tr')[13].children[1].textContent,
          }));
          await goTo(4, 0.95)(p);
          const ok = result.variant === 'small' && result.hash === '#small' && result.label === 'Change small to big' &&
            result.said === 'Now the suitcase is too small. The threads lead to suitcase.' && result.piece === 'small' &&
            result.answer === 'suitcase' && result.note.includes('suitcase') && /suit|case/.test(result.table);
          ctx.check('Change big to small re-sets the words, the threads, the inset and the address, and says so', ok, result);
        },
        after: async (p, ctx) => {
          await toControls(p, ctx);
          await p.locator('.variant-switch').click();
          await goTo(4, 0.95)(p);
        },
      },
      {
        name: 'plate-4-back',
        run: async (p, ctx) => {
          await p.waitForTimeout(ctx.motion === 'reduce' ? 200 : 1900);
          const result = await p.evaluate(() => ({
            variant: window.__atlas.state().variant,
            hash: location.hash,
            said: document.querySelector('.variant-status').textContent,
            ghosts: document.querySelectorAll('.threads--ghosts g').length,
          }));
          ctx.check('changing back leaves the address clean and says so', result.variant === 'big' && result.hash === '' && result.said === 'Now the trophy is too big. The threads lead to trophy.', result);
        },
      },
      {
        name: 'plate-4-reader-two',
        run: async (p, ctx) => {
          await goTo(4, 0.95)(p);
          const before = await p.evaluate(() => [...document.querySelectorAll('.threads:not(.threads--ghosts) .thread')].map((t) => t.getAttribute('stroke-width')).join());
          await toControls(p, ctx);
          await p.locator('.readers input[value="1"]').check();
          await p.waitForTimeout(700);
          await goTo(4, 0.95)(p);
          const after = await p.evaluate(() => [...document.querySelectorAll('.threads:not(.threads--ghosts) .thread')].map((t) => t.getAttribute('stroke-width')).join());
          ctx.check('choosing a reader shows that reader’s threads', before !== after && after.length > 0, { changed: before !== after });
        },
        after: async (p, ctx) => {
          await toControls(p, ctx);
          await p.locator('.readers input[value="all"]').check();
        },
      },
      {
        name: 'plate-4-loupe',
        only: 'desktop',
        run: async (p, ctx) => {
          await goTo(4, 0.95)(p);
          const box = await p.locator('.threads__stage').boundingBox();
          if (!box) return;
          await p.mouse.move(box.x + box.width * 0.72, box.y + box.height * 0.45);
          await p.mouse.move(box.x + box.width * 0.78, box.y + box.height * 0.52, { steps: 8 });
          await p.waitForTimeout(450);
          const weights = await p.evaluate(() => [...document.querySelectorAll('.threads-field .machine__weight')].map((w) => w.textContent));
          ctx.check('under the loupe, the threads carry their weights as numbers', weights.length > 2 && weights.every((w) => /^\d\.\d\d$/.test(w)), { weights });
        },
        after: (p) => p.mouse.move(5, 5),
      },
      {
        name: 'plate-4-machine-view',
        run: async (p) => {
          await goTo(4, 0.95)(p);
          await p.locator('.threads-field .loupe-toggle').click();
        },
        after: (p) => p.locator('.threads-field .loupe-toggle').click(),
      },
      {
        // #small in the address sets the variant, whether typed in or there on arrival.
        name: 'plate-4-hash',
        run: async (p, ctx) => {
          const url = new URL(p.url());
          url.hash = 'small';
          await p.goto(url.toString());
          const typed = await p.evaluate(() => window.__atlas.state().variant);
          await p.reload();
          await p.evaluate(() => window.__atlas.ready);
          await goTo(4, 0.95)(p);
          const loaded = await p.evaluate(() => ({ variant: window.__atlas.state().variant, label: document.querySelector('.variant-switch').textContent.trim(), piece: document.querySelectorAll('.read-piece .slip')[18].textContent }));
          ctx.check('#small in the address sets the variant, typed in or on arrival', typed === 'small' && loaded.variant === 'small' && loaded.label === 'Change small to big' && loaded.piece === 'small', { typed, ...loaded });
        },
        after: (p) => p.evaluate(() => window.__atlas.setVariant('big')),
      },
      {
        name: 'endmatter',
        run: async (p, ctx) => {
          await goTo('colophon')(p);
          // Nothing may widen the page: on a phone that means sideways scrolling and a zoomed-out layout.
          const result = await p.evaluate(() => ({ inner: innerWidth, scroll: document.documentElement.scrollWidth }));
          const width = ctx.touch ? 390 : 1440;
          ctx.check('nothing makes the page wider than the screen', result.inner === width && result.scroll <= width, result);
        },
      },
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

/** On a phone Plate IV's switch and readers follow the pinned figure: go to them first. */
async function toControls(page, ctx) {
  if (!ctx?.touch) return;
  await scrollToSelector(page, '.threads-controls', -160);
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
}

/** Plate III, once its drawing (three.js or SVG) is in place. */
function chartAt(progress) {
  return async (page) => {
    await goTo(3, progress)(page);
    await page.waitForSelector('#plate-3[data-chart]', { state: 'attached', timeout: 30000 });
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  };
}

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
    const mine = (!filter || file.startsWith(filter)) && (!passFilter || file.includes(passFilter)) && (!cpFilter || file.includes(`-${cpFilter}`));
    if (mine) await fs.rm(path.join(OUT, file), { force: true });
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
        if (cpFilter && !cp.name.startsWith(cpFilter)) continue;
        if (!pass.gl && (cp.gl || ['plate-brushing', 'plate-developing', 'loupe'].includes(cp.name))) continue;
        const ctx = {
          touch: pass.vpName === 'phone',
          motion: pass.motion,
          gl: pass.gl,
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
          if (cp.after) await cp.after(page, ctx);
          continue;
        }
        const axe = new AxeBuilder({ page }).withTags(AXE_TAGS);
        if (pass.gl) axe.disableRules(['color-contrast']);
        const result = await axe.analyze();
        for (const v of result.violations) {
          report.violations.push({ shot: file, id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.map((n) => n.target.join(' ')).slice(0, 5) });
        }
        if (ctx.release) await ctx.release();
        if (cp.after) await cp.after(page, ctx);
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
