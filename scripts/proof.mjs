// The proofreading pass (BRIEF §12): spelling, quotes, dashes, banned words, figure
// numbers, widows in titles and line lengths.
//
//   node scripts/proof.mjs
//
// It reads the words twice. Statically: the text and the reader-facing attributes of
// index.html, and the sentences the scripts write. In the browser: each title and each
// paragraph as set at six widths, to find titles that end on one word and lines that run
// past the 62-character measure. It exits non-zero if anything is found.

import { createServer } from 'vite';
import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const problems = [];
const flag = (where, what) => problems.push(`${where}: ${what}`);

// ---- The words, as written ------------------------------------------------------------

const html = await fs.readFile('index.html', 'utf8');
const decode = (s) =>
  s
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
const body = html.slice(html.indexOf('<body'));
const pageText = decode(
  body
    .replace(/<script[\s\S]*?<\/script>/g, ' ')
    .replace(/<style[\s\S]*?<\/style>/g, ' ')
    .replace(/<[^>]+>/g, ' '),
).replace(/\s+/g, ' ');
// Words a reader meets in attributes: labels, the toggles' two faces, hints, the description.
const attributes = [...html.matchAll(/\s(aria-label|data-show|data-hide|data-touch|title|alt|placeholder|content)="([^"]*)"/g)]
  .map((m) => decode(m[2]))
  .filter((v) => /[a-z] [a-z]/i.test(v));

// Sentences the scripts write into the page: string literals with at least two words,
// outside tests, the style tile and the debug panel.
const scripts = [];
async function walk(dir) {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!['styleguide', 'debug'].includes(entry.name)) await walk(file);
    } else if (file.endsWith('.ts') && !file.endsWith('.test.ts')) {
      const source = await fs.readFile(file, 'utf8');
      // Skip comments; keep '…', "…" and `…` literals that read as words.
      const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
      for (const m of code.matchAll(/'((?:[^'\\\n]|\\.)*)'|`((?:[^`\\]|\\.)*)`/g)) {
        const s = (m[1] ?? m[2] ?? '').replace(/\$\{[^}]*\}/g, 'x');
        if (/^[A-Z][a-z’]+( [a-z’,.:]+){2,}/.test(s)) scripts.push({ file: path.relative('.', file), s });
      }
    }
  }
}
await walk('src');

const BANNED = [
  'unleash', 'elevate', 'seamless', 'revolutionise', 'revolutionize', 'cutting-edge', 'harness', 'unlock',
  'supercharge', 'empower', 'game-changer', 'next-level', 'dive in', 'delve', 'journey', 'tapestry', 'realm',
  'embark', 'testament', "in today's world", 'in today’s world', 'the power of ai', 'welcome to',
];
// American spellings a British text should not have, and -ize words other than these.
const AMERICAN = ['color', 'center', 'behavior', 'favorite', 'gray', 'analyze', 'catalog ', 'meter', 'toward '];
const IZE_OK = new Set(['size', 'sizes', 'sized', 'prize', 'prizes', 'seize', 'capsize']);

