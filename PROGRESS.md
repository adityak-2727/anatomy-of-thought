# Progress

## Phase 8: Finish and launch (28 September 2026)

### Done
- **Five new checking scripts**, each with an `npm run` name:
  - **`sweep`:** the responsive and cross-browser pass. Chromium, Firefox and WebKit at 360 × 740, 390 × 844, 844 × 390 (a phone turned), 768 × 1024, 1440 × 900 and 1920 × 1080, on the production build. At each it visits the title page, the list, every plate at rest and the colophon. It checks that nothing makes the page wider than the screen, that whatever is pinned is whole on screen, and that the plate indicator sits on nothing, and it runs axe. Then it resizes one page from 1920 to 360 and back, and turns a phone on its side and back in Chromium and WebKit.
  - **`keyboard`:** the keyboard-only pass and the screen-reader pass (below).
  - **`proof`:** the proofreading pass. It checks quotes, dashes, banned words, American spellings and figure numbers in the page and in every sentence the scripts write. In the browser at six widths, it checks for titles that end on one word and for lines over 62 characters.
  - **`perf`:** the performance budget, on this machine's own GPU.
  - **`lighthouse`:** Lighthouse's mobile and desktop audits. The `lighthouse` package was added as a dev dependency, with your approval.
- **Launch files:**
  - The Open Graph image (`public/og.png`, the developed title page at 1200 × 630) and a touch icon (`public/apple-touch-icon.png`), both from `npm run og`.
  - The page's Open Graph, Twitter card, theme-colour and colour-scheme meta.
  - A `SITE_URL` build variable that makes the preview image and the canonical address absolute.
  - `DEPLOY.md`, with steps for Vercel and for GitHub Pages (the Actions workflow is written out there, not added to the repository).

### What the passes found, and what changed
**Responsive and cross-browser** (`npm run sweep`)
- **Pinned figures taller than the screen.** On a phone turned on its side every pinned figure was taller than the screen, and at 360 × 740 Plate V's was 72px too tall. Worse, a real iPhone shows only about 660–750px of a page between Safari's bars, and Plate V's pinned figure was 812px, Plate IV's strip 796px. Three changes:
  - A screen under 600px tall now shows the plates developed and still, as reduced motion does.
  - In one column only the field pins; the caption follows. Plate III pins its stops with the chart.
  - Plate V on a phone puts the lever beside the reply's empty slot (the slot it fills) and the machine's-view toggle in the corner beside the dial: 812px became 594px. Plate IV's slips on end sit 25px apart instead of 28: 796px became 707px.
- **Plate IV on laptops.** Its pinned frame was 882–907px tall, so at 1366 × 768, the most common Windows laptop, its bottom 116px were cut off. Now:
  - The captions and the notes stand side by side under the field.
  - The row has 132px of headroom above it (its highest thread rises about 125px), and the inset is 200 × 112.
  - The gaps close up a little on screens under 800px tall.

  It now fits 1366 × 768, 1280 × 800 and larger.
- **The plate indicator sat on text.** It covered the end of Plate IV's caption on every laptop, and in the one-column layout the notes ran under it. It now shows only in two columns, and Plate IV ends above it.
- **Turning a phone lost the reader's place.** Turned at Plate III and back, the reader was in Plate II, because pins change length with the screen. The page now notes the reader's place at a resize and returns to it once everything has re-measured. Building this found two faults of its own, both fixed:
  - Its timers were adopted by GSAP's `matchMedia` contexts and killed with them.
  - Its final check would have pulled back a reader who had already scrolled on. It now lets go the moment the reader scrolls, touches or presses a key.
- **WebKit:**
  - It fetched the main script a second time: Vite listed the entry among a lazy chunk's preloads, though the page's own script tag had already run it. It is now left out.
  - It also fetches the two preloaded Old Standard faces twice, because it loads same-origin fonts without CORS. The spec-correct preload is right for Chromium and Firefox, and no single link serves both, so this is noted.

**Accessibility** (`npm run keyboard`, the reduced-motion passes of `npm run shots`)
- **A keyboard could not fly the chart.** All fifteen constellation names were missing from the Tab order, because a name with no room to be lettered was `visibility: hidden`, and before the chart is lettered that is all of them. Unplaced names are now transparent rather than hidden: they keep their place, show themselves while focused, and Enter does what a click does.
- **Every turn of the temperature was announced twice:** once by the slider's own value ("1.05, warm"), once by the written "1.05", an `<output>` and so a live region. The written value is now hidden from screen readers.
- The Tab order runs: the skip link, the list, each plate's controls in reading order, the colophon, the index. Every one of its 54 stops is on screen, uncovered and ringed, in both motion modes. The accessibility tree reads as the page does: one h1, a named region per plate with its heading, each figure named by its caption and followed by its content as text, every control named, and three polite live regions.

**Proofreading** (`npm run proof`)
- No straight quotes, spaced hyphens, exclamation marks, banned words or American spellings, in the page or in the 22 sentences the scripts write. Figures run 1, 2, 3, 4, 4b, 5, 6.
- **Lines were too long.** The plan's measure of 31em assumed half an em a character; Old Standard sets about 0.43em, so lines ran to 70–87 characters. The measure is now 26em for roman and 25em for italic. The longest line at any width is 61 characters.
- **"The composing stick" ended on "stick" alone** at 1440px wide. "composing stick" is now kept together.

