# Anatomy of a Thought: project rules

A scroll-driven, fully animated editorial website: an illustrated atlas, printed as cyanotype plates, that follows one sentence through a large language model.

**BRIEF.md is the source of truth.** Read it in full at the start of every session, before doing anything else.

## How we work
- One phase per session (phases are in BRIEF.md §11). Finish the phase, then stop and wait for my review. Never start the next phase on your own.
- At the start of a phase, read BRIEF.md, DESIGN-PLAN.md and PROGRESS.md, restate the phase goals in a few lines, list the files you will touch, then build.
- DESIGN-PLAN.md (written in Phase 0) holds the tokens, wireframes and motion storyboards. When a decision changes, update it.
- At the end of every phase, update PROGRESS.md: what's done, decisions and why, known issues, and your screenshot critique.
- Commit to git at the end of every phase with a clear message. If a change goes badly wrong, return to the last good commit instead of piling fixes on top.
- When I send feedback, fix exactly what I pointed at first, then look for the same problem elsewhere.
- Ask me before adding any dependency that BRIEF.md §10 doesn't list.
- Never say something works unless you ran it: the build passes, the console is clean, and you looked at fresh screenshots.
- When unsure about a design decision, choose the more restrained option and note it in PROGRESS.md.

## Stack (fixed)
- Vite + TypeScript (strict), vanilla. No React, Vue, Tailwind, CSS frameworks or UI kits.
- GSAP 3 from the public `gsap` package (every plugin is free): ScrollTrigger, SplitText, DrawSVGPlugin, CustomEase, Flip, Draggable, InertiaPlugin.
- Lenis for smooth scroll, driven by the GSAP ticker and synced to ScrollTrigger.
- Raw WebGL2 (no library) for the paper and exposure background. three.js only for Plate III, lazy-loaded.
- simplex-noise. Dev only: lil-gui (behind `?debug`), Playwright, @axe-core/playwright, vitest.
- Self-hosted fonts: Old Standard TT (the narrator) and League Gothic (the machine's numbers). No other fonts.

## Code rules
- Colours, type sizes, spacing, eases and durations come only from `src/styles/tokens.css` and `src/motion/eases.ts`. No hard-coded hex values or magic timings anywhere else.
- Each plate is a module in `src/plates/` exporting `init()` and `destroy()`. Wrap animations in `gsap.context()`; use `gsap.matchMedia()` for breakpoints and `prefers-reduced-motion`.
- Animate transforms, opacity, SVG attributes and shader uniforms only. Never animate layout properties.
- Read layout (getBoundingClientRect) at most once per frame, never inside a loop of scroll callbacks.
- All content lives in semantic HTML in `index.html`; TypeScript enhances it. The text must be readable with JavaScript off.
- Anything the reader types is plain text (`textContent`), never HTML.
- Keep files small and named for what they do. Comment the why, not the what.

## Verification loop (every phase, details in BRIEF.md §12)
1. `npm run build` with zero TypeScript errors; `npm test` passes; no console errors.
2. `npm run shots` captures every checkpoint at 1440×900 and 390×844, normal and reduced motion, into `/shots`, and runs axe.
3. Open the screenshots. In PROGRESS.md, write three things that work and three that look generic, unfinished or off-brief. Fix those three, re-shoot, check again.

## Never (short version; the full list is BRIEF.md §9)
- Decorative gradients, gradient text, glassmorphism, glow, bloom, neon, "AI brain" particles, network-graph or circuit imagery.
- Black or near-black anywhere. The darkest colour is `--prussian-deep`.
- Rounded SaaS cards, pill badges, feature grids, logo walls, a centred hero with two buttons.
- Emoji, icon libraries, stock or AI-generated images, placeholder images, lorem ipsum.
- Any typeface other than Old Standard TT and League Gothic.
- Tracked-out ALL-CAPS labels, one word accented in a headline, "A · B · C" strings, "→" on links or buttons, monospace data labels.
- Fade-and-slide-up on every section, hover lift on everything, identical durations, custom cursor dots (the loupe is the only cursor change), page curls, a bouncing mouse icon.
- Marketing words (unleash, elevate, seamless, revolutionise, cutting-edge, harness, unlock, empower, journey, delve, tapestry, realm, embark, "the power of AI") and exclamation marks.
- Claims about Claude's internals. The site explains language models in general.
