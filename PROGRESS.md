# Progress

## Phase 1: foundation and style tile (25 September 2026)

### Done
- **Answers to the Phase 0 questions** are recorded in DESIGN-PLAN §13: the revised Fig. 4b caption, and a colophon that credits only “Aditya”.
- **Repo housekeeping:**
  - Commits now use `Aditya Kashyap <224761282+adityak-2727@users.noreply.github.com>` (repo-local), so they appear on the adityak-2727 profile.
  - `.agents/`, `.claude/skills/` and `skills-lock.json` are ignored and untracked, but kept on disk.
- **Manual Vite setup.** Dependencies are pinned exactly:
  - gsap 3.15.0, lenis 1.3.26, three 0.186.1, simplex-noise 4.0.3, Fontsource Old Standard TT and League Gothic 5.3.0;
  - dev: typescript 7.0.2, vite 8.3.1, vitest 5.0.2, playwright 1.63.0, @axe-core/playwright 4.13.0, lil-gui 0.21.0, @types/three.
  - Chromium is installed for Playwright.
  - Scripts: `dev`, `build`, `preview`, `test`, `shots`, `og`.
- **Fonts:**
  - Latin WOFF2 files from the Fontsource packages, with our own `@font-face` rules and `font-display: swap`.
  - The two Old Standard styles are preloaded. A small Vite plugin injects the hashed file names after bundling.
  - The fallback faces are metric-matched with values measured in Chromium: Old Standard against Times New Roman, 107.26% / 70.86% / 22.38%; League Gothic against Arial Narrow, 71.91% / 134.88% / 31.98%.
- **Styles and motion tokens:**
  - `tokens.css` holds the nine brief colours plus aliases, the fluid type scale, space, grid, material sizes, CSS timings and CSS versions of the eases.
  - `type.css`, `base.css`, `components.css` and `plates.css`.
  - `eases.ts` holds the six CustomEases, durations, pen speed (`pen()`), seeded `vary()` and `jitterStagger()`, scrub values, pin lengths and seeds. `verbs.ts` has `setPress()` with its exact 1px recoil.
- **Background.**
  - One WebGL2 context and one fragment shader, in two passes: the paper on the fixed canvas, and each field drawn into its own canvas inside the field element (see the decisions below).
  - It renders on demand. There is a CSS fallback (`?nogl`, or automatically on failure or context loss) driven by the same state variables.
- **Lenis and ScrollTrigger:** the ticker order, touch left native, and Lenis off under reduced motion (it also switches live if the preference changes).
- **`?debug`:** lil-gui with the palette (updating CSS and the shader live), the ease paths (with curves on the proof sheet redrawn live), pen speed, Lenis lerp, loupe lerp, paper and exposure tuning, and each field’s brush, exposure, tone, seed, angle, strokes, overshoot and centre bias. A button copies the settings as JSON.
- **Components:**
  - `marks.ts`: slip cuts, torn ticker ends, deckled control edges, pins with white shadows on the blue, threads with plies and stray fibres, leaders, the ␣ mark and the lens rim.
  - `piece.ts`, `ticker.ts`.
  - `loupe.ts`: a fine-pointer lens with lerp; touch press-and-hold that magnifies what is under the finger and shows it above; the keyboard toggle; the one-time hint.
- **`styleguide.html`, laid out as a printer’s proof sheet:**
  - I. the palette as an ink ledger, with measured pairs;
  - II. the type scale, set with real copy;
  - III. a sample plate whose field brushes on and exposes on “Brush and expose” (intro, note and caption develop with it), plus “Clear the field”;
  - IV. figure materials, printed as you scroll: pinned lettered pieces with ticker strips, weighted threads, a sensitiser control in all five states, and a working loupe and machine view;
  - V. the six eases as curves you can run.
- **`index.html`** holds every word of the atlas as semantic, readable HTML, with the frontispiece field shown developed and the colophon crediting Aditya. The figures and motion arrive plate by plate in later phases.
- **`scripts/shots.mjs`:**
  - starts and stops its own Vite server;
  - captures every checkpoint at 1440×900 and 390×844, normal and reduced motion, plus a `?nogl` pass;
  - runs axe on every state and collects console problems.
- **`scripts/og.mjs`** builds, serves and photographs the frontispiece. It was checked by writing to `shots/og-check.png`; the real `public/og.png` is a Phase 8 job.
- **Tests (15, all passing):**
  - FNV-1a test vectors and ID range;
  - seeded randomness;
  - the palette equals the brief’s nine colours with the required contrasts, and nothing is near-black;
  - no hard-coded hex colour in any `.ts`, `.css` or `.glsl` file outside `tokens.css`.