**Performance** (`npm run perf`, on this machine's own Intel GPU)
- **A first visit froze for 3.1 seconds.** Asking for the paper shader's compile result at once held the page while Direct3D compiled it. The shader is now built as two passes, one for the paper and one for the fields, compiled side by side in the background. Each is only the half it needs, and together they take about a second, while the page stays live.
- **The fields had been drawing paper.** The first build of that split named its switch `PAPER`, which the shader already used for the paper colour. So the fields ran the heavy paper branch, and the frame rate fell from 59.6 to 55 fps. The drop in the measurement found it; comparing against a fresh build of Phase 7 pinned it down.
- **Two stalls mid-scroll.** The scratch canvas grew a few pixels at a time as Plate IV came near, holding a frame for 90ms; it is now sized at start-up and grows with room to spare. The chart's shaders compiled at its first draw; they now compile with `compileAsync` first.

**Lighthouse** (`npm run lighthouse`)
- SEO was 91 because there was no `robots.txt`; there is now.

**The stutter as a plate arrives** (your report during this phase)
- **Measured first.** `npm run perf` now counts, for each plate as it arrives, the frames that miss 60 fps. At 1×, Plates III and IV dropped 7 and 2 frames. At 1.25× (a Windows laptop at 125%), Plate III dropped 13. At 2×, every plate dropped 17–39 frames and ran at 44–54 fps, with single frames of up to 233ms.
- **The cause was the GPU, not the page's code.** A Chrome trace of Plates III and IV arriving showed the page's main thread comfortable, at about 7ms a frame, while the GPU spent 3.3 of 23 seconds in WebGL, in tasks of up to 83ms. The field shader works about fifty noise values a pixel. Plate IV's field, the widest, is some 900,000 pixels, and it was drawn in full every frame while it brushed on and developed. On top of that, the full-resolution pass came 150ms after a field stopped changing, even mid-scroll. And at 2× every field had four times the pixels.
- **What changed** (the page looks the same):
  - A changing field is drawn as a draft, at 60% of a CSS pixel and at most thirty times a second.
  - The sharp pass waits until the page has been still for 0.3s.
  - Fields and the chart are drawn at no more than 1.5 device pixels to the CSS pixel.
  - A field coming back into range is drafted first.
- **After:** plates arrive at 59–60 fps at every density. The only slow frames left are 1–3 on Plate III's first arrival, when its chart is built.

**The full screenshot run**
- **Opening "List the stars" put Plates IV to VI out of step.** The list adds about 2,000px below the chart, and nothing re-measured the scroll, so every pin below it would have played a list's length early. Axe found it: Plate IV's intro was half-developed while nowhere near the screen. The page now re-measures when the list opens or closes. A new check jumps to Plate IV with the list open: before the fix it landed with the plate still 1,254px below the screen; after it, in the middle of Plate IV, on every pass.
- **The same fault in two more places, fixed the same way:**
  - Plate V's variant note appears when big becomes small.
  - Plate III's Uncharted note appears when the reader's sentence has pieces the chart doesn't know.

  In one column each stands above its plate's field, so each moved the pins from there down.
- **The harness itself:**
  - It now records any reload or crash with the checkpoint it happened in.
  - A checkpoint that fails outright is recorded, and the pass carries on from a fresh page instead of losing the whole run's report.
  - Twice, a run died at Plate III's flight on the phone, which passes when run alone. The first time, Playwright's click scrolled the name "into view", past the plate's rest and under Plate IV. The check now dispatches the click to the button.
  - The chart now calls three.js's `compileAsync` only where the browser can compile in the background (the software renderer cannot, and three.js warned).

### The restraint pass: one element removed from each plate
Each plate was looked at in close-up at twice the resolution first; two of the Phase 0 candidates changed on inspection.
- **Frontispiece: nothing.** The candidate, a rule under the title, was never built, and everything else on the page is the brief's.
- **Plate I: the right pin's shaft and its white shadow.** The right pin is now pushed straight in, showing only its head. One shadow on the blue is the detail; a second only repeated it.
- **Plate II: the leader lines on the letter labels.** Each letter sits directly above its piece, so a line to it said nothing more. The rows moved 8px closer.
- **Plate III: the graticule.** In the resting view its lines crossed the chart and competed with the constellation lines, which carry meaning. The ruled border with its degree ticks already says "a chart of the sky".
- **Plate IV: the second ply on strong threads.** Width already carries a thread's weight, as the brief asks. The plan's other thought, the stray fibres, stays: they are the brief's "slightly fuzzy, like laid cotton".
- **Plate V: the double rule over the card.** The card's column heads are for screen readers only, so the rule headed nothing.
- **Plate VI: the shoulder line on the sorts.** It was barely visible, and it competed with the nick, the true letterpress cue.

### Verification (at this commit)
- `npm run build`: zero TypeScript errors. The first-screen JS is 73.9 KB gzipped (budget about 180).
- `npm test`: 107 of 107 pass.
- `npm run shots`: the last complete run took 371 screenshots, 167 of 167 behaviour checks passed, and there were no console errors. It had one axe violation, the "List the stars" fault above. That checkpoint was then re-run on all six passes: 0 violations, and every check passed, including the new one. **A full run on this final code was still going when this was committed, at your request;** its result belongs to the next entry.
- `npm run sweep`: Chromium, Firefox and WebKit at all six sizes, the resize from 1920 to 360 and back, and the turned phones: no problems, apart from WebKit's noted font fetch. **This was before the last performance changes; it is to be run again.**
- `npm run keyboard`: 16 of 16 checks; 54 Tab stops, every one on screen, uncovered and ringed, in both motion modes.
- `npm run proof`: nothing found; the longest line at any width is 61 characters.
- `npm run perf`, on this machine's Intel UHD Graphics:
  - initial JavaScript 71.5 KB gzipped;
  - laptop: LCP 104ms, CLS 0, 59.4 fps across the whole atlas, and no long task while scrolling;
  - phone, with its CPU slowed four times: LCP 900ms, CLS 0, 59.2 fps; two long tasks as Plate III's chart is built.

  Plate arrivals after the stutter fix are as reported above.
- `npm run lighthouse`: desktop 100 for Performance, Accessibility, Best Practices and SEO. Mobile Performance 92–95 over three runs, and 100 for the other three categories. One earlier run gave mobile Performance 70, its blocking time 1.7s.

### Screenshot critique

**What works**
1. **Plate IV on a laptop screen.** At 1366 × 768 the whole plate stands on one screen. The captions sit on the field's edge, the note that follows the reading stands beside them like a marginal note, and the plate indicator has clear paper beneath it.
2. **One atlas in three engines.** Firefox and WebKit draw the same brushed fields (WebGL in all three), the same type and the same layout at every size, down to the pins and tickers.
3. **The link preview is the title page:** the brushed field, the title and the pinned slip, with the imprint beneath, and no instruction to scroll.

**What looked off (fixed, then re-shot)**
1. **Plate IV ran off a laptop's screen,** its captions cut at 1366 × 768 and the plate indicator sitting on them at every laptop size. *Fixed:* the captions and notes now sit side by side, the headroom and inset are smaller, and the indicator shows only in two columns.
2. **Plate V was 812px tall on a phone,** taller than an iPhone's visible screen, with its lever and toggle on rows of their own. *Fixed:* the lever now sits beside the reply's slot, the toggle beside the dial, and only the field pins. It is 594px.
3. **The Open Graph image said "Scroll to begin."** *Fixed:* the hint is left out of the preview.

### Known issues and watch list
- **Plate IV at 1100–1279 wide and 700–730 tall** is 4–45px taller than the screen while pinned. The last lines of its captions come in as the pin releases.
- **On a phone with its CPU slowed four times,** building and first drawing Plate III's chart take about 75ms each, one screen before the plate, as the brief times the chart's import. The same work stays under 50ms on the laptop.
- **WebKit fetches the two preloaded Old Standard faces twice** (see above).
- **Not yet checked on real devices:**
  - iOS Safari, including the loupe's press-and-hold and the toolbar resizing the screen;
  - a real Android phone;
  - a second GPU.

  All measurements are from one Intel UHD laptop, with phones emulated.
- **On a first visit, the paper's texture tile arrives about a second after the first paint;** until then the page is plain paper.
- **Plate VI's three loop arrowheads gather at the end of the miniature row,** where at small sizes they read like a row of 2s.
- **Names on Plate III can still cross stars** at the border (from Phase 4).
- **Still to do for this phase:** the full screenshot run on this code, the three-browser sweep again, and `perf` and `lighthouse` again after the arrival fix.


## Phase 7: The whole (28 September 2026)

### Done
- **The loupe on every plate.** Plate I was the only plate without one, and the brief gives it no machine's view, so I chose one that is literally true: the sentence as the machine receives it before it is cut, one number per character (T is 84, the space 32, the straight apostrophe 39). The numbers are set in the slip's own type, width and turn, each in its letter's place, alternately a little high and low so narrow letters' numbers do not run together. Plate I now has “Show the machine's view”, and the numbers follow the figure as text for screen readers (tested against the sentence's character codes).
- **The plate indicator** (`src/components/plate-indicator.ts`): a small paper slip at the bottom left, “Plate III of VI”, following the plate that crosses the middle of the screen. It crossfades in 150ms and is hidden over the frontispiece, the list of plates, the colophon and the index. It repeats the headings, so it is hidden from screen readers. On a phone it is not shown (see below).
- **A filmstrip of the whole atlas** (`scripts/film.mjs`): it scrolls from top to bottom in half-screen steps at both viewports and lays the frames out as a contact sheet, labelled with each frame's depth and the part of the atlas in view. This is how I read the rhythm below. The sheets are in `/shots/film`.
- **The harness:** `goTo` now jumps, lets the page settle, re-measures and jumps again until the target stops moving (the Phase 5 known issue), and its clean-up leaves the filmstrip's folder alone. New checks: Plate I's loupe (the numbers 84, 104, 101 under “The”) and the plate indicator (it names the plate in view and hides over the list).

