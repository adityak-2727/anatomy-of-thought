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

export default defineConfig({
  // Relative base so the same build works at a domain root (Vercel)
  // and under a project path (GitHub Pages).
  base: './',
  plugins: [preloadFonts()],
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
  },
  build: {
    target: 'es2022',
    // Fonts must stay separate files so they can be preloaded and cached.
    assetsInlineLimit: 0,
  },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
    // Tests read tokens.css as text; without this, CSS imports arrive empty.
    css: true,
  },
});