### Verification (run at the end of this phase)
- `npm run build`: zero TypeScript errors. The initial JS is 60.7 KB gzipped, against the 180 KB budget; the `?debug` chunk is separate.
- `npm test`: 15 of 15 pass.
- `npm run shots`: 86 screenshots, 0 axe violations, 0 console errors or warnings. The WebGL path ran in headless Chromium (software GL); the CSS path ran under `?nogl`.

### Decisions and why
- **Fields render into their own canvases** (a change from BRIEF §7’s “pass up to two rectangles to a fixed canvas”).
  - With one fixed canvas, a field lags its text by a frame or more wherever scrolling is native: every phone, and reduced motion on desktop. It is visible at once.
  - Drawing each field with the same shader, then copying it into a canvas inside the field element, keeps one context and one shader, removes the lag and the pin maths, and means a still field costs nothing while scrolling. DESIGN-PLAN §8.4 is rewritten to match.
- **Gradient noise instead of value noise** throughout the shader. Value noise showed square pixels wherever it was thresholded, which read as digital.
- **Only `html` carries the paper colour.** A `body` background paints above the negative-z canvas and hid the paper grain.
- **The machine view in full is a tissue guard:** a translucent sheet of paper over the plate, as old atlases bound a printed tissue over each plate. The loupe lens itself stays opaque paper.
- **The loupe toggle swaps its label** (“Show…” / “Hide the machine’s view”) and doesn’t use `aria-pressed` too, so the button always says what it will do.
- **Pins go through the slip’s corner,** clear of the first letter; the shaft’s white shadow falls on the blue.
- **`vite.config.ts` is not type-checked by `tsc`.** Checking it would need `@types/node`, which BRIEF §10 doesn’t list. Vite still compiles it. Vitest runs with `css: true` so tests can read `tokens.css`.
- **A favicon now,** not in Phase 8, because a missing one logs a 404 console error and breaks “console clean”.
- **Choreography positions inside scrubbed timelines** (for example “threads start at 5.4”) are plate-specific storyboard data, kept in each module. The durations and eases they use still come from `eases.ts`. This is how I read CLAUDE.md’s “no magic timings”; say if you want the storyboards moved into data tables too.

### Screenshot critique

**What works**
1. The brushed field reads as hand-coated cyanotype: ragged overshooting edges, pigment pooling along the strokes, streaks of varied width, double-coat overlaps, and paper that looks like paper under the text.
2. Development is chemical, not digital: the sheet moves from sensitiser through grey-green to blue, mottled, centre first. Screenshots at 0.62 and 0.7 of the sequence show it.
3. The loupe and the machine view: a hatched rim, a magnified “␣suit / 19110” under the lens, and in full view a tissue guard with the plate faint beneath it.

**What looked generic or unfinished (all fixed, then re-shot)**
1. **Scanline streaks and an airbrushed exposure.** Every field had evenly spaced thin streaks, like brushed metal; development spread as a soft blob and then, after a first fix, as square speckles; stroke overlaps rippled like water. *Fixed:* clustered marks of varied width, anisotropic pooling, straighter frayed overlaps, gradient noise, and a mottled, gradual develop.
2. **Threads read as clean vector arcs,** and the machine’s weights piled onto one another. *Fixed:* a finer wobble, plies, and stray fibres that leave the thread and rejoin it; each weight is written on its own thread near the piece it reaches.
3. **Unfinished craft details:**
   - The full machine view was a flat white panel inside a blue frame. *Fixed:* the tissue guard.
   - Pins sat on the first letter of each slip. *Fixed:* moved to the corners.
   - The phone’s thread row ran off screen. *Fixed:* the row is trimmed and the slip size floor is 18px.
   - The touch lens showed what was 100px above the finger, not under it. *Fixed.*
   - The paper grain was invisible (the body background), then a crosshatch of scratches. *Fixed:* a soft cloudy formation with faint fibres.
   - Smaller fixes: Proof V’s Run buttons were centred; the “?debug” link broke after the “?”; the Fig. 1 caption touched the brushed edge; the paper chip vanished on paper.