### The rhythm: what I changed, and why
Read from the desktop and phone filmstrips (27 and 23 screens deep).
- **Plate I pauses less.** Two frames in a row were identical: nearly two screens of stillness for a one-line riddle. The pin is now 130vh (78 on a phone), so the rest is 65vh rather than 85, still long enough to solve the riddle.
- **Plate III breathes over the whole chart.** The chart was lettered and the camera left for The Laurel straight away, so the reader never saw it entire. It now waits 15vh over the lettered chart; each stop keeps a 25vh dwell.
- **Plate IV hurries through the plain words and pauses on the clue.** The nine ordinary opening pieces (trophy to because) now take 8 units each instead of 11; it takes 16 and the first big 20, where the story turns; the question mark, which ends the reading, takes 14. The twenty steps still fill the same pin.
- **Plate V exposes a little faster** (30–90vh rather than 35–105), leaving 40vh of still rest for the dial and the lever, which is where the plate is played with.
- **Plate VI's first loop teaches and the later ones hurry** (weights 1.3, 1, 0.8, 0.7), so the reader learns the pattern once and then sees it run.
- **Left as it was:** Plate II, which changes in every frame of the filmstrip, and the gaps between plates, 44vh of plain paper that let each plate breathe before the next field is brushed.

### Transitions between plates
Each plate hands over in the same way. Its pin releases, its figure scrolls away with its field fully developed (exposure never goes back), and plain paper follows. The next field is brushed on as its plate rises and develops as it arrives, while the indicator crossfades to the next plate's number. The story carries across as well: Plate III opens on Plate II's pieces, Plate IV's inset is Plate III's chart, Plate V begins where the reply begins, and Plate VI ends the atlas by toning. I added no transition effects of my own: the brief asks for one signature sequence per plate, and the pages of a book simply turn.

### Verification (run at the end of this phase)
- `npm run build`: zero TypeScript errors. The first-screen JS is 73.0 KB gzipped (budget about 180).
- `npm test`: 107 of 107 pass.
- `npm run shots`, the whole suite: 371 screenshots, 0 axe violations, 0 console errors or warnings, and 160 of 161 behaviour checks, across both viewports and the normal, reduced-motion and no-WebGL passes. The one failure was the harness's: it read Plate VI's answer 4 seconds after the end mark, while the answer was still printing (opacity 0.84) on a busy software renderer. It now waits for the answer to be printed; Plate VI re-shot on every pass, 16 of 16.
- After the three fixes below, Plate I and the indicator were re-shot on every pass: 0 axe violations, 0 console problems, and 15 of 15 checks, including the new one for the machine's lines.
- A run before that one lost its page halfway (“`__atlas` is undefined” at Plate III): the filmstrip had written its contact sheets into `/shots` and the dev server reloaded the page it was photographing. The dev server now ignores `/shots`.

### Screenshot critique

**What works**
1. **The filmstrip reads as a book.** Twenty-seven screens on a desktop, 23 on a phone; each plate's field is brushed, develops and is left behind, and nothing but paper sits between one plate and the next. After the tuning no two frames in a row are the same picture, except where a plate is meant to rest.
2. **Plate I's machine view is literally what the machine receives,** and it lines up with the sentence it replaces: “The” is 84 104 101, every space is 32, and the question mark is 63.
3. **The plate indicator is a quiet running head:** one slip, one line, the same italic as the captions, and gone over the list, the colophon and the index.

**What looked off (fixed, then re-shot)**
1. **Plate I's numbers piled up.** A number at the end of each line was printed in the middle of the line, over the others. The letter before a line break had been given an empty second box at the start of the next line, and its number was centred across both. *Fixed:* each letter and each word is now an inline block, so none can split across lines. The spaces stay real spaces, and each space's number is printed by the word before it. The numbers' size is now a token (`--codes-scale`) rather than a figure in the stylesheet.
2. **On a phone, the machine's view broke into more lines than the slip** (five against three), so the numbers were not over their letters. The machine layer kept the desktop padding when the field's narrowed. *Fixed:* both read the same two custom properties. A new check measures it: at ten widths from 320 to 1920 pixels the numbers break into the slip's own lines, and at least 4.5px separates any two numbers on a tier.
3. **On a phone, the indicator covered what it labelled.** At 390 pixels the slip took a third of the width at the foot of the screen. It sat over each plate's heading as it came up and over the machine's-view toggles while plates were pinned. *Fixed, restrained:* it is not shown below 768 pixels. There, each plate's heading and its figure's number (“Fig. 3.”) say where the reader is.

### Known issues and watch list
- **On a desktop, the indicator passes over the left column's text** for a moment as it scrolls by (paper over paper). It never covers a pinned plate's text, which sits higher.
- **The phone has no plate indicator.** If a running head is wanted there, it needs its own place (a thumb index in the margin, say), not the desktop's slip.
- **Real GPU cost is still unmeasured** on real hardware (see earlier phases).
- **Resolved:** the harness's `goTo` settling (Phase 5 and 6).

## Phase 6: Plates V and VI, the colophon and the index (28 September 2026)

### Done
- **The answer's scores and the softmax** (`src/data/specimen.ts`, `src/lib/softmax.ts`): the brief's seven candidates for each variant; a real softmax with the largest score subtracted first, the favourite alone at T ≤ 0.05, sampling by the cumulative likelihoods, and percentages to one place. At T = 1 trophy comes out at 92.5%; in the variant, suit at 91.7%.
- **Tests (13 new, 106 in all):** the softmax sums to 1 at every temperature; trophy at 92.5%; one-hot at 0.05 and below; warmer is more adventurous; finite with huge scores; suit the favourite in the variant; sampling by cumulative likelihood and always the favourite when cold. The page: the likelihoods written for readers without JavaScript match the softmax at T = 1; the scores and the reply's IDs in the machine's tables match the data; every candidate is a piece the chart knows.
- **Plate V, The weighing** (`plate5-weighing.ts`, `weighing/dial.ts`), a 6.5 KB gzipped chunk, pinned for 150vh (90vh on a phone):
  - “The” is set into the reply's first slot, with a blank slot beside it. The ruled card's rows are set one by one; each bar exposes to its likelihood, taking time in proportion to its length, and its number feeds out on a ticker hanging off the card's edge.
  - The temperature is a real range input (0 to 2 in steps of 0.05, “cool” and “hot” on the dial, its value written beside it and announced with a word). The drawn dial mirrors it and can be turned by hand, carried a little way by inertia and snapped to a step. The bars re-weigh from the live softmax, the tickers re-set, the needle follows.
  - “Draw a piece”: the lever is pulled and returns, the piece drawn from the likelihoods as they stand is pinned on a slip (“Drawn: trophy”), one tally stroke is drawn in its row (the last ten draws; the oldest goes), and a polite live region says, for example, “Drawn: trophy. In the last 10 draws: trophy 9, suit 1.”
  - Under the loupe, the raw scores, with “Under the loupe, the scores before weighing.”
  - In the variant the rows re-set with suit first, and the variant note appears.
- **Plate VI, The composing stick** (`plate6-composing.ts`, `composing/stick.ts`), a 3.7 KB gzipped chunk, pinned for 250vh (150vh on a phone):
  - The stick in elevation, in paper line; above it, the specimen as a miniature row of slips.
  - One loop per chosen piece: its sort drops into the stick (pressed, with the 1px recoil); a loop arrow draws back to the end of the row; a new slip joins the row; the reading's threads run over it once, quickly.
  - After “The”, “trophy” and the full stop, the fleuron end mark drops in and no loop follows. The variant takes one more loop (The, suit, case, full stop).
  - Once the end mark is set, the plate tones in time (3.2s): the field's bath turns the blue umber from the centre out, paper turns cream in step, and the answer is printed large in cream, “The trophy.” or “The suitcase.”. Scrolling back above the end mark un-tones it in 0.8s.
  - Under the loupe, each sort's piece and its number; the same, end mark included, as a table after the figure.
