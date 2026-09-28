// Lighthouse, as BRIEF §12 asks before launch: Performance of at least 90 on desktop and 75
// on mobile; Accessibility, Best Practices and SEO of at least 95.
//
//   npm run lighthouse
//
// Builds the site, serves the build, and runs Lighthouse's mobile and desktop audits in
// Playwright's Chromium on this machine's GPU. The scores are printed with anything that
// cost points, and the full reports are written to /shots/lighthouse-*.html.

import { build, preview } from 'vite';
import { chromium } from 'playwright';
import lighthouse, { desktopConfig } from 'lighthouse';
import fs from 'node:fs/promises';
import path from 'node:path';

const TARGETS = { mobile: { performance: 75 }, desktop: { performance: 90 } };
const OTHERS = { accessibility: 95, 'best-practices': 95, seo: 95 };
const PORT = 9333;

await build({ logLevel: 'error' });
const server = await preview({ logLevel: 'error', preview: { port: 5209, strictPort: false } });
const base = server.resolvedUrls.local[0];

const browser = await chromium.launch({
  channel: 'chromium',
  args: [`--remote-debugging-port=${PORT}`, '--enable-gpu', '--use-angle=d3d11', '--ignore-gpu-blocklist'],
});
await fs.mkdir('shots', { recursive: true });

let short = false;
for (const [name, config] of [['mobile', undefined], ['desktop', desktopConfig]]) {
  const { lhr, report } = await lighthouse(base, { port: PORT, output: 'html', logLevel: 'error', onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'] }, config);
  await fs.writeFile(path.join('shots', `lighthouse-${name}.html`), report);
  console.log(`\n${name}`);
  for (const [id, category] of Object.entries(lhr.categories)) {
    const score = Math.round(category.score * 100);
    const target = TARGETS[name][id] ?? OTHERS[id];
    short ||= score < target;
    console.log(`  ${category.title.padEnd(15)} ${String(score).padStart(3)}  (at least ${target})${score < target ? '  SHORT' : ''}`);
    // What cost points: every weighted audit that did not pass.
    for (const ref of category.auditRefs) {
      const audit = lhr.audits[ref.id];
      if (ref.weight > 0 && audit.score !== null && audit.score < 0.9) {
        console.log(`      ${audit.title}${audit.displayValue ? `: ${audit.displayValue}` : ''} (${Math.round(audit.score * 100)})`);
      }
    }
  }
  // Where the blocking time comes from: the longest tasks, and the scripts that cost most.
  const tasks = lhr.audits['long-tasks']?.details?.items ?? [];
  if (name === 'mobile' && tasks.length) {
    console.log(`  longest tasks: ${tasks.slice(0, 8).map((t) => `${Math.round(t.duration)}ms at ${Math.round(t.startTime)} (${String(t.url).split('/').pop()})`).join(', ')}`);
  }
  const m = (id) => lhr.audits[id]?.displayValue ?? '–';
  console.log(`  FCP ${m('first-contentful-paint')}, LCP ${m('largest-contentful-paint')}, TBT ${m('total-blocking-time')}, CLS ${m('cumulative-layout-shift')}, Speed Index ${m('speed-index')}`);
}

await browser.close();
await new Promise((resolve) => server.httpServer.close(resolve));
console.log('\nReports in shots/lighthouse-mobile.html and shots/lighthouse-desktop.html');
process.exitCode = short ? 1 : 0;