### Known issues and watch list
- **Real GPU cost is unmeasured.** Headless screenshots use a software renderer. Profile the paper pass on a mid-range laptop and a phone early in Phase 2; the automatic drop to 0.75 scale, then CSS, is planned but not built.
- **Only Chromium has been run.** Firefox, Safari and iOS Safari (including the long-press loupe on a real device) are unchecked until the Phase 8 pass. They could be spot-checked earlier if you like; that means installing more Playwright browsers.
- **Axe’s colour-contrast rule is evaluated on the `?nogl` render.** It can’t see WebGL colours (DESIGN-PLAN §8.9).
- **The CSS fallback field is flat blue** with a ragged clip: acceptable, but plainer than the shader.
- **The list of plates** uses a CSS dotted border for its leaders until the Phase 2 hover (SVG dots). The frontispiece is static until its Phase 2 load sequence.
- **Old Standard in small white-on-blue text holds up at 18–19px** at DPR 1 and 2 in the shots. Keep an eye on it in Plate II’s letter labels.

## Phase 0: plan (25 September 2026)

### Done
- **Setup checks passed:**
  - Node v24.13.0 (≥ 20 required), git 2.53.0, npm 11.6.2.
  - Every package in BRIEF §10 resolves on npm under its listed name. The Fontsource names are unchanged: `@fontsource/old-standard-tt` 5.3.0 and `@fontsource/league-gothic` 5.3.0.
  - The current majors at planning time: gsap 3.15.0, lenis 1.3.26, three 0.186.1, simplex-noise 4.0.3, typescript 7.0.2, vite 8.3.1, vitest 5.0.2, playwright 1.63.0, @axe-core/playwright 4.13.0 and lil-gui 0.21.0.
- **Repository:**
  - `git init -b main`, with the remote `origin` set to https://github.com/adityak-2727/anatomy-of-thought.git.
  - `.gitignore` covers node_modules, dist and shots, plus local editor and settings files.
- **BRIEF.md and CLAUDE.md** were not on disk. They are now in the repo root, verbatim from the session brief.
- **DESIGN-PLAN.md** covers the tokens and type scale, the grid and breakpoints, the page structure, wireframes for every page (desktop and phone), a motion storyboard per plate, the reader-response table, the technical plan, an accuracy review, risks, a review against §9 and the open questions.
- **The brief’s numbers were checked with a script:**
  - Contrast: paper on prussian 7.70, prussian-deep on paper 12.01, sensitiser on prussian 5.66. All match the brief.
  - Softmax at T = 1: trophy 92.5% (big), suit 91.7% (small). This matches “about 92%”.

### Decisions and why
- **Folio layout (768–1099px, or under 700px tall).** A 4 + 7 split at tablet width gives an intro of about 18 characters per line, which breaks the brief’s type rules.
- **Plate IV takes the full width, with its text in a band above.** Twenty pieces at the 18px floor need about 900px on one line. It falls back to the vertical row, chosen by measurement.
- **Objects are exposed, not drawn; only actions are drawn with the pen.** This is the rule that maps every motion onto the eight verbs.
- **Field exposure only increases, while story beats stay reversible.** Something the machine has processed stays processed.
- **Toning is time-based once triggered.** It un-tones in 0.8s if the reader scrolls back above the end mark.
- **The Plate V table is a paper card lying on the field.** Its bars are exposed strips, the tickers hang off its edge, and a tally is kept per row.
- **“The” and “the” get neighbouring stars.** They are different pieces with different IDs; identical pieces share one star.
- **Display text uses `’`; the data keeps `'`.** IDs stay stable, and the tokeniser treats the two as the same.
- **Pin skeleton at boot, plate code lazily.** This keeps CLS near 0 and makes `__atlas.goTo` reliable.
- **Zero layout reads per frame for fields.** Cached geometry plus pin maths give each field’s position.
- **Axe colour contrast is run on the `?nogl` render.** Axe cannot see WebGL colours; the reasoning is in DESIGN-PLAN §8.9.
- **Added copy:** a Fig. 1 caption (Plate I needs one for the figures to be numbered in order) and a third Plate II error, “Keep it under forty pieces.”

### Known issues and watch list
- TypeScript 7, Vite 8 and Vitest 5 are new majors. They get checked first in Phase 1. If they misbehave, I’ll propose pinning the previous majors (and ask first).
- Old Standard hairlines in small white-on-blue text need testing in the Phase 1 style tile.
- The two-copy yellow-green title on the frontispiece is to be judged in the Phase 2 screenshots, with a simpler fallback ready.
- Fig. 4b’s caption is not strictly accurate for causal reading. This is open question 1.

### Verification
Phase 0 contains no site code, so there is nothing to build, test or screenshot. No claim is made that anything runs.

### Screenshot critique
None this phase (no pages yet).

### Open questions
See DESIGN-PLAN §13.