function proof(where, text) {
  if (/[A-Za-z]'[A-Za-z]|'\s|\s'/.test(text.replace(/␣'/g, ''))) {
    const at = text.match(/.{0,20}[A-Za-z]'[A-Za-z].{0,20}|.{0,20}(?:'\s|\s').{0,20}/);
    if (at) flag(where, `straight apostrophe or quote in “${at[0].trim()}”`);
  }
  if (/"/.test(text)) flag(where, `straight double quote in “${text.slice(0, 60)}”`);
  if (/ - |--/.test(text)) flag(where, `a hyphen used as a dash in “${text.match(/.{0,20}(?: - |--).{0,20}/)[0]}”`);
  if (/!/.test(text)) flag(where, `an exclamation mark in “${text.match(/.{0,30}!/)[0]}”`);
  if (/ {2,}/.test(text)) flag(where, 'a double space');
  const lower = ` ${text.toLowerCase()} `;
  for (const w of BANNED) if (lower.includes(w)) flag(where, `the word “${w}”`);
  for (const w of AMERICAN) if (new RegExp(`\\b${w}`).test(lower)) flag(where, `American spelling “${w.trim()}”`);
  for (const m of lower.matchAll(/\b([a-z]+iz(?:e|es|ed|ing|ation))\b/g)) if (!IZE_OK.has(m[1])) flag(where, `American spelling “${m[1]}”`);
}

proof('index.html', pageText);
for (const a of attributes) proof('index.html attribute', a);
for (const { file, s } of scripts) proof(file, s);

// Figures are numbered in order, each caption begins “Fig. n.”.
// (Fig. 4b shares Fig. 4's caption, so every “Fig. n.” inside a caption counts.)
const captions = [...html.matchAll(/<figcaption[^>]*>([\s\S]*?)<\/figcaption>/g)].map((m) => decode(m[1].replace(/<[^>]+>/g, '')).trim());
const numbers = captions.flatMap((c) => (/^Fig\. /.test(c) ? [...c.matchAll(/Fig\. (\d+b?)\./g)].map((m) => m[1]) : [`(no number: “${c.slice(0, 30)}”)`]));
if (numbers.join() !== '1,2,3,4,4b,5,6') flag('figures', `numbered ${numbers.join(', ')}; expected 1, 2, 3, 4, 4b, 5, 6`);

// ---- The words, as set ---------------------------------------------------------------

const WIDTHS = [360, 390, 768, 1024, 1440, 1920];
const server = await createServer({ logLevel: 'error', server: { port: 5199, strictPort: false } });
await server.listen();
const base = server.resolvedUrls.local[0].replace(/\/$/, '');
const browser = await chromium.launch();
const measures = {};
for (const width of WIDTHS) {
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(`${base}/?shots`);
  await page.evaluate(() => window.__atlas.ready);
  const found = await page.evaluate(() => {
    const out = { widows: [], long: [], longest: 0 };
    const shown = (el) => el.offsetWidth > 2 && !el.closest('.visually-hidden, [aria-hidden="true"], details:not([open])');
    // The nearest block around a text node: words side by side in two blocks (two captions
    // in a row, or a plate's number above its title) are on different lines.
    const blockOf = (node) => {
      for (let e = node.parentElement; e; e = e.parentElement) if (getComputedStyle(e).display !== 'inline') return e;
      return null;
    };
    // The lines of an element, as the words that sit on each.
    const lines = (el) => {
      const words = [];
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      const range = document.createRange();
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        if (n.parentElement.closest('.visually-hidden, [aria-hidden="true"]')) continue;
        const block = blockOf(n);
        for (const m of n.textContent.matchAll(/\S+/g)) {
          range.setStart(n, m.index);
          range.setEnd(n, m.index + m[0].length);
          const r = range.getClientRects()[0];
          if (r) words.push({ w: m[0], top: r.top, block });
        }
      }
      const rows = [];
      for (const w of words) {
        const row = rows.find((r) => r.block === w.block && Math.abs(r.top - w.top) < 4);
        if (row) row.words.push(w.w);
        else rows.push({ top: w.top, block: w.block, words: [w.w] });
      }
      return rows.sort((a, b) => a.top - b.top).map((r) => r.words);
    };
    // A title's own lines, without the plate's number set above it.
    const titleLines = (el) => {
      const rows = lines(el);
      const number = el.querySelector('.plate__number');
      return number ? rows.filter((r) => r.join(' ') !== number.textContent.trim()) : rows;
    };
    for (const el of document.querySelectorAll('h1, h2, h3')) {
      if (!shown(el)) continue;
      const rows = titleLines(el);
      if (rows.length > 1 && rows.at(-1).length === 1) out.widows.push(rows.map((r) => r.join(' ')).join(' / '));
    }
    for (const el of document.querySelectorAll('main p, main li, main figcaption, footer p, footer li, .contents p, .frontispiece p')) {
      if (!shown(el)) continue;
      for (const row of lines(el)) {
        const n = row.join(' ').length;
        out.longest = Math.max(out.longest, n);
        if (n > 62) out.long.push(`${n}: ${row.join(' ').slice(0, 70)}`);
      }
    }
    return out;
  });
  measures[width] = found.longest;
  for (const w of found.widows) flag(`title at ${width}px`, `ends on one word: ${w}`);
  for (const l of [...new Set(found.long)]) flag(`line at ${width}px`, `longer than 62 characters (${l})`);
  await page.close();
}
await browser.close();
await server.close();

console.log(`Proofread index.html, ${attributes.length} attributes and ${scripts.length} sentences in the scripts.`);
console.log(`Longest line by width: ${Object.entries(measures).map(([w, n]) => `${w}px ${n}`).join(', ')}`);
if (problems.length) {
  console.log(`\n${problems.length} to look at:`);
  for (const p of problems) console.log(`  ${p}`);
  process.exitCode = 1;
} else {
  console.log('Nothing found.');
}