- **The index** now carries the reader to a plate as the list of plates does, focusing its heading and leaving `#small` in the address.
- **Shots:** checkpoints for both plates (approach, weighing, rest, cool and hot, twelve draws, the dial by hand, the loupe, the variant, the machine's view; the loops, the end, the toning, un-toning, the variant's extra loop) and the index, each with a behaviour check.

### Verification (run at the end of this phase)
- `npm run build`: zero TypeScript errors. The first-screen JS is 72.6 KB gzipped (budget about 180); Plate V is 6.5 KB and Plate VI 3.7 KB gzipped.
- `npm test`: 106 of 106 pass.
- `npm run shots`: 356 screenshots, 0 axe violations, 0 console errors or warnings, and 152 of 152 behaviour checks, across both viewports and the normal, reduced-motion and no-WebGL passes. One change followed (the still Plate VI no longer shows the readings' sweeps); Plate VI was re-shot under reduced motion on both viewports, clean.

### Decisions and why
- **The dial is turned by pointer events, with InertiaPlugin for the throw, not by Draggable.** I measured it: inside ScrollTrigger's pin (position: fixed), Draggable's rotation mode takes its origin in viewport coordinates and the pointer in page coordinates, so a 60° turn registered as −0.12°; released from the pin, the same turn read 60°. The dial now measures the turn against its own centre on screen; InertiaPlugin still carries it a little way and snaps it to a step.
- **The real control is the range input,** visually hidden but focused like any slider, its focus ring drawn round the dial; its value is written beside the dial and announced with a word (“1.00, neutral”).
- **The likelihoods are real table cells in the page,** tested against the softmax, so the plate reads without JavaScript; with it, they become tickers.
- **Toning is in time; the story is in scroll.** The bath begins when the end mark is set and takes its 3.2 seconds; scrolling back above the end mark un-tones it in 0.8s.
- **Paper becomes cream and ink stays ink.** The sorts' faces and the fleuron keep their colour in the bath; the stick, the slips, the arrows and the threads tone with the field, from the centre out.
- **The index travels** like the list of plates rather than following its anchors, so `#small` survives it.
- **The Plate VI checkpoint before the end mark** is taken just before the note and caption begin to develop; axe caught them half-developed at the moment of the end mark. Nothing is exempted from axe.

### Screenshot critique

**What works**
1. **Plate V reads like an instrument panel on a specimen table:** a ruled card, exposed bars, tickers off its edge, a sensitised dial and lever, and a hand tally that makes the randomness visible.
2. **The temperature does what the note says:** cool, trophy takes 100.0%; hot, it falls to 62.9% and suit, cup and prize rise.
3. **Plate VI ends the atlas as a print:** the reply set in metal, one loop arrow per reading, and the whole plate toned to umber and cream around “The trophy.”.

**What looked off (fixed, then re-shot)**
1. **Plate VI's sorts sat by the miniature row, not in the stick:** GSAP's `y` on an SVG group replaces the group's own `translate`. *Fixed:* an outer group holds each sort's place.
2. **The dial could not be turned while the plate was pinned** (above). *Fixed.* Its throw then carried it all the way to hot; *fixed* with resistance, so it carries a little.
3. **On a phone:** “Drawn: trophy” ran off the field, the bars had 42px to grow in, and the lever's drawing shrank to a sliver. *Fixed:* the lever and its slip stack beside the dial; the card's columns have set widths and the field's padding narrows; the lever keeps its size. On desktop, “hot” was crossed by the needle at full heat; *fixed:* “cool” and “hot” sit either side of the bottom of the face.

Also caught under reduced motion: the still Plate VI showed every reading's sweep at once. Fixed: it now shows what the sequence leaves behind.

### Known issues and watch list
- **The phone's likelihood bars are narrow** (about 88px for the whole range), so the smallest bars are ticks; the tickers carry the numbers.
- **The miniature row's threads are illustrative sweeps,** not the attention rows of the reply's pieces.
- **Real GPU cost is still unmeasured** on real hardware (see earlier phases).
- **The harness's `goTo` can land before a plate has settled** when a checkpoint runs alone (Phase 5); left for Phase 7.

## Phase 5: Plate IV, The threads of attention (28 September 2026)

### Done
- **Attention data** (`src/data/attention.ts`): three illustrative readers, twenty rows each, for both variants; the default view is their mean.
  - Reader one follows the story and is written out row by row. Reader two mostly looks at the piece before; reader three at “because” and the marks. Both are written out where the story needs them (it, the two bigs, the question mark) and otherwise follow their habit.
  - Every row is normalised; a row that looked ahead would throw.
  - The averaged story: at the first big, trophy 0.367 and it 0.183; in the variant, suit and case together 0.360, with it (0.183) the largest other piece; at it, nothing above 0.22; at the question mark, the answer 0.283.
- **Tests (13 new, 93 in all):** twenty by twenty; causal for every reader, variant and the mean; every row sums to 1; nothing below zero; the brief's story targets; the readers keep to their jobs; only the story rows differ between variants; the second big reaches back to trophy; and the table written into the page matches the data.
- **Shared state and the address** (`src/state.ts`): the variant is kept as `#small` with `replaceState` (the page never jumps), and editing the address changes it.
- **Plate IV** (`plate4-threads.ts`, `threads/*`), its own 6.8 KB gzipped chunk, pinned for 300vh (180vh on a phone):
  - The twenty pieces lie on a shallow smile. Pieces not yet read are lettered faintly in prussian-wash; a needle moves along the row, and each piece it reaches is laid as a white slip.
  - At each piece, threads draw back to the earlier pieces it weighs, at pen speed, so long threads take longer. Width follows the weight (0.5 + 1.5√w px), a second ply from 0.3, stray fibres for cotton. The previous piece's threads fall to a ghost, then go.
  - The notes replace one another at it, at the first big, and at step 18. The first big ties it to trophy with the heaviest thread yet; the reading ends on the question mark reaching back to the answer.
  - Fig. 4b, in the field's corner: Plate III's stars, through the same camera maths. A faint ring where the first it stays; a mark that leaves at the first big and settles close to trophy by the question mark.
  - “Change big to small”: the words are re-set, the old threads fall to a ghost, the new ones swing to suit and case, Fig. 4b's mark moves, the label, note 2, Fig. 4b's caption and the machine's table change, `#small` goes into the address, and a polite live region says “Now the suitcase is too small. The threads lead to suitcase.” (and back: “Now the trophy is too big. The threads lead to trophy.”).
  - Readers: a radio group of italic words (All readers, Reader one, Reader two, Reader three); choosing one fades the threads and draws that reader's with a quick pen.
  - The loupe writes each thread's weight on it, and the piece's weight on itself beneath it. “Show the machine's view” shows the whole of it; a real table after the figure gives, for each piece, where it looks hardest.
  - On a phone the row stands on end, pieces top to bottom, threads bowing out to the right from one line beside the widest slip; Fig. 4b sits in the top corner; the switch and readers follow the figure.
  - Reduced motion: the whole reading at its end, all three notes, and the switch and readers answer with crossfades.
- **Shots:** Plate IV checkpoints for approach, reading, it, big, the end, the switch and back, reader two, the loupe, the machine's view, and `#small` typed in and on arrival, each with a behaviour check. A new check on every pass: nothing makes the page wider than the screen.
- **Fixed along the way, on every plate:**
  - **Figures and their captions.** Each figcaption sat inside a `div` within its `figure`, so it did not caption the figure. The pinned wrapper is now the `figure` itself (Plates I–IV).
  - **Pages were wider than a phone.** The visually hidden tables of the machine's view (since Plate II) kept their full table width, as tables ignore a 1px width, and the fields' brushed bleed was clipped on `body`, whose overflow passes to the viewport. A phone saw an 866px page and zoomed out to fit it. The tables are now wrapped in a visually hidden `div`, and the page's sections clip the bleed. The new check confirms 390px on a phone and 1440px on desktop, in every pass.

### Verification (run at the end of this phase)
- `npm run build`: zero TypeScript errors. The first-screen JS is 71.2 KB gzipped (budget about 180); Plate IV is a 6.8 KB gzipped chunk.
- `npm test`: 93 of 93 pass.
- `npm run shots`: 275 screenshots, 0 axe violations, 0 console errors or warnings, and 101 of 101 behaviour checks across both viewports and the normal, reduced-motion and no-WebGL passes. Plate IV's machine's-view labels were then moved (see the critique), and Plate IV was re-shot in all six passes on its own, clean.

### Decisions and why
- **The attention rows are written out, with the readers' habits as rules where the story doesn't reach.** Reader one is the story and is written out in full; readers two and three are written out at it, the two bigs and the question mark, where the averaged story is decided, and elsewhere follow their stated habits. The tests pin the brief's targets on the average the reader sees.
- **The reading is one number** (0 to 20) tweened step by step, each step given its share of the pin (more at it and at the first big). Every frame is drawn from that number, so the switch and the readers need no rebuilt timeline: the threads on show are copied to a ghost layer, and the new ones draw in time.
- **The switch and readers sit beside the title, not in the field.** On a phone only the field and its notes pin, and the controls must be reachable on a still page in every layout; on a wide screen they stay in view through the whole pin.
- **The notes sit under the field,** as Plate III's stop captions do, for the same reason.
- **Unread pieces are drawn, not set as text:** faint SVG lettering, a picture of the sentence not yet read. The pieces themselves are the slips, in the page from the start; the machine's table gives the whole reading.
- **On a phone, threads meet the pieces along one line** just right of the widest slip, so no thread crosses a slip.
- **Note 2 and Fig. 4b follow the variant** (“When small arrives, it looks back and ties it to suitcase.”; “…sits close to suitcase.”). The brief gives only the big wording; a note that said trophy while the threads led to suitcase would contradict the figure.
- **The machine's table names pieces by their letters** (a to t, as on Plate II), so the repeated ’s, too and big stay distinct.
- **The switch has no `aria-pressed`:** its label already says what it will do, and a pressed state would contradict it.

### Screenshot critique

**What works**
1. **The clue arriving is visible from across the room:** at the first big, one heavy doubled thread arcs back over the whole row to trophy while the rest stay hairlines; the unread words wait, faint, to its right.
2. **The switch reads as a re-exposure:** the old threads stay as a ghost, the new ones land on suit and case, and Fig. 4b's mark crosses to sit between them.
3. **The phone's upright row** keeps the same grammar in a narrow space: threads bow out to the right from one line, and the reading still ends on the question mark reaching back to trophy.

**What looked off (fixed, then re-shot)**
1. **On a phone the switch and readers sat in the desktop grid,** half off the screen. *Fixed:* the full-width layout is scoped to wide screens.
2. **On a phone the pinned figure was taller than the screen,** so the first pieces were cut off. *Fixed:* only the field and its notes pin; the captions follow.
3. **Threads on the upright row crossed the wider slips above,** and the machine's weights piled on each other where short threads meet. *Fixed:* threads meet the row along one line, and each weight is written near the piece its thread reaches, stepping aside when it would touch another.

Also caught: after a switch the ghost vanished at once (the relayout reset the step), and the needle was too thin to read. Both fixed.

### Known issues and watch list
- **A checkpoint run on its own can catch Plate IV early** (a jump made before the page has settled lands on an earlier step). In the full run and a plate's own sequence the pictures are right; the harness's `goTo` may want a settle step in Phase 7.
- **Fig. 4b is small on a phone** (150 × 112px): four labels at 18px just fit.
- **Readers two and three are rules outside the story rows,** so their other rows are tidier than a real head's would be; the reader note says as much.
- **Real GPU cost is still unmeasured** on real hardware (see Phases 2 and 4).

## Phase 4: Plate III, A chart of meaning (27 September 2026)

### Done
- **The chart laid out** (`src/data/chart.ts`): 523 stars in 15 constellations, each with a place in three dimensions and a magnitude of 1 to 6.
  - The story's words are placed by hand: trophy among medal, cup and prize; case among box, bag and trunk; suit among the clothes; big beside small, hot beside cold, up beside down; it and the small words in The Crowded Centre.
  - The rest are scattered about their constellation from a fixed seed, kept apart from one another, so the chart is the same on every visit.
  - Magnitude follows use: the fifteen commonest pieces are brightest, then the rest of the small words and the tokeniser's common words, then fainter by length.
  - Each constellation's figure joins its nine brightest stars by the shortest lines (a spanning tree) plus one line that closes a shape: 9 lines each, never between constellations.
  - The camera: an overview fitted at run time to the field's shape, and five stops framed from each constellation's extent.
  - “What” now has its own star beside “what”, as “The” has beside “the”: they are different pieces with different IDs.
- **Shared projection** (`src/lib/projection.ts`): the camera worked out by hand (projection, orbit, a Catmull-Rom path that stands back between stops). three.js, the SVG chart and all the lettering project through it, so every drawing puts a star on the same pixel. Fig. 4b will use it in Phase 5.
- **The three.js chart** (`src/plates/chart/scene.ts`), loaded only when the reader is a screen away (a separate 133 KB gzipped chunk):
  - Engraved symbols drawn in the fragment shader with hard, antialiased edges in paper-white: dot, ring and eight rays for the brightest; dot and four rays; dot alone for the faintest. Normal blending, no depth test, no glow.
  - Lines as laid threads (a slight seeded wobble), drawn by a pen: each vertex carries the time the pen reaches it, so lines grow smoothly at constant speed.
  - A faint graticule on the far half of a sphere, as an old celestial atlas rules its sky.
  - Renders only when something changes, and not at all when the plate is off screen.
- **The SVG chart** (`svg-chart.ts`): the same symbols, lines and graticule projected through the same camera. Used with `?nogl`, a CSS-only background, a refused WebGL context, or when three.js hasn't arrived by the time the pin is 5% through.
- **Lettering** (`overlay.ts`): the constellation names, each a real button, lettered in italic along a gentle arc sized to the name; the words each stop's caption names, set beside their stars; the rings round the reader's pieces with “yours”; The Uncharted at the rim; a ruled double border with degree ticks. Every word finds the first free place beside its star, clear of names, rings and star symbols.
- **The sequence** (`plate3-chart.ts`), pinned for 350vh (210vh on a phone):
  - The twenty pieces lie in Plate II's loose rows, pinned. Each pin comes out; the piece lifts, squares up, and travels to its star (x on `hand`, y on `develop`, so the path curves), shrinking; over the last 30% it fades as its star comes up in the same place. Repeated pieces converge on one star; The and the go to neighbouring stars.
  - The other stars come up unevenly, the threads are drawn, and the names are lettered one by one.
  - The reader's words are ringed and labelled “yours”; words the chart doesn't know are set at The Uncharted, and the note appears in the text column.
  - The camera visits The Laurel, The Chest, The Wardrobe, The Rule and The Crowded Centre. At each, its caption replaces the last and the words it names are labelled.
  - At rest: a gentle drag turns the chart (fine pointers only, ±12° by ±6°, damped); every name flies the camera there (from mid-sequence, the page first scrolls to the rest); names of constellations off the field point the way from the border.
  - Reduced motion: the chart is shown whole and still, all five captions read in turn, and a name jumps the view with a crossfade under 150ms.
- **The loupe on Plate III**: the star under the lens written as the machine would write it (its word, three coordinates, “and thousands more”), in type sized for the lens. “Show the machine's view” lays a table of the specimen's stars and their coordinates on the tissue; the same table, as real HTML, follows the figure for screen readers.
- **“List the stars”** after the plate: every constellation and its words, The Uncharted, and the reader's own pieces once they have a sentence. Without JavaScript, the list stands in for the chart.
- **Tests:** 80 (from 59). The chart: every word a star; magnitudes; constellations stay together; big–small, hot–cold and up–down close; trophy and case among their neighbours; no two stars on top of each other; every specimen and reply piece has a star; The and the separate; 5–12 lines each and none between constellations; the stops in order; the overview sees every star, clear of the strip at the foot. The page: the list of the stars, the coordinates table and the stop captions match the data. The projection: centre, orientation, scale, orbit, and the path through its stops.
- **Shots:** Plate III checkpoints for approach, hand-off, developing, lettered, the four stops, rest, the reader's words, a flight by name, the loupe, a drag, the machine's view and the list; behaviour checks for each (the drawing in use, the caption at rest, rings and The Uncharted, a flight arriving, the loupe's coordinates, a drag turning the chart, the list). A third argument now runs one plate's checkpoints on their own (`npm run shots -- index desktop-normal plate-3`).

### Verification (run at the end of this phase)
- `npm run build`: zero TypeScript errors. The first-screen JS is 69.7 KB gzipped (budget about 180). Plate III is a 12.9 KB gzipped chunk; three.js loads separately (132.6 KB gzipped) when the plate is a screen away.
- `npm test`: 80 of 80 pass.
- `npm run shots`: 221 screenshots, 0 axe violations, 0 console errors or warnings, 59 of 59 behaviour checks, across both viewports in normal, reduced-motion and no-WebGL passes. After the last fix (names' fallback places) and a new drag check, Plate III was re-shot in all six passes on its own: 0 axe violations, 0 console problems, and every check passed, including “a drag at rest turns the chart” in all three desktop passes.
- Checked by eye as well as by checks: three.js and SVG drawings put every star in the same place, and reduced motion shows the whole chart still, with all five captions.

### Decisions and why
- **The chart's places are worked out by seeded code, not pasted as literals.** The plan had a helper print about 520 positions for pasting into `vocab.ts`. Seeded placement gives the same chart on every visit, and the tests hold what the brief asks of it (pairs close, constellations together, no overlaps), so a hand edit can't quietly break it.
- **One projection for every drawing.** three.js, the SVG chart, the names, the rings, the hand-off targets and the loupe all go through `lib/projection.ts`, which matches three's camera. The hand-off lands each slip exactly on its star because both are placed by the same sum.
- **The SVG chart re-projects its stars rather than tweening a `viewBox`,** so its symbols keep their engraved size as the camera nears, as three.js's do.
- **The stop captions sit under the field, not in the text column.** On a phone only the figure pins, and the captions have to be read with the chart they describe. Under reduced motion, or without JavaScript, all five are read in turn.
- **At each stop the words its caption names are labelled.** Without them, “Trophy lives among medal, cup and prize” points at stars the reader can't tell apart.
- **The pieces arrive pinned but without tickers or letters.** Their numbers belong to Plate II; here each is about to be given a place instead, and the rows lie closer so they fit a phone's chart.
- **Names off the field point the way from the border** once the camera is at rest, a size smaller. Without them a reader at The Crowded Centre could not reach another constellation by name, and on touch, names are the only way round.
- **The loupe uses lens-sized type** (13px and 16px, read at 1.4×), so the word, three coordinates and “and thousands more” fit the lens together.
- **“What” has its own star,** for the same reason “The” does.
- **The field is 4:5 on a phone rather than square,** so The Uncharted can sit above the toggle and the chart keeps its height.
- **Coordinates are the chart's own three,** divided by its half-width and written to three places. Honest to the drawing, with “and thousands more” for the rest.
- **Intros now develop as they come into view, on every plate** (from the top of the text entering the screen until it reaches 60% of the way up), no longer as a share of the plate's approach. axe caught Plate III's intro at 4.5% opacity below the fold while the reader was at Plate II's bench: part of the fade was happening where no one could see it. Plates I and II had the same pattern, so they changed too.
- **three.js gets a 1.5s grace period** once the pin is 5% through, while the field goes on developing, before the SVG chart stands in. A reader who lands mid-plate (a reload, say) then still gets three.js on an ordinary connection.

### Screenshot critique

**What works**
1. **At the stops it reads as an engraved celestial atlas:** paper-white symbols sized by brightness, thin laid threads, a ruled border with degree ticks, italic names along curves, and the stop's words set beside their stars.
2. **The hand-off is one object changing state:** each slip unpins, lifts, travels on a curved path to its star, shrinks, and gives way to the star in the same place, and repeated pieces converge.
3. **The loupe tells the truth plainly:** under the lens, trophy is −0.483, 0.267, 0.067 and thousands more; shown in full, the specimen's stars are a table on the tissue.

**What looked off (fixed, then re-shot)**
1. **The stop captions named words the chart didn't mark.** *Fixed:* each stop labels its caption's words beside their stars.
2. **The Crowded Centre at rest was a blot,** with the reader's rings lost among the symbols' own rings and “yours” laid over stars. *Fixed:* a closer view of the centre, rings drawn outside the brightest symbol's rays, and every word placed where it clears names, rings and symbols.
3. **On a phone:**
   - desktop-sized symbols turned constellations into blots;
   - names crowded the overview;
   - the toggle covered The Uncharted;
   - stars were drawn in the margin past the border.

   *Fixed:* symbols scale with the field; a phone letters only the stops' names over the whole chart and points at most four ways; The Uncharted lies above the toggle; the drawing is clipped to the border.
4. **Names dropped out of the overview when they touched another,** including The Wardrobe, one of the five stops. *Fixed:* a name that finds its place taken tries a little to either side, then below its constellation, before giving way. All fifteen are lettered on desktop, in both motion modes.

Also caught by looking, not by any check: **the SVG fallback first came out black.** Its paths had no style, so SVG's default black fill took over. axe does not look inside SVG. *Fixed:* the SVG chart is styled in paper ink with the same opacities as three.js.

### Known issues and watch list
- **The star's word on hover is mostly read in the loupe.** On a fine pointer the lens is over the chart whenever the pointer is, so the word set beside a star is usually under it; the lens writes the same word, with its coordinates. The plain word shows whenever the lens is away (while dragging, for instance).
- **Names cross stars.** Over their own constellation, and at the border where there is no clear place, a name may print over the fainter stars, as on an engraved chart. The Crowded Centre at rest is dense by nature.
- **three.js on real hardware is unmeasured.** Every frame here was drawn by a software renderer. The chart redraws only when something changes and pauses off screen, but its cost on a mid-range laptop is still to be measured, with Plate II's.
- **A phone's overview letters only the stops' names that fit** (usually three to five); the others appear once the camera comes closer.
- **Fig. 4b will reuse `lib/projection.ts`** (Phase 5), so the inset agrees with this chart.

## Phase 3: Plate II, Dissection (26 September 2026)

### Done
- **The illustrative tokeniser** (`src/lib/tokeniser.ts`): deterministic, dependency-free, following the brief’s rules in order.
  - Punctuation becomes its own piece, and a leading space belongs to the next piece.
  - Contractions split (`'t 's 're 've 'll 'd 'm`); any other apostrophe is punctuation.
  - Words on the chart or among about three hundred common words stay whole.
  - Otherwise a word splits at known prefixes and suffixes, then into two known parts (suit + case, rain + coat), then into chunks of 3–5 letters if it is still longer than seven.
  - At most forty pieces, with the true total reported.
  - Curly apostrophes read as straight ones.
- **Tokeniser tests (24):** both specimens cut exactly as BRIEF §3 says, both replies too, every rule, the cap, and determinism.
- **Data:**
  - `vocab.ts`: the chart’s 15 constellations of words (Phase 4 adds positions and lines). It holds every piece of both specimens and both replies, has no “suitcase”, and each word appears once.
  - `common-words.ts`: about 300 common words.
  - `specimen.ts`: the sentences, pieces, letters and replies.
- **Data tests:**
  - 20 pieces, differing only at 14 and 19;
  - unique IDs in range;
  - constellation sizes and totals;
  - required words in their constellations;
  - no banned words on the chart;
  - the IDs written into `index.html` for readers without JavaScript equal the hash.
- **`src/state.ts`:** the variant (read from `#small`), the reader’s sentence and its pieces, with subscribe and notify.
- **Plate II** (`plate2-dissection.ts`, `dissect.ts`), its own 9 KB chunk:
  - The specimen lies on two strips. Dashed cut lines draw at pen speed, before each space and at each strip’s end.
  - The slip is cut: the pieces part, and the offcuts fall away.
  - The pieces separate into hand-laid loose rows, each turned up to ±0.8°.
  - Each piece is pinned, lettered a to t with a drawn leader, and its ID feeds out beneath it on ticker tape.
  - Notes and caption arrive with the beats. Wide screens pin the plate for 250vh; phones pin the figure for 150vh. Reduced motion shows it laid out. The layout rebuilds when the width changes.
- **The loupe on Plate II** shows each piece with its ␣ drawn in, and its number. The loupe hint sits in the margin and fades once the loupe has been used. “Show the machine’s view” works here, and a real table of letters, pieces and IDs follows the figure.
- **“Lay down a sentence of your own”** (`reader-sentence.ts`): a slip of sensitised paper on its own field below the plate.
  - “Expose” checks the sentence, giving the brief’s two errors plus “Keep it under forty pieces.”.
  - The slip washes from sensitiser to paper and is cut, parted, laid, pinned and numbered by the same code as the specimen, in time.
  - Then it says “Exposed. Your pieces will appear on the next plate.” and stores the pieces for Plate III.
  - “Clear” resets it and says “Cleared.”. Errors set `aria-invalid`; the status is a live region; focus moves sensibly.
  - The reader’s words only ever enter the page as text.
- **Shots:**
  - Plate II checkpoints: approach, cutting, parted, separating, fixing, rest, loupe, machine view.
  - Behaviour checks: one word is refused with the brief’s message; a sentence is exposed, cut and handed on; Clear resets everything.
  - Each checkpoint is now timed, and a pass can be run on its own (`npm run shots -- index phone-normal`).

### Verification (run at the end of this phase)
- `npm run build`: zero TypeScript errors. The first-screen JS is 69.3 KB gzipped; Plate II is a separate 9.2 KB chunk, with the tokeniser and word lists.
- `npm test`: 59 of 59 pass.
- `npm run shots`: 164 screenshots, 0 axe violations, 0 console errors or warnings, and 32 of 32 behaviour checks passed:
  - the frontispiece skip, on desktop and phone;
  - list travel and replay, in every pass;
  - the reader’s error, expose and clear, in every pass.
- **The frontispiece skip check was rewritten to be deterministic.** In the software renderer the first frames take seconds, and the timeline (lag smoothing off, as Lenis needs) catches up in one jump, so timing the sequence from outside was unreliable. A mutation observer now catches the sequence the instant it starts, before any frame: it reads the progress (0), dispatches a key press, and reads it again (1).

### Decisions and why
- **Separation computes the FLIP by hand instead of using the Flip plugin.** Both layouts are known in advance, and Flip measures live DOM states, which fits badly with a scrubbed timeline that is rebuilt on every width change. The motion is the same: each piece sits at its final place and is carried there from its place on the strip by transforms.
- **The pieces are cut tight around their words.** A piece that carries a leading space shows it as paper to its left, so once separated, the spaces are visible exactly where the note says they are.
- **Strips only break between words** (suit and case stay together), and the strips and rows are centred on the field. The rows stray from a grid by hand: row indents, uneven gaps, small rises.
- **The reader’s bench is its own small field below the pinned plate.** Its pieces make it grow, and a pinned frame must not change height mid-pin.
- **A third error message,** “Keep it under forty pieces.”, because 120 characters can make more than the tokeniser’s cap of forty.
- **“The” and “the” are separate words on the chart,** since they are separate pieces with separate IDs.

### Screenshot critique

**What works**
1. **At rest, Plate II is an anatomical plate:** twenty lettered specimens with pins and ticker tape, and the spaces visible as paper on the pieces that carry them.
2. **The cutting reads as a real blade:** dashed lines just before each space and at the strips’ trimmed ends, and repeated pieces share numbers (both “’s”, both “too”, both “big”), as they do in a real tokeniser.
3. **The reader’s own sentence goes through the same machine:** “The unbreakable raincoat doesn’t fit in my rucksack.” comes out as The / un / break / able / rain / coat / doesn / ’t / fit / in / my / ruck / sack / . with the same numbers the specimen uses where they coincide.

**What looked off (fixed, then re-shot)**
1. **The strips sat in the field’s top-left corner** during cutting, over an empty expanse. *Fixed:* strips and rows are centred on the field.
2. **The rows sat on too even a grid,** like a tag list. *Fixed:* hand-laid irregularity.
3. **On phones:**
   - Even-numbered plates kept their desktop seven-column figure. That was a specificity bug in the Phase 2 one-column CSS, invisible until now because Plate I is odd.
   - The pinned field was taller than the screen, which hid the toggle, and a ticker lay over it.
   - A strip broke inside “suitcase”.

   *Fixed:* the CSS rule; tighter phone spacing tokens; and word-aware strip breaks.

### Known issues and watch list
- **Letters on the reader’s pieces:** there are none. Only the specimen is lettered a to t; the brief asks the reader’s pieces for the same cut, pin and ticker.
- **The replay checkpoint pictures the frontispiece only after it has finished.** In the software renderer a moving frame of that large field takes a minute to capture.
- **Real GPU cost is still unmeasured on real hardware** (see Phase 2).

## Phase 2 review fixes (25 September 2026)

You reported two problems: the page showed bare HTML for a few seconds on opening, and the scrolling could be smoother.

- **Bare HTML for a few seconds.** In development, Vite injects CSS from JavaScript, so nothing was styled until every module had loaded. On a first visit Vite also discovers and pre-bundles dependencies, and may reload the page.
  - *Fixed:* the styles are one stylesheet (`src/styles/index.css`) linked in each page’s head, so they block the first paint in development as they always did in the build.
  - Vite now pre-bundles every dependency up front (`optimizeDeps.include`) and transforms the entry files when the server starts (`server.warmup`).
  - *Checked:* with every script blocked, the dev page still renders fully styled (Old Standard, paper colour, grid).
- **Smoother scrolling:**
  - Lenis lerp softened from 0.1 to 0.08 (just below the brief’s 0.09–0.1, at your request), and Lenis’s recommended CSS added.
  - The paper is baked once into a seamless tile and laid as the page background, instead of being redrawn every scroll frame.
  - Fields redraw only when their state actually advances (`advanceField`), as a draft while moving and a sharp pass once still.
  - Gradient noise no longer uses trigonometry.
  - *Measured* (software renderer, twice the pixel density, scrolling the first half of the page one step per frame): average frame 1,042ms before, 62ms after; 95th percentile 1,803ms before, 364ms after. The remaining heavy frames are Plate I’s field while it is actually being scrubbed.
- Verification after the fixes: build clean, 24 of 24 tests pass, and `npm run shots` ran with 0 axe violations, 0 console errors or warnings and every behaviour check passing. I looked at fresh screenshots of the baked paper: no seams and no visible repeat.

## Phase 2: frontispiece, list of plates, Plate I (25 September 2026)

### Done
- **Frontispiece: the one untriggered moment** (`src/plates/frontispiece.ts`), about 2.9s from fonts ready (or a 1.5s timeout):
  - Four broad strokes are brushed on, each with its own start and length. The shader now takes a per-stroke progress (`uStrokeT`) for hand-timed brushing.
  - The field develops, the centre a little ahead.
  - The title and subtitle, lying under the sensitiser, hold its yellow-green (a sensitiser-coloured copy, `aria-hidden`, split identically underneath), then wash white letter by letter, centre out.
  - The emblem, a single blank slip, has its pin pressed in (`press`, with the 1px recoil). The imprint and hint print in ink below.
  - Any wheel, touch, click, key or real scroll skips to the end state at once.
  - Reduced motion shows the page developed.
  - “Expose the atlas again” glides to the top and prints it anew with the next seed, so the brushing is never the same twice. Under reduced motion it just returns to the top.
- **List of plates** (`list-of-plates.ts`):
  - Hand-set SVG leader dots, a hair off the grid, ending flush with the numeral column. On hover or focus the ink dots darken left to right in a quick jittered stagger (8ms steps, 120ms each).
  - Each entry glides to its plate (Lenis, 1.2–1.6s by distance, `develop`), leaves the URL hash alone (it will hold `#small`), and hands the heading focus.
- **Plate I** (`plate1-specimen.ts`, loaded as its own 1.3 KB chunk):
  - The riddle is set large on a slip, pinned at both ends. The pins sit in the slip’s top margin, ink on the slip, with white shafts on the blue.
  - Wide screens pin the whole plate for 150vh. On approach the field is brushed, the intro develops, the slip is laid (a small fall and turn, `settle`) and the two pins are pressed in. Pinned, the field exposes over 60vh, the note and caption develop, then about 85vh of rest.
  - One-column layouts pin the figure alone (90vh on phones) and print the text as it stands, in the brief’s order (title, intro, figure, caption, notes).
  - Brush and exposure latch: they never run backwards.
  - Reduced motion: developed, no pin.
- **Infrastructure:**
  - `registry.ts` loads plate modules in page order once the frontispiece has printed (idle time), or as soon as the reader heads down the page.
  - `media.ts` holds the layout conditions. `scroll.ts` adds `scrubFor()` (instant under `?shots`), `scrollToY()` and `jumpToY()`, and the paper grain now holds still under a pinned plate.
  - Every timing for the three pages is in `eases.ts` (`FRONT`, `LIST`, `PLATE1`), and `eases.test.ts` holds them to the brief:
    - about 3s for the frontispiece, 3–4 unequal strokes;
    - an exposure of 1.2–2.6s, or 40–60vh when scrubbed;
    - hover responses within 120–220ms;
    - travel of 1.2–1.6s;
    - every beat inside its range, with a rest at the end of the pin.
  - `__atlas.goTo(target, progress)` now steps the frontispiece sequence and a plate’s approach (negative values) or pin.
- **Shots gained behaviour checks.** In the software renderer a screenshot takes several seconds, longer than the frontispiece sequence, so time-based behaviour is asserted directly rather than pictured:
  - the sequence plays by itself, and a key press finishes it at once;
  - a list entry carries the reader to Plate I with its heading in view and focused;
  - “Expose the atlas again” returns to the top and reprints (and only jumps to the top under reduced motion).

  The sequence’s frames are pictured by seeking it to exact points (0, 18%, 52%, 68%, 100%).

### Verification (run at the end of this phase)
- `npm run build`: zero TypeScript errors. The initial JS is 67.9 KB gzipped (SplitText joined the first screen), against 180 KB.
- `npm test`: 24 of 24 pass.
- `npm run shots`: 119 screenshots, 0 axe violations, 0 console errors or warnings, and 14 of 14 behaviour checks passed:
  - skip, on desktop and phone;
  - list travel and focus, in every pass;
  - replay, in every pass.

### Decisions and why
- **Each plate owns its pin** (a change from the plan’s central pin skeleton). A pin and the timelines built on it must be created and reverted together when the layout changes; with separate owners the order can go wrong. All plate code loads right after the frontispiece, so every pin exists before a reader can reach it, and the list waits for them before measuring.
- **Development is a gradual change of the whole sheet** (yellow-green through grey-green to blue, the centre a little ahead, fine grain). Anything narrower read as a stain spreading from one point, first lacy like mould, then as camouflage blotches on the phone.
- **Intro, note and caption develop as whole paragraphs,** not line by line. Scrubbed line splits would have to be rebuilt on every resize. This is the restrained choice.
- **Accessible text for the split title:** the split letters are `aria-hidden`, and a visually hidden copy of each line is read instead. SplitText’s own `aria-label` isn’t allowed on the subtitle’s `<p>`, and axe caught it. The title’s “of a Thought” is held together by a `nowrap` span; the no-break spaces stopped working once the words became inline blocks.
- **The sensitised title copy is sensitiser-coloured for about a second of the load sequence.** That is the physical process (letters under the coat keep its colour until washed), and it is gone at rest, so the rule that only changeable things are sensitiser-coloured holds for everything a reader can see and use.
- **List entries have no underline.** This is a contents page, and the leaders are the affordance. It is a deliberate exception to “links are ink with a fine underline”; the colophon and index links keep theirs.
- **A CSS safety net:** if the script never runs, the imprint and hint appear, and field text turns to ink, after five seconds. The sequence stands the net down as soon as it starts.

### Screenshot critique

**What works**
1. **The frontispiece as a printed title page.** Stepped through at 18% (two broad strokes on bare paper), 52% (the sheet greying, the letters held in sensitiser) and 68% (the field blue, the letters about to wash white), it reads as a print being made, and the finished page has the emblem pinned and the imprint set.
2. **Plate I at rest is a finished atlas plate:** the specimen as a white silhouette, pin shafts leaving white shadows on the blue, the caption beneath. As the plate rises, the field is brushed and the slip laid. On the phone the brief’s one-column order holds, and the pins sit clear of the words.
3. **The behaviour is verified, not assumed:** skipping, gliding to a plate and handing focus, and reprinting, at both sizes, with and without reduced motion, and without WebGL.

**What looked generic or off (all fixed, then re-shot)**
1. **Development as a stain.** The blue spread from the centre as a lacy mould-like blot, then (softened) as a blurred smudge, and on the phone as camouflage. *Fixed:* a wide, gradual change across the sheet with a gentle centre lead and fine grain.
2. **The title broke as “Anatomy of / a Thought” after splitting, and the subtitle carried a prohibited `aria-label`** (an axe violation on every state). *Fixed:* a `nowrap` span, the copy cloned with its markup, and a hidden spoken line.
3. **Unfinished details:**
   - On the phone the right-hand pin sat on the word “in”. *Fixed:* pins moved into the slip’s margin, and the slip gets more top padding.
   - Pale sensitiser letters showed on bare paper before the brush reached them. *Fixed:* the copy appears only once the strokes have crossed it.
   - Short numerals left a 50px gap after their leaders. *Fixed:* a narrower numeral column.
   - The paper’s cloudiness was a shade strong on plain pages. *Fixed:* softened.

### Known issues and watch list
- **Real GPU cost is still unmeasured.** In the software renderer one screenshot takes about seven seconds, so frame rate can’t be judged there. On your machine, use `?debug` and watch how the frontispiece and Plate I scroll.
- **The frontispiece field redraws every frame for about 2s** during the load sequence, and Plate I’s field redraws while it is scrubbed. That is by design, but it is the heaviest moment for a weak GPU.
- **Dev only:** before the scripts run, the imprint and hint flash visible for a moment, because Vite injects CSS from JavaScript in development. The production build links the CSS in the head, so the flash doesn’t happen there.
- **Plates II–VI are still text only.** The list glides to their headings.

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
