# Progress

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
