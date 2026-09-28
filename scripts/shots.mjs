// Screenshots and accessibility checks for every checkpoint.
//
//   npm run shots            all pages, 1440×900 and 390×844, normal and reduced motion
//   npm run shots -- styleguide   only the pages whose name contains "styleguide"
//
// Starts its own Vite server and stops it afterwards. Writes PNGs and report.json to /shots.
// Axe runs on every state. In the WebGL render its colour-contrast rule is off, because
// axe cannot see colours drawn by WebGL; the ?nogl render (fields as real CSS colours,
// same tokens) runs every rule including colour contrast. See DESIGN-PLAN §8.9.

import { createServer, createLogger } from 'vite';
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
      {
        name: 'plate-1-loupe',
        only: 'desktop',
        run: async (p, ctx) => {
          await goTo(1, 0.75)(p);
          const box = await p.locator('.slip--specimen').first().boundingBox();
          if (!box) return;
          await p.mouse.move(box.x + 60, box.y + 40);
          await p.mouse.move(box.x + 110, box.y + box.height * 0.35, { steps: 8 });
          await p.waitForTimeout(450);
          const codes = await p.evaluate(() => [...document.querySelectorAll('.specimen-field .machine__char')].slice(0, 3).map((c) => c.dataset.code));
          ctx.check('under the loupe, the specimen is a row of numbers, one per character', codes.join() === '84,104,101', { codes });
        },
        after: (p) => p.mouse.move(5, 5),
      },
      {
        name: 'plate-1-machine-view',
        run: async (p, ctx) => {
          await goTo(1, 0.75)(p);
          await p.locator('.specimen-field .loupe-toggle').click();
          // The numbers must sit over the slip's own letters: the same lines, and no two numbers
          // on a tier touching. Pseudo-elements cannot be measured, so each number is set in a probe.
          const result = await p.evaluate(() => {
            const text = document.querySelector('.machine__letters');
            const fs = parseFloat(getComputedStyle(text).fontSize);
            const scale = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--codes-scale'));
            const breaks = (tops) => tops.flatMap((t, i) => (i && t.top > tops[i - 1].top + 5 ? [t.at] : [])).join();
            const slip = document.querySelector('.specimen-slip .slip').firstChild;
            const range = document.createRange();
            const letters = [...slip.textContent].map((_, i) => {
              range.setStart(slip, i);
              range.setEnd(slip, i + 1);
              return { at: i, top: range.getBoundingClientRect().top };
            });
            const probe = document.createElement('span');
            probe.style.cssText = `position:absolute;visibility:hidden;font-family:var(--font-numbers);font-size:${scale * fs}px`;
            document.body.append(probe);
            const width = (code) => ((probe.textContent = code), probe.getBoundingClientRect().width);
            const marks = [];
            const words = [];
            for (const word of text.querySelectorAll('.machine__word')) {
              const box = word.getBoundingClientRect();
              words.push({ at: marks.length, top: box.top });
              for (const c of word.children) {
                const b = c.getBoundingClientRect();
                marks.push({ x: b.left + b.width / 2, top: box.top, low: c.classList.contains('is-low'), w: width(c.dataset.code) });
              }
              if (word.dataset.space) marks.push({ x: box.right + 0.145 * fs, top: box.top, low: word.classList.contains('is-space-low'), w: width(word.dataset.space) });
            }
            probe.remove();
            let closest = Infinity;
            marks.forEach((m, i) => {
              const n = marks.slice(i + 1).find((o) => o.low === m.low);
              if (n && Math.abs(n.top - m.top) < 5) closest = Math.min(closest, n.x - m.x - (n.w + m.w) / 2);
            });
            return { slipLines: breaks(letters.filter((l) => slip.textContent[l.at] !== ' ')), machineLines: breaks(words), closest: Math.round(closest * 10) / 10 };
          });
          ctx.check('the machine’s numbers break into the slip’s lines, and no two touch', result.slipLines === result.machineLines && result.closest > 1, result);
        },
        after: (p) => p.locator('.specimen-field .loupe-toggle').click(),
      },
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
              names: [...document.querySelectorAll('.chart-name')].filter((b) => b.classList.contains('is-placed')).length,
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
            const shown = [...document.querySelectorAll('.chart-name')].filter((b) => b.classList.contains('is-placed') && b.dataset.constellation !== 'centre');
            const stop = shown.find((b) => ['laurel', 'chest', 'wardrobe', 'rule'].includes(b.dataset.constellation));
            return (stop ?? shown[0])?.dataset.constellation ?? null;
          });
          // Dispatched to the button itself: Playwright's click first scrolls the name "into
          // view", which can carry the page past the plate's rest and under Plate IV.
          if (id) await p.locator(`.chart-name[data-constellation="${id}"]`).dispatchEvent('click');
          await p.waitForTimeout(400);
          const result = await p.evaluate((target) => {
            const caption = document.querySelector(`.chart-stop[data-stop="${target}"]`);
            return {
              target,
              caption: caption ? Number(getComputedStyle(caption).opacity) : null,
              arrived: [...document.querySelectorAll('.chart-name')].some((b) => b.dataset.constellation === target && b.classList.contains('is-placed') && !b.classList.contains('is-edge')),
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
          // The open list pushes the plates below it down the page; their pins must follow. A jump
          // to Plate IV goes by its pin's measured place, so a stale one lands a list's length early.
          await p.waitForTimeout(300);
          await goTo(4, 0.5)(p);
          const where = await p.evaluate(() => {
            const r = document.getElementById('plate-4').getBoundingClientRect();
            return { inPlate: r.top < innerHeight / 2 && r.bottom > innerHeight / 2, top: Math.round(r.top) };
          });
          ctx.check('with the list open, the plates below still pin where they now lie', where.inPlate, where);
          await scrollToSelector(p, '.star-bench', -60);
        },
        after: (p) => p.locator('.star-list__summary').click(),
      },
      {
        // The plate indicator names the plate in view, and is gone over the list of plates.
        // A phone has no room for it (it would sit over the text), so there it is never shown.
        name: 'indicator',
        run: async (p, ctx) => {
          await goTo(3, 0.5)(p);
          await p.waitForTimeout(400);
          const label = () => p.evaluate(() => {
            const slip = document.querySelector('.plate-indicator');
            if (!slip || getComputedStyle(slip).display === 'none' || getComputedStyle(slip).visibility === 'hidden') return null;
            const face = [...slip.children].find((f) => getComputedStyle(f).visibility !== 'hidden');
            return face?.textContent ?? null;
          });
          const inPlate = await label();
          await goTo('list')(p);
          await p.waitForTimeout(400);
          const inList = await label();
          await goTo(3, 0.5)(p);
          ctx.check('the plate indicator names the plate in view, and hides over the list', inPlate === (ctx.touch ? null : 'Plate III of VI') && inList === null, { inPlate, inList });
        },
      },
      { name: 'plate-4-approach', motion: 'normal', gl: true, run: goTo(4, -0.4) },
      { name: 'plate-4-reading', motion: 'normal', gl: true, run: goTo(4, 0.2) },
      { name: 'plate-4-it', motion: 'normal', run: goTo(4, 0.417) },
      { name: 'plate-4-big', motion: 'normal', run: goTo(4, 0.591) },
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
        // Arrives with #small in the address, so it reloads the page on purpose.
        reloads: true,
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
      { name: 'plate-5-approach', motion: 'normal', gl: true, run: goTo(5, -0.4) },
      { name: 'plate-5-weighing', motion: 'normal', run: goTo(5, 0.4) },
      {
        name: 'plate-5',
        run: async (p, ctx) => {
          await goTo(5, 0.95)(p);
          const result = await p.evaluate(() => ({
            tickers: [...document.querySelectorAll('.weigh-likelihood')].map((t) => t.textContent),
            bar: Number(getComputedStyle(document.querySelector('.weigh-bar__strip')).transform.split(',')[0].replace('matrix(', '')),
          }));
          ctx.check('the bars weigh out trophy at 92.5%', result.tickers[0] === '92.5%' && Math.abs(result.bar - 0.925) < 0.01, result);
        },
      },
      {
        name: 'plate-5-cool',
        run: async (p, ctx) => {
          await goTo(5, 0.95)(p);
          await toTemperature(p, ctx, '0.30');
          const cool = await p.evaluate(() => document.querySelector('.weigh-likelihood').textContent);
          await toTemperature(p, ctx, '2');
          await p.waitForTimeout(400);
          const hot = await p.evaluate(() => ({ trophy: document.querySelector('.weigh-likelihood').textContent, value: document.querySelector('.dial__value').textContent }));
          ctx.check('turning the temperature re-weighs the bars from the softmax', cool === '100.0%' && hot.trophy === '62.9%' && hot.value === '2.00', { cool, ...hot });
          await goTo(5, 0.95)(p);
        },
        after: async (p, ctx) => {
          await toTemperature(p, ctx, '1');
          await goTo(5, 0.95)(p);
        },
      },
      {
        name: 'plate-5-draw',
        run: async (p, ctx) => {
          await goTo(5, 0.95)(p);
          await toControls5(p, ctx);
          for (let i = 0; i < 12; i++) await p.locator('.lever').click();
          await p.waitForTimeout(700);
          const result = await p.evaluate(() => ({
            strokes: document.querySelectorAll('.weigh-tally path').length,
            drawn: document.querySelector('.drawn')?.hidden === false,
            said: document.querySelector('.draw-status').textContent,
          }));
          await goTo(5, 0.95)(p);
          ctx.check('the lever draws pieces, and the tally keeps the last ten', result.strokes === 10 && result.drawn && /^Drawn: \w+\. In the last 10 draws: /.test(result.said), result);
        },
      },
      {
        name: 'plate-5-dial',
        only: 'desktop',
        motion: 'normal',
        run: async (p, ctx) => {
          await goTo(5, 0.95)(p);
          const box = await p.locator('.dial__face').boundingBox();
          if (!box) return;
          const cx = box.x + box.width / 2;
          const cy = box.y + box.height / 2;
          await p.mouse.move(cx, cy - box.height * 0.35);
          await p.mouse.down();
          for (let a = 0; a <= 60; a += 10) {
            const r = (a * Math.PI) / 180;
            await p.mouse.move(cx + Math.sin(r) * box.height * 0.35, cy - Math.cos(r) * box.height * 0.35);
          }
          await p.mouse.up();
          await p.waitForTimeout(1200);
          const value = await p.evaluate(() => Number(document.querySelector('#temperature').value));
          ctx.check('the dial turns by hand and moves the temperature with it', value > 1.2 && Math.abs(value * 20 - Math.round(value * 20)) < 1e-6, { value });
        },
        after: async (p, ctx) => {
          await toTemperature(p, ctx, '1');
          await p.mouse.move(5, 5);
        },
      },
      {
        name: 'plate-5-loupe',
        only: 'desktop',
        run: async (p, ctx) => {
          await goTo(5, 0.95)(p);
          const box = await p.locator('.weigh-likelihood').first().boundingBox();
          if (!box) return;
          await p.mouse.move(box.x - 30, box.y + 30);
          await p.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 8 });
          await p.waitForTimeout(450);
          const scores = await p.evaluate(() => [...document.querySelectorAll('.weigh-field .machine__score')].map((s) => s.textContent));
          ctx.check('under the loupe, the scores before weighing', scores[0] === '6.1' && scores.length === 7, { scores });
        },
        after: (p) => p.mouse.move(5, 5),
      },
      {
        name: 'plate-5-small',
        run: async (p, ctx) => {
          await p.evaluate(() => window.__atlas.setVariant('small'));
          await goTo(5, 0.95)(p);
          await p.waitForTimeout(400);
          const result = await p.evaluate(() => ({
            first: document.querySelector('.weigh-name').textContent,
            ticker: document.querySelector('.weigh-likelihood').textContent,
            note: !document.querySelector('.weigh-variant-note').hidden,
          }));
          ctx.check('in the variant suit is the favourite, and the note says why', result.first === 'suit' && result.ticker === '91.7%' && result.note, result);
        },
        after: (p) => p.evaluate(() => window.__atlas.setVariant('big')),
      },
      {
        name: 'plate-5-machine-view',
        run: async (p) => {
          await goTo(5, 0.95)(p);
          await p.locator('.weigh-field .loupe-toggle').click();
        },
        after: (p) => p.locator('.weigh-field .loupe-toggle').click(),
      },
      { name: 'plate-6-approach', motion: 'normal', gl: true, run: goTo(6, -0.4) },
      { name: 'plate-6-loop', motion: 'normal', run: goTo(6, 0.16) },
      { name: 'plate-6-trophy', motion: 'normal', gl: true, run: goTo(6, 0.4) },
      { name: 'plate-6-before-end', motion: 'normal', run: goTo(6, 0.63) },
      {
        name: 'plate-6',
        run: async (p, ctx) => {
          await goTo(6, 0.95)(p);
          // The toning runs in time, not scroll, and on a loaded software renderer the ticker can
          // fall behind the wall clock: wait for the answer to be printed rather than a fixed pause.
          await p
            .waitForFunction(() => Number(getComputedStyle(document.querySelector('.stick__answer')).opacity) > 0.99, null, { timeout: 10000 })
            .catch(() => {});
          const result = await p.evaluate(() => ({
            toned: document.querySelector('.stick-field').classList.contains('is-toned'),
            answer: document.querySelector('.stick__answer').textContent,
            shown: Number(getComputedStyle(document.querySelector('.stick__answer')).opacity),
            sorts: document.querySelectorAll('.stick .sort').length,
          }));
          ctx.check('the reply is set, the end mark stops it, and the plate tones to its answer', result.toned && result.answer === 'The trophy.' && result.shown > 0.9 && result.sorts === 4, result);
        },
      },
      {
        name: 'plate-6-untoned',
        motion: 'normal',
        run: async (p, ctx) => {
          await goTo(6, 0.45)(p);
          await p.waitForTimeout(1100);
          const toned = await p.evaluate(() => document.querySelector('.stick-field').classList.contains('is-toned'));
          ctx.check('scrolling back above the end mark un-tones the plate', !toned, { toned });
        },
      },
      {
        name: 'plate-6-small',
        run: async (p, ctx) => {
          await p.evaluate(() => window.__atlas.setVariant('small'));
          await goTo(6, 0.95)(p);
          // The toning runs in time, not scroll, and on a loaded software renderer the ticker can
          // fall behind the wall clock: wait for the answer to be printed rather than a fixed pause.
          await p
            .waitForFunction(() => Number(getComputedStyle(document.querySelector('.stick__answer')).opacity) > 0.99, null, { timeout: 10000 })
            .catch(() => {});
          const result = await p.evaluate(() => ({
            answer: document.querySelector('.stick__answer').textContent,
            sorts: document.querySelectorAll('.stick .sort').length,
            ids: [...document.querySelectorAll('[data-reply] td')].length,
          }));
          ctx.check('the variant takes one more loop and answers the suitcase', result.answer === 'The suitcase.' && result.sorts === 5 && result.ids === 5, result);
        },
        after: (p) => p.evaluate(() => window.__atlas.setVariant('big')),
      },
      {
        name: 'plate-6-machine-view',
        run: async (p) => {
          await goTo(6, 0.95)(p);
          await p.waitForTimeout(300);
          await p.locator('.stick-field .loupe-toggle').click();
        },
        after: (p) => p.locator('.stick-field .loupe-toggle').click(),
      },
      {
        // The index carries the reader to a plate as the list of plates does, keeping #small.
        name: 'index-travel',
        run: async (p, ctx) => {
          await p.evaluate(() => window.__atlas.setVariant('small'));
          await goTo('index')(p);
          await p.locator('.index a', { hasText: 'temperature' }).click();
          await p.waitForTimeout(ctx.motion === 'reduce' ? 300 : 2200);
          const result = await p.evaluate(() => ({ focused: document.activeElement?.id, hash: location.hash }));
          ctx.check('an index term carries the reader to its plate and keeps #small', result.focused === 'plate-5-title' && result.hash === '#small', result);
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

/** On a phone Plate V's dial and lever sit below the card: go to them first. */
async function toControls5(page, ctx) {
  if (!ctx?.touch) return;
  await scrollToSelector(page, '.weigh-instruments', -200);
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
}

/** Set the temperature through its real input, as a keyboard or screen reader would. */
async function toTemperature(page, ctx, value) {
  await page.evaluate((v) => {
    const input = document.querySelector('#temperature');
    input.value = v;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }, value);
  await page.waitForTimeout(ctx?.motion === 'reduce' ? 100 : 400);
}

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
  for (const entry of await fs.readdir(OUT, { withFileTypes: true })) {
    // Leave folders alone (the filmstrip keeps its own in /shots/film).
    if (!entry.isFile()) continue;
    const file = entry.name;
    const mine = (!filter || file.startsWith(filter)) && (!passFilter || file.includes(passFilter)) && (!cpFilter || file.includes(`-${cpFilter}`));
    if (mine) await fs.rm(path.join(OUT, file), { force: true });
  }

  // Quiet, except for what would disturb the pages being photographed: a reload, or a
  // re-optimisation of dependencies (which reloads every open page).
  const logger = createLogger('info');
  const info = logger.info;
  logger.info = (msg, options) => {
    if (/reload|optimi[sz]ed/i.test(msg)) info(`vite: ${msg}`, options);
  };
  const server = await createServer({ customLogger: logger, server: { port: 5199, strictPort: false } });
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
      // A page that reloads or crashes mid-pass is a problem in itself, and names where it happened.
      let at = 'load';
      // (A load event, not every navigation: #small changes the address without reloading.)
      let reloads = false;
      page.on('load', () => {
        if (at !== 'load' && !reloads) report.consoleProblems.push({ tag, type: 'reload', text: `the page reloaded during ${at}` });
      });
      page.on('crash', () => report.consoleProblems.push({ tag, type: 'crash', text: `the page crashed during ${at}` }));

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
        at = cp.name;
        reloads = !!cp.reloads;
        process.stdout.write(`  ${tag} ${cp.name} `);
        try {
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
        } catch (error) {
          // A checkpoint that fails outright is recorded, and the pass goes on from a fresh page
          // rather than losing the whole run's report.
          const text = String(error).split('\n')[0];
          process.stdout.write(`FAILED: ${text}\n`);
          report.consoleProblems.push({ tag, type: 'checkpoint', text: `${cp.name}: ${text}` });
          at = 'load';
          await page.goto(`${base}${def.url}${query ? `?${query}` : ''}`, { waitUntil: def.waitUntil ?? 'load' }).catch(() => {});
          await page.evaluate(def.ready).catch(() => {});
        }
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
