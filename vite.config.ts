/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from 'vite';

// The two most-used faces are preloaded so the frontispiece can start on time.
// Their built file names are hashed, so the links are injected after bundling.
const PRELOAD_FONTS = [
  'old-standard-tt-latin-400-normal',
  'old-standard-tt-latin-400-italic',
];

function preloadFonts(): Plugin {
  return {
    name: 'atlas:preload-fonts',
    transformIndexHtml: {
      order: 'post',
      handler(_html, ctx) {
        const hrefs: string[] = [];
        if (ctx.bundle) {
          for (const file of Object.keys(ctx.bundle)) {
            if (file.endsWith('.woff2') && PRELOAD_FONTS.some((n) => file.includes(n))) {
              hrefs.push(`./${file}`);
            }
          }
        } else {
          for (const n of PRELOAD_FONTS) {
            const family = n.startsWith('old-standard') ? 'old-standard-tt' : 'league-gothic';
            hrefs.push(`/node_modules/@fontsource/${family}/files/${n}.woff2`);
          }
        }
        return hrefs.map((href) => ({
          tag: 'link',
          attrs: { rel: 'preload', as: 'font', type: 'font/woff2', crossorigin: '', href },
          injectTo: 'head' as const,
        }));
      },
    },
  };
}

// Link previews need the Open Graph image and the page's address as absolute URLs, which
// only the deployment knows: `SITE_URL=https://example.org/atlas/ npm run build`. Without
// it the build keeps relative paths, which is right for everything but the previews.
function siteUrl(): Plugin {
  const site = process.env.SITE_URL?.replace(/\/?$/, '/');
  return {
    name: 'atlas:site-url',
    transformIndexHtml(html) {
      if (!site) return html.replace(/\s*<link rel="canonical"[^>]*>|\s*<meta property="og:url"[^>]*>/g, '');
      return html
        .replaceAll('content="./og.png"', `content="${site}og.png"`)
        .replaceAll('href="%SITE_URL%"', `href="${site}"`)
        .replaceAll('content="%SITE_URL%"', `content="${site}"`);
    },
  };
}

export default defineConfig({
  // Relative base so the same build works at a domain root (Vercel)
  // and under a project path (GitHub Pages).
  base: './',
  plugins: [preloadFonts(), siteUrl()],
  // Pre-bundle every dependency up front, and transform the entry files as the server
  // starts, so a first visit in development doesn't wait on discovery (or reload for it).
  optimizeDeps: {
    include: [
      'gsap',
      'gsap/ScrollTrigger',
      'gsap/CustomEase',
      'gsap/SplitText',
      'gsap/DrawSVGPlugin',
      'gsap/Flip',
      'gsap/Draggable',
      'gsap/InertiaPlugin',
      'lenis',
      'simplex-noise',
      'three',
      'lil-gui',
    ],
  },
  server: {
    warmup: {
      clientFiles: ['./src/main.ts', './src/plates/*.ts', './src/styleguide/main.ts', './src/styles/index.css'],
    },
    // The screenshot harness and the filmstrip write into /shots (the filmstrip writes HTML
    // contact sheets); the dev server must not reload the page it is photographing.
    watch: { ignored: ['**/shots/**'] },
  },
  build: {
    target: 'es2022',
    // A plate's chunk lists the entry among the modules to preload, but the page's own
    // script tag has already loaded and run it; WebKit flags the second request as unused.
    modulePreload: {
      resolveDependencies: (_file, deps) => deps.filter((dep) => !/(^|\/)index-[^/]+\.js$/.test(dep)),
    },
    // Fonts must stay separate files so they can be preloaded and cached.
    assetsInlineLimit: 0,
    // three.js (Plate III) is one large chunk, loaded only near its plate and outside the
    // initial-JavaScript budget (BRIEF §10), so it is allowed past the default warning.
    chunkSizeWarningLimit: 600,
  },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
    // Tests read tokens.css as text; without this, CSS imports arrive empty.
    css: true,
  },
});
