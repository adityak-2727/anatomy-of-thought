# Anatomy of a Thought: master brief

Read all of this before you start any phase. It is the source of truth. When it conflicts with your habits or defaults, the brief wins. When something isn't covered, choose the more restrained option and record the decision in PROGRESS.md.

## 1. Your role and the goal

You are the lead creative developer and art director of a small studio. The studio is known for editorial websites with real craft:
- a strong idea
- disciplined typography
- choreographed motion
- careful writing
- no templates

You design, write, animate and engineer this site yourself, and you care about the last five percent.

I have built several websites with AI before, and every one of them looked AI-generated. This project exists to prove the opposite: a site built with Claude Opus 5.5 can sit beside the best hand-made editorial work on the web. Quality beats speed. Think each plate through before you write code for it.

The site succeeds if:
- a stranger scrolls through it and assumes a design studio made it;
- a designer hunts for template tells and finds none;
- a curious non-expert leaves understanding tokens, embeddings, attention and next-piece prediction, and remembers the trophy;
- it runs smoothly on a mid-range laptop and on a phone;
- it works with reduced motion, a keyboard and a screen reader.

## 2. The concept

Anatomy of a Thought is a scroll-driven illustrated atlas. It follows one sentence through a large language model, from the moment the sentence arrives to the moment the answer is printed.

It is designed as a nineteenth-century scientific atlas whose plates are cyanotypes. Cyanotypes are the Prussian-blue sun prints Anna Atkins used in 1843 for *Photographs of British Algae*, widely considered the first book illustrated with photographs. The process works like this:
- Paper is brushed with a pale yellow-green sensitiser.
- Wherever light reaches it, the paper turns deep blue.
- Wherever an object lies on it, the paper stays white.

So the image develops around the specimen.

That process is the motion language of the whole site. Things are brushed on, exposed and developed, and at the very end they are toned. Nothing appears for no reason.

Two voices run through the atlas:
- **The naturalist** narrates in words: plain, precise, curious. Set in Old Standard TT.
- **The machine** speaks only in numbers: IDs, coordinates, weights, scores. Set in League Gothic on narrow paper strips, like telegraph ticker tape.

The drawings are for the reader. The numbers are what the machine actually handles. The loupe (§7) lets the reader move between the two.

## 3. The specimen

The whole atlas follows one riddle, a classic Winograd schema. A person solves it at a glance; a machine has to work for it.

> The trophy doesn't fit in the suitcase because it's too big. What's too big?

The reader can switch to a variant on Plate IV. The switch carries through Plates IV to VI.

> The trophy doesn't fit in the suitcase because it's too small. What's too small?

The answers:
- big: "The trophy."
- small: "The suitcase."

### Pieces (illustrative tokenisation)
Use exactly these pieces for the specimen. `␣` marks a leading space, which belongs to the piece after it.

| # | Piece | # | Piece | # | Piece | # | Piece |
|---|---|---|---|---|---|---|---|
| 1 | `The` | 6 | `␣in` | 11 | `␣it` | 16 | `␣What` |
| 2 | `␣trophy` | 7 | `␣the` | 12 | `'s` | 17 | `'s` |
| 3 | `␣doesn` | 8 | `␣suit` | 13 | `␣too` | 18 | `␣too` |
| 4 | `'t` | 9 | `case` | 14 | `␣big` | 19 | `␣big` |
| 5 | `␣fit` | 10 | `␣because` | 15 | `.` | 20 | `?` |

There are twenty pieces. In the variant, `␣big` becomes `␣small` at 14 and 19.

The reply pieces:
- big: `The`, `␣trophy`, `.`, then an end mark.
- small: `The`, `␣suit`, `case`, `.`, then an end mark. This takes one extra step, which Plate VI points out.

IDs are illustrative. They are stable numbers from 100 to 99,999, derived from a hash of the piece text (FNV-1a is fine), so they never change between visits.

### Attention weights (illustrative, hand-authored in `src/data/specimen.ts`)
- **Reading is causal.** A piece attends only to itself and the pieces before it. No thread may ever point forward. Assert this in code and in a test.
- **Each row sums to 1.** Default shape:
  - weight on the piece itself and on the previous piece;
  - small words spread thinly;
  - content words reach for related content words.
- **The story rows:**
  - At `␣it` (11), the weights are spread out and uncertain.
  - At the first `␣big` (14), `␣trophy` clearly dominates (about 0.35 to 0.45) and `␣it` comes second (about 0.2).
  - In the variant, `␣suit` and `case` together dominate at 14, and `␣it` comes second.
  - At the final `?` (20), the answer noun dominates again.
- **Three illustrative readers (attention heads):**
  - Reader one follows the story above.
  - Reader two mostly looks at the previous piece.
  - Reader three looks at punctuation and `␣because`.
  - The default view averages all three.

### Scores for the answer
These are illustrative logits for the piece after the reply's `The`:
- big: `␣trophy` 6.1, `␣suit` 3.2, `␣cup` 1.4, `␣prize` 1.0, `␣bag` 0.6, `␣box` 0.5, `␣medal` 0.4
- small: `␣suit` 5.9, `␣trophy` 3.0, `␣bag` 1.5, `␣box` 1.2, `␣case` 0.8, `␣trunk` 0.5, `␣cup` 0.3

Compute the likelihoods live with a real softmax at temperature T:
- p = exp(score / T) / sum of exp(score / T). Subtract the maximum score first, for stability.
- At T of 0.05 or less, take the top piece.
- Normalise over these seven pieces only. The caption explains that a real model scores every piece it knows.
- Check: at T = 1, trophy comes out at about 92%.

## 4. Art direction

### References to study (in spirit; never copy)
- **Anna Atkins, *Photographs of British Algae: Cyanotype Impressions* (1843):** white silhouettes on Prussian blue, rough brushed edges, handwritten captions exposed into the print.
- **Nineteenth-century anatomical and natural-history plates:** numbered plates, "Fig." captions, lowercase letter labels with fine leader lines.
- **Old celestial atlases:** star symbols sized by brightness, constellation lines, names lettered along curves.
- **Letterpress printing:** composing sticks, metal sorts, the bite of type into paper.

### Palette
No black anywhere; the darkest colour is Prussian deep. Add no other colours.

| Token | Hex | Job |
|---|---|---|
| `--paper` | `#EDEFE8` | The page, and every white silhouette on a field |
| `--paper-shade` | `#DADFD6` | Paper in shadow, rules, disabled states |
| `--prussian-deep` | `#0F2C54` | Text and line work on paper; the deepest exposure |
| `--prussian` | `#1C4A82` | The exposed field |
| `--prussian-wash` | `#6E8FB8` | Partial exposure, faint lines, texture |
| `--sensitiser` | `#D8D08A` | Unexposed paper: only for things the reader can change |
| `--sensitiser-deep` | `#B9AE5E` | Pressed and active states of those things |
| `--tone-umber` | `#4A3228` | Plate VI after toning, in place of blue |
| `--tone-cream` | `#E6D6BA` | Plate VI after toning, in place of paper |

Colour carries meaning:
- **Unexposed (sensitiser) means changeable.** This covers only the sentence input, the big/small switch, the temperature dial, the draw lever and the loupe toggles. Nothing else is ever sensitiser-coloured. Links are ink with a fine underline.
- **Exposed (blue and white) means settled.** This covers everything the machine has already processed.
- **Toned (umber and cream) means finished.** This covers only the answer.

Contrast:
- `--paper` on `--prussian` is about 7.7:1.
- `--prussian-deep` on `--paper` is about 12:1.
- `--sensitiser` on `--prussian` is about 5.6:1.
- `--prussian-wash` fails as text. Never use it for text that must be read. The one exception is the not-yet-read pieces on Plate IV, which are faint on purpose and only for a moment.

### Type
Two families for two voices. Nothing else.
- **Old Standard TT** (regular, italic, bold) sets all words. It revives the type style common in late nineteenth-century books.
- **League Gothic** sets the machine's numbers only, always on a ticker strip or in the table on Plate V. Normal tracking, never tracked-out capitals.

Scale (desktop; use `clamp()` so mobile body text lands at 18px and the title near 52px):

| Role | Size / line height | Style |
|---|---|---|
| Title page | 104–128px / 1.0 | Old Standard regular, tracking −0.01em |
| Plate title | 44–52px / 1.08 | Old Standard regular |
| Intro | 22px / 1.5 | Old Standard regular |
| Body and notes | 19–20px / 1.55 | Old Standard; notes in italic |
| Caption | 16px / 1.45 | Old Standard italic, starting "Fig. n." |
| Machine numbers | 20–22px / 1 | League Gothic |

Type rules:
- Lines are at most 62 characters.
- Text is ragged right, never justified.
- Use `text-wrap: balance` on titles and `pretty` on paragraphs.
- Use real apostrophes and quotes (’ “ ”).
- Nothing smaller than 18px inside a blue field.
- Plate numbers are roman numerals.
- The title page is centred; everything else is left-aligned.

### Materials
- **Paper:** faint fibres and gentle unevenness, drawn by the background shader. No coffee stains, grunge or fake scratches.
- **Brushed fields:** every figure sits on a cyanotype field. Its edges are rough and streaky and overshoot the rectangle unevenly. The brushing is different on each plate (seeded).
- **Line work:** hairline to 2px, slightly irregular (a light SVG turbulence displacement), like drawing ink or laid thread. Line weight always carries meaning, such as attention weight or star brightness.
- **Hand-made marks only:** every icon, arrow, pin, dial and fleuron is custom SVG in this style.
- **Imperfection with restraint:** pinned labels may turn up to ±0.8°, ticker strips up to ±0.5°, and exposure is uneven. Never cartoonish.

### Layout
- **Grid:** 12 columns, 24px gutters, outer margin `clamp(20px, 6vw, 96px)`, maximum content width 1600px.
- **One idea per plate.** The text column spans about 4 columns and the field about 7, with a column of air between them.
- **Plates alternate like the pages of a book.** Odd plates put the text on the left and the field on the right; even plates mirror this.
- **Notes** sit in the text column below the intro, smaller and in italic.
- **Captions** sit under the field, aligned to its left edge.
- **Under 768px:** a single column, in this order: plate number and title, intro, the field at full width minus margins, caption, then notes.

```
 +----------------------------------------------------------------------+
 | Plate III                                                            |
 |                                                                      |
 |  A chart of meaning         .~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~.  |
 |                            (                                       ) |
 |  Intro, 40-60 words,        (     brushed cyanotype field          ) |
 |  ink on paper.             (      the figure lives here             ) |
 |                             (                                      ) |
 |  A note, italic,            '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~'  |
 |  smaller.                    Fig. 3. Caption, italic, aligned to     |
 |                              the field's left edge.                  |
 +----------------------------------------------------------------------+
   odd plates as drawn; even plates mirrored
```

## 5. Motion language

### Principles
1. **Every motion is one of eight physical verbs:** brush, expose, cut, pin, thread, weigh, set, tone. If an animation is not one of these, and not a direct response to the reader, it should not exist.
2. **Only one moment runs without being triggered: the frontispiece.** Everything else answers scrolling or the reader's actions.
3. **One signature sequence per plate.** Intros, notes and captions arrive with their plate's exposure. They never get fly-ins of their own.
4. **Scroll-scrubbed for story, time-based for responses.** Story beats are tied to scroll (scrub 0.6 to 1). Clicks, typing and switches get immediate, time-based responses.
5. **Hand-made timing.**
   - Durations vary.
   - Staggers get a little randomness.
   - Lines draw at a constant pen speed of about 900px per second, so longer lines take longer.
   - No two sequences share identical timing.
6. **Reading comes first.** Interactive moments happen on a still page. Nothing moves while the reader is trying to read or play.

### Eases
Define these with CustomEase in `src/motion/eases.ts`; they are tunable in `?debug`.
- `brush`: quick start, a long wet drag at the end.
- `develop`: slow start, gathering, long settle.
- `hand`: a pen stroke with a slight hesitation near the middle. Used for cut lines and threads.
- `settle`: power3-out with a 1–2% overshoot. Used for pinned pieces.
- `press`: fast in, dead stop, a 1px recoil. Used for type sorts and ticker strips.
- `tone`: very slow in and out, like a toning bath.

### Durations
- Hover, focus and press responses: 120–220ms.
- Objects moving: 350–900ms.
- Lines: set by pen speed, roughly 600–1400ms.
- Exposures: 1.2–2.6s, or 40–60vh of scroll when scrubbed.
- Toning: 2.5–4s.

### Smooth scroll
- Use Lenis with `lerp` around 0.09–0.1, driven by the GSAP ticker and synced to ScrollTrigger.
- Leave touch scrolling native.
- It must never feel floaty or slow to respond.

### Reduced motion (`prefers-reduced-motion: reduce`)
- Lenis is off. No pinning or scrubbing.
- Every plate renders fully developed, with its lines already drawn.
- The chart camera stays still; clicking a constellation name jumps to it.
- Interactive changes use crossfades of 150ms or less.
- The loupe still works.

## 6. The pages, in order

Word counts are limits, not targets. Draft copy is given where the wording matters. You may tighten it, but keep its meaning and its plainness.

### Frontispiece
- **Job:** set the world in three seconds and make people want to scroll.
- **Composition:** a Victorian title page, centred. This is the only centred page.
  - A large brushed field fills most of the first screen.
  - The field holds the title, the subtitle in italic and a small drawn emblem (a single pinned slip).
  - The imprint and the scroll hint sit on the paper below the field.
- **Copy:**
  - Title: "Anatomy of a Thought"
  - Subtitle: "What happens to one sentence between the asking and the answer, in six plates."
  - Imprint: "Printed in cyanotype and code, 2026"
  - Hint: "Scroll to begin"
- **Load sequence:** about 3 seconds. This is the site's one untriggered moment.
  1. Wait for fonts (`document.fonts.ready`, giving up after 1.5s). Show blank paper.
  2. Brush the sensitiser on in three or four broad strokes (`brush`). Nothing is legible yet.
  3. The field develops from yellow-green to Prussian blue, unevenly and centre first (`develop`). The title and subtitle emerge as white silhouettes, because they blocked the light.
  4. The imprint and hint are printed in ink on the paper below.

  Any scroll, click or key press skips straight to the end state.
- **Signature:** the title emerging out of the blue.

### List of plates
- A classic list of plates: each title, a dotted leader, then its roman numeral. Colophon and Index follow. Ink on paper, no field.
- Each entry scrolls to its plate (Lenis `scrollTo`, 1.2–1.6s, `develop`).
- On hover, the leader dots darken from left to right in a quick stagger.

### Plate I. The specimen
- **Job:** meet the riddle.
- **Figure:** the sentence set large on a paper slip, pinned at both ends, lying on the field. As the field exposes, the slip stays white, so the sentence becomes a silhouette.
- **Intro:** "Here is our specimen, a small riddle. You probably solved it without noticing. The plates that follow show how a machine arrives at the same answer."
- **Note:** "It could mean the trophy or the suitcase. One word near the end decides which."
- **Scroll:** about 150vh, pinned while the field exposes.

### Plate II. Dissection
- **Job:** tokens.
- **Sequence** (scrubbed, about 250vh):
  1. Dashed cut lines draw between the pieces at pen speed.
  2. The slip is cut.
  3. The pieces separate (Flip), turn slightly and settle into a loose row.
  4. Each piece gets a pin, a letter label (a to t) and a ticker strip with its ID, feeding out from beneath it.
- **Intro:** "A machine can't read letters or words. It reads pieces, called tokens. First the sentence is cut into pieces, and each piece is swapped for a number."
- **Notes:**
  - "Doesn’t becomes two pieces, and so does suitcase. Common words stay whole; rarer ones are built from parts the machine already knows."
  - "Most pieces carry the space in front of them."
- **Caption:** "Fig. 2. The specimen divided into twenty pieces. Illustrative: every model cuts a little differently."
- **Interaction** (after the sequence, on a still page):
  - Label: "Lay down a sentence of your own". The input looks like an unexposed sensitiser slip, with an "Expose" button.
  - On submit, the reader's slip exposes and is cut by the illustrative tokeniser, with the same cut, pin and ticker animation, time-based.
  - Status afterwards: "Exposed. Your pieces will appear on the next plate."
  - A "Clear" button resets it.
  - Errors: "Write at least two words." and "Keep it under 120 characters."
- **Loupe:** each piece with its `␣` visible, and its ID.

### Plate III. A chart of meaning
- **Job:** embeddings.
- **Figure:** a celestial chart drawn with three.js on a transparent canvas over the field.
  - Every word in `vocab.ts` is a star. Its brightness is set by how common the word is.
  - Each star is drawn as an engraved star symbol (a dot with fine rays or rings) in `--paper`.
  - Constellation lines are thin `--paper` at about 40% opacity.
  - Constellation names are lettered in italic along curves (HTML overlay).
  - It must look printed, not rendered: no glow, no bloom, no additive blending, no depth-of-field blur.
- **Sequence** (scrubbed, about 350vh, pinned):
  1. The plate opens with the twenty pieces in a row across the top of the field, as Plate II left them.
  2. The pieces rise and hand off to their stars: fade each DOM piece as its star appears at the same screen position.
  3. The camera drifts from an overview through five stops. Each stop's caption replaces the last:
     - The Laurel: "Trophy lives among medal, cup and prize."
     - The Chest: "Case lives among box, bag and trunk."
     - The Wardrobe: "On its own, suit lives among the clothes. It becomes luggage only once case arrives and the reading begins."
     - The Rule: "Big and small sit side by side. They mean opposite things, but they turn up in the same places, and that is what this chart records."
     - The Crowded Centre: "It lives here among the small words, meaning almost nothing yet. It is waiting for a clue."
- **Intro:** "Each piece is given a place on a vast chart. Pieces that are used in similar ways end up close together."
- **The reader's words:**
  - Pieces from the reader's sentence are ringed and labelled "yours".
  - Pieces not on the chart go to The Uncharted, at the edge, with the note: "Not on this chart. A real model has a place for every piece; this hand-drawn chart has a few hundred."
- **Caption:** "Fig. 3. A hand-drawn chart of a few hundred pieces in three dimensions. A real model's chart has thousands of dimensions and no pictures."
- **After the sequence:**
  - A gentle drag turns the chart a little (damped, limited angle). No free flight.
  - Hovering a star shows its word.
  - Clicking a constellation name flies to it.
  - On touch there is no drag; tap a constellation name instead.
- **Loupe:** the star under the lens, written as the machine would write it: a short list of coordinates, then "and thousands more".
- **Accessibility:** a "List the stars" disclosure with each constellation and its words.
- **Loading:**
  - Import three.js when the reader comes within one screen of this plate.
  - If the reader jumps straight here, let the field develop while three.js loads.
  - If WebGL fails, show a static SVG version of the chart.

### Plate IV. The threads of attention
- **Job:** attention, and the fact that reading only ever looks back.
- **Figure:** the twenty pieces in a gently curved row. Threads arc above the row from the current piece back to earlier pieces. They are white and slightly fuzzy, like laid cotton, and their width is set by the weight.
- **Sequence** (scrubbed, about 300vh):
  1. A reading mark moves along the row one piece at a time. At each piece, its threads draw back to earlier pieces.
  2. Pieces not yet reached are faint (`--prussian-wash`), because the machine hasn't seen them.
  3. At `it`, the threads are thin and scattered.
  4. At the first `big`, a strong thread lands on `trophy` and another on `it`: the clue arrives and is tied back.
  5. The sequence ends on the final `?`, whose threads reach back to the answer noun.

  The notes appear one at a time, in step with the reading mark.
- **Intro:** "To understand a piece, the machine lets it look back at every piece before it and weigh which ones matter. Never ahead: a piece can only see what has already been read."
- **Notes:**
  1. "When it first appears, it can't know what it means. The clue hasn't arrived yet."
  2. "When big arrives, it looks back and ties it to trophy."
  3. "This looking happens many times over, layer after layer, each round refining the last. Between rounds, each piece is also worked on by itself."
- **Interaction** (on a still page):
  - A sensitiser control labelled "Change big to small".
  - When pressed, the strongest threads swing to suit and case, the old threads fade like a ghost exposure, and the inset below moves.
  - The label becomes "Change small to big".
  - An aria-live region announces: "Now the suitcase is too small. The threads lead to suitcase."
  - The change carries into Plates V and VI and is kept in the URL as `#small`.
- **Readers:** small italic tabs: "All readers" (the default), "Reader one", "Reader two", "Reader three". The note beside them: "Several readers look at once, each drawn to different things. Their jobs here are illustrative; real ones are rarely so tidy."
- **Inset** (Fig. 4b): a small chart where the point for `it` drifts from The Crowded Centre towards trophy (or suitcase). Caption: "After the reading, it has moved. It now sits close to trophy."
- **Caption:** "Fig. 4. Where each piece looks while reading. Weights illustrative."
- **Mobile:** lay the row out vertically, pieces top to bottom, with threads arcing out to one side.
- **Loupe:** the weights under the lens, written on the threads as numbers.

### Plate V. The weighing
- **Job:** next-piece prediction, likelihood, temperature and sampling.
- **Figure:** an engraved table of likelihoods.
  - Ruled lines, with the seven candidate pieces in Old Standard.
  - Bars are exposed strips whose length is the likelihood.
  - Numbers sit on ticker strips.
  - Beside the table: a drawn instrument dial for temperature and a small lever for drawing a piece, both sensitiser-coloured.
- **Sequence** (scrubbed, about 150vh):
  1. The reply's first piece, `The`, has already been chosen the same way, so it is set first.
  2. The bars for the next piece grow into place. Trophy dominates (suit in the variant).
- **Intro:** "Now the machine must answer, one piece at a time. It gives every piece it knows a score, turns the scores into likelihoods, and chooses."
- **Temperature** (on a still page):
  - Range 0 to 2 in steps of 0.05, default 1, labelled "cool" and "hot" at the ends.
  - The bars update live from the real softmax.
  - Build it on a real `<input type="range">` so it works with a keyboard. The drawn dial mirrors the input and can also be turned directly with Draggable and inertia.
- **Draw a piece:**
  - The "Draw a piece" lever samples from the current likelihoods and pins the result on a slip ("Drawn: trophy").
  - Keep a tally of the last ten draws, so the randomness is visible.
- **Notes:**
  - "Turn it down and the machine always takes the favourite. Turn it up and it grows adventurous, and sometimes wrong."
  - Variant only: "Here the favourite is suit, half a word. The machine is content to build a word in pieces; case comes next."
- **Caption:** "Fig. 5. The seven likeliest next pieces. Scores illustrative; a real model scores every piece it knows."
- **Loupe:** the raw scores instead of likelihoods, with the note "Under the loupe, the scores before weighing."

### Plate VI. The composing stick
- **Job:** the loop, stopping, and the answer.
- **Figure:** a printer's composing stick in fine line. Each chosen piece is a metal sort, drawn as a block, that drops into the stick (`press`).
- **Sequence** (scrubbed, about 250vh):
  1. `The` drops in.
  2. A drawn loop arrow carries it back to the end of the sentence, while a miniature row of threads flickers once to show the whole reading running again.
  3. Then `␣trophy`, then `.`, then an end mark (a small drawn fleuron).
  4. The variant takes one more loop: `The`, `␣suit`, `case`, `.`, end.
- **Toning:**
  - Once the end mark is set, the plate tones. Blue becomes umber and white becomes cream, spreading from the centre like a bath (`tone`).
  - The answer is printed large: "The trophy." or "The suitcase."
- **Intro:** "Each chosen piece is added to the end, and the whole reading runs again to choose the next. It stops when the likeliest next piece is the end."
- **Note:** "Four pieces, four full readings. Five for suitcase."
- **Caption:** "Fig. 6. The reply, set one piece at a time."
- **Loupe:** the IDs of the reply's pieces.

### Colophon
Ink on paper, left-aligned, short. Draft:

> This atlas was designed, written and built by ADITYA with Claude Opus 5.5. Every mark on these plates, each star, thread and letter, is drawn by code; there are no photographs. The text is set in Old Standard, a revival of the type style common in late nineteenth-century books, and the machine’s numbers in League Gothic. The plates imitate cyanotype, the blue sun print Anna Atkins used in 1843 for what is widely considered the first book illustrated with photographs. Figures marked illustrative are drawings, not measurements. Whether any of this amounts to a thought is a question for another atlas.

End with a link, "Expose the atlas again", that scrolls to the top and replays the frontispiece.

### Index
Alphabetical, ink on paper, each term linking to its plate:
- attention (IV)
- attention head, see reader
- chart of meaning (III)
- constellation (III)
- embedding (III)
- layer (IV)
- likelihood (V)
- logit, see score
- one piece at a time (VI)
- reader (IV)
- sampling (V)
- score (V)
- stopping (VI)
- temperature (V)
- token (II)
- tokeniser (II)

## 7. Recurring systems

### The background: paper and chemistry
One fixed, full-viewport WebGL2 canvas sits behind all content. It draws the paper and every brushed field with a single fragment shader (a fullscreen triangle; import the GLSL with Vite's `?raw`).
- **Fields.** Each plate's field is an element marked `data-field`.
  - Measure on-screen fields once per frame and pass up to two rectangles to the shader.
  - Each rectangle has its own uniforms:
    - `seed`
    - `brush`: 0 to 1, how much sensitiser has been brushed on
    - `exposure`: 0 to 1, from yellow-green to Prussian blue, uneven and centre first
    - `tone`: 0 to 1, Plate VI only
- **Brushed edges.** A signed-distance rectangle pushed in and out by anisotropic noise along the brush direction, with streaks.
- **Exposure** is a noise-thresholded mix, so it develops unevenly.
- **Render only when something has changed:** while scrolling, while a uniform animates, or after a resize. Cap device pixel ratio at 2 (1.5 on touch devices).
- **Fallback.** If WebGL2 is unavailable or fails, use plain CSS colours for the same states, driven by the same CSS variables.
- **DOM text and SVG sit on top.** Silhouettes are simply `--paper`-coloured text and shapes over the blue.

### The loupe
- **Fine pointers.**
  - Hovering any `[data-loupe]` figure turns the cursor into a 168px round lens.
  - Inside the lens, that figure's machine layer is revealed with `clip-path: circle()` at the pointer and magnified 1.4×. The machine layer is a sibling element of numbers in League Gothic, ink on paper.
  - The rim is a 1.5px `--paper` line with a faint drawn inner shadow.
  - The lens follows with a slight lag (lerp about 0.2), never springy.
- **Touch.** Press and hold a figure for 350ms to show the lens above the finger; release to hide it.
- **Keyboard and screen readers.** Each figure has a button, "Show the machine’s view", that reveals its whole machine layer. The machine layer is also available as real text (a table or list).
- **Hint.** It appears once, in the margin of Plate II: "Hold the loupe over a figure to see what the machine sees." On touch: "Press and hold a figure to see what the machine sees."
- The loupe is the only cursor change on the site.

### Ticker strips
- Narrow `--paper` strips, 26–32px tall, with slightly torn ends (SVG), turned up to ±0.5°.
- They carry League Gothic numbers in `--prussian-deep`.
- They feed out from under the piece they belong to in 300–450ms with `press`.

### Plate indicator
- Fixed at the bottom left, small italic: "Plate III of VI".
- Hidden on the frontispiece, list of plates, colophon and index.
- Crossfades in 150ms when it changes.

### Global state
`src/state.ts` holds three values, with a tiny subscribe and notify:
- `variant`: `'big' | 'small'`. The default is big; `#small` in the URL sets small.
- `readerSentence`
- `readerPieces`

Plates IV to VI react live to `variant`.

## 8. Words

**Voice:** a patient naturalist explaining a specimen to a curious friend.
- Plain modern English, short sentences, concrete nouns.
- Dry humour at most once per plate.
- The nineteenth-century flavour lives in the structure (plates, figures, captions), never in fake old-fashioned language.
- British spelling.

Rules:
- Sentence case everywhere, except proper names such as the site title and constellation names. Titles are plain phrases, not slogans.
- No exclamation marks, no rhetorical questions as headings, no emoji.
- Intros at most 60 words, notes at most 30, and captions begin "Fig. n.".
- Introduce each technical term once in plain words ("pieces, called tokens"), then use the plain word.
- Buttons say exactly what will happen, and the result reuses the same verb. The "Expose" button leads to the status "Exposed"; "Draw a piece" leads to "Drawn: trophy".
- Error messages say what is wrong and how to fix it, in the atlas's voice. They never apologise.

**Accuracy.** This is a science atlas, and it must be right.
- Explain how large language models work in general. Make no claims about Claude's internals: no layer counts, vocabulary sizes, parameter counts, real token IDs or training details.
- Safe to say:
  - Text is split into tokens.
  - Each token becomes a vector, and tokens used in similar ways get nearby vectors.
  - Attention lets each position draw on earlier positions only.
  - This repeats across many layers.
  - The last position produces a score for every token in the vocabulary, and the scores become probabilities.
  - One token is chosen; temperature controls how adventurous the choice is.
  - The chosen token is appended, and the process repeats until an end token is chosen.
- Label anything hand-authored (splits, IDs, positions, weights, scores) as illustrative in its caption.
- "Thought" is the poetic title; the colophon keeps it honest.

## 9. Anti-generic rules

### Never

**Visual:**
- Decorative gradients (purple, blue or pink washes), gradient text, glassmorphism, glow, bloom, lens flares, neon. The uneven tone of the cyanotype texture is not a gradient in this sense.
- "AI" imagery: glowing brains, particle heads, network graphs, circuit boards, robots, sparkles.
- Black or near-black (#000, #0B0B0B, #111) anywhere.
- Rounded SaaS cards with soft grey shadows, identical card grids, pill badges, "New" chips.
- A centred hero with headline, subhead and two buttons; three-column feature grids; logo walls; testimonials; pricing-style tables.
- Emoji and icon libraries (Lucide, Heroicons, Font Awesome). Every mark is custom SVG.
- Stock photos, AI-generated images, placeholder images, lorem ipsum.
- Any typeface other than Old Standard TT and League Gothic.

**Typographic tells:**
- Tracked-out ALL-CAPS labels or eyebrows above headings.
- One word in a headline set in italic, bold or another colour for emphasis.
- Meta strings joined with middle dots ("A · B · C"), and labels built as "Word — fragment".
- "→" appended to links or buttons.
- A monospace face for small data labels.

**Motion tells:**
- Fade-and-slide-up on every section; a hover lift and shadow on every element.
- The same durations and eases everywhere; parallax on everything.
- A custom cursor dot or trail (the loupe is the only cursor change).
- Page curls, 3D card flips, scroll-jacking that fights the reader, a bouncing mouse icon.

**Words:**
- unleash, elevate, seamless, revolutionise, cutting-edge, harness, unlock, supercharge, empower
- game-changer, next-level, dive in, delve, journey, tapestry, realm, embark, testament
- "in today's world", "the power of AI", "welcome to"

### Always
- A clear grid, with deliberate breaks that have a reason.
- One idea, one signature motion and one memorable detail per plate.
- The same verbs and states across the whole site.
- Real typographic care: curly quotes, proper dashes, no widows in titles, comfortable line lengths.
- Restraint: before calling a plate finished, remove one element that doesn't earn its place, and note what you removed.

## 10. Technical specification

### Setup
- Check that `node -v` is 20 or newer and that git is installed. If not, stop and tell me.
- Set Vite up by hand (package.json, tsconfig.json, vite.config.ts, index.html). Do not run create-vite in this folder: it expects an empty directory and may offer to delete CLAUDE.md and BRIEF.md.
- Dependencies:
  - `gsap`
  - `lenis`
  - `three`
  - `simplex-noise`
  - `@fontsource/old-standard-tt`
  - `@fontsource/league-gothic`
- Dev dependencies:
  - `typescript`
  - `vite`
  - `@types/three`
  - `playwright`
  - `@axe-core/playwright`
  - `vitest`
  - `lil-gui`

  Then run `npx playwright install chromium`.
- If a Fontsource package name has changed, download the WOFF2 files from Google Fonts into `public/fonts/` and self-host them. Never load fonts from a CDN.
- GSAP:
  - Every plugin ships in the public `gsap` package: `gsap/ScrollTrigger`, `gsap/SplitText`, `gsap/DrawSVGPlugin`, `gsap/CustomEase`, `gsap/Flip`, `gsap/Draggable`, `gsap/InertiaPlugin`.
  - No auth tokens and no private registry.
  - Register each plugin once.
- Scripts: `dev`, `build` (`tsc --noEmit && vite build`), `preview`, `test` (vitest), `shots`, `og`.

### Architecture
```
index.html                 all content, semantic, readable without JS
styleguide.html            Phase 1 style tile (dev only, not in the build)
public/                    favicon.svg, og.png, fonts/ if self-hosted by hand
scripts/shots.mjs          Playwright screenshots and axe checks
scripts/og.mjs             1200×630 Open Graph image of the developed frontispiece
src/main.ts                boot: fonts ready, then scroll, background, plates
src/state.ts               variant, reader sentence, subscribe/notify
src/styles/                tokens.css, base.css, type.css, plates.css
src/motion/                eases.ts, scroll.ts (Lenis + ScrollTrigger), reduced-motion.ts
src/gl/                    background.ts, background.vert.glsl, background.frag.glsl
src/plates/                frontispiece.ts, list-of-plates.ts, plate1-specimen.ts,
                           plate2-dissection.ts, plate3-chart.ts, plate4-threads.ts,
                           plate5-weighing.ts, plate6-composing.ts, colophon.ts
src/components/            loupe.ts, ticker.ts, plate-indicator.ts
src/data/                  specimen.ts (pieces, IDs, weights, scores), vocab.ts
src/lib/                   tokeniser.ts, softmax.ts, hash.ts
src/debug/                 gui.ts (lil-gui, loaded only with ?debug)
```

### Lenis and ScrollTrigger
```ts
const lenis = new Lenis({ lerp: 0.1 });
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add((time) => lenis.raf(time * 1000));
gsap.ticker.lagSmoothing(0);
```
Skip Lenis entirely under reduced motion.

### The illustrative tokeniser (`src/lib/tokeniser.ts`)
It must be deterministic, dependency-free and tested:
1. Punctuation becomes its own piece. A leading space belongs to the piece after it.
2. Contractions split: "doesn't" becomes `doesn` + `'t`. The endings `'s`, `'re`, `'ve`, `'ll`, `'d` and `'m` split off.
3. Words in `vocab.ts`, or in a list of about 300 common words, stay whole.
4. Other words split in this order:
   - at known prefixes and suffixes (un, re, pre, dis; ing, ed, er, est, ly, ness, ment, tion, able, ful, less);
   - into known parts (suit + case, rain + coat);
   - anything still longer than 7 letters splits into chunks of 3 to 5 letters.
5. At most 40 pieces. A test asserts that both specimen sentences produce exactly the pieces in §3.

### Chart data (`src/data/vocab.ts`)
- **Size:** 400–600 common English words in 15 constellations of roughly 25–45 words each.
- **The constellations:**
  - The Laurel (prizes)
  - The Chest (containers)
  - The Wardrobe (clothes)
  - The Rule (size and measure)
  - The Menagerie (animals)
  - The Hearth (family and home)
  - The Heart (feelings)
  - The Sky (weather)
  - The Clock (time)
  - The Road (movement and travel)
  - The Table (food)
  - The Palette (colours)
  - The Tally (numbers)
  - The Workshop (tools and machines)
  - The Crowded Centre (small words and punctuation)

  Plus The Uncharted, an edge region for pieces the chart doesn't know.
- **Required words:**
  - Every piece of both specimens and both replies must be on the chart: suit in The Wardrobe; case in The Chest; it, the, 's, 't, doesn, too and the punctuation in The Crowded Centre.
  - Every word named in a Plate III caption must be there too.
  - Suitcase must not be in the vocabulary as one word.
- **Each entry:** text, constellation, position (x, y, z) and magnitude 1–6.
- **Placement:**
  - Words in a constellation sit near each other.
  - Pairs used in the same places sit close together: big and small, hot and cold, up and down.
- **Lines:** 5–12 constellation lines per constellation, drawn between near neighbours.

### Performance budget
- LCP under 2.5s; CLS under 0.05.
- Initial JavaScript under about 180KB gzipped. three.js is excluded because it loads later. Lazy-load plate code that the first screen doesn't need.
- 60fps while scrolling on a mid-range laptop; no long tasks over 50ms during scroll.
- WebGL renders only when needed. The Plate III renderer pauses whenever the plate is off-screen.
- Fonts: Latin subset, WOFF2, the two most-used styles preloaded, `font-display: swap`, and metric-matched fallbacks so nothing shifts when the fonts load.

### Accessibility
- A visually hidden "Skip to the plates" link comes first in the page.
- One `h1` (the title). Each plate is a `section` with `aria-labelledby` pointing at its `h2`.
- Figures use `figure` and `figcaption`. SVG figures have `role="img"` with `title` and `desc`.
- Every control is a real `button` or `input` with a label.
- Visible focus: a 2px outline, offset 3px; `--sensitiser` on blue and `--prussian-deep` on paper.
- Text contrast of at least 4.5:1.
- Reduced motion as described in §5.
- A text alternative for the chart, and an announced variant switch.
- Zero axe violations at the end of every phase.

### Responsive and browsers
- Check 390×844, 768×1024, 1440×900 and 1920×1080. Resizing must never break the layout.
- Under 768px:
  - a single column;
  - pinned sections about 60% of their desktop length;
  - fewer star labels;
  - the Plate IV row laid out vertically;
  - the loupe by press and hold.
- Support the latest two versions of Chrome, Edge, Firefox and Safari, including iOS Safari.

### Meta
- Title: "Anatomy of a Thought".
- Description: "An illustrated atlas that follows one sentence through a language model: tokens, meaning, attention and the answer."
- The Open Graph image comes from `npm run og`.
- `favicon.svg` is a small Prussian square with a white pinned slip.
- Write a `DEPLOY.md` with steps for Vercel and for GitHub Pages.

## 11. Build phases

One phase per session. At the end of each phase:
1. Run the verification loop (§12).
2. Update PROGRESS.md.
3. Commit.
4. Stop and tell me exactly what to look at in the browser: which URL, where to scroll, what to try.

**Phase 0. Plan, with no site code.**
1. Run the setup checks, `git init`, and add a `.gitignore` (node_modules, dist, shots).
2. Write DESIGN-PLAN.md, covering:
   - tokens and the type scale;
   - ASCII wireframes for every page, at desktop and mobile;
   - a motion storyboard for each plate: its beats, with scroll ranges or durations, and eases;
   - the technical plan: modules, data, how the fields reach the shader, and the DOM-to-WebGL hand-off on Plate III;
   - risks, with their fallbacks.
3. Review the plan against §9. Name anything that drifted towards a default and revise it. Write down what you changed and why.
4. Ask me up to five questions, only if something is genuinely unclear.

**Phase 1. Foundation and style tile.** This review decides the look of everything that follows, so make it beautiful. Build:
- the manual Vite setup, dependencies, fonts, tokens, base styles and eases;
- the background shader with its CSS fallback;
- Lenis and ScrollTrigger;
- `?debug` with lil-gui for colours, eases and exposure settings;
- the shots script;
- a `styleguide.html` showing:
  - the palette, with each colour's job;
  - the type scale in use;
  - a sample plate with an intro, a note, a caption, and a field that brushes on and exposes when you press a button;
  - a ticker strip;
  - a sensitiser control in every state (default, hover, focus, pressed, disabled);
  - a pinned piece;
  - a thread;
  - a working loupe.

**Phase 2. Frontispiece, list of plates, Plate I.** The load sequence and its skip, reduced motion, the list navigation, and Plate I.

**Phase 3. Plate II.** The dissection sequence, the tokeniser and its tests, and the reader's own sentence.

**Phase 4. Plate III.** `vocab.ts`, the three.js chart, the hand-off of the pieces, the camera stops, the reader's words, the text alternative and the SVG fallback.

**Phase 5. Plate IV.** The causal reading sequence, the big/small switch, global state and the URL hash, the readers, and the drifting inset.

**Phase 6. Plates V and VI, colophon, index.** The live softmax and dial, drawing pieces, the composing stick and its loop, toning, and the final answer.

**Phase 7. The whole.**
- Add the loupe on every plate, the plate indicator, and the transitions between plates.
- Scroll the entire site from top to bottom and tune its rhythm: where it should hurry, where it should pause, where it should breathe.
- Write down what you changed.

**Phase 8. Finish and launch.**
- The responsive and cross-browser pass.
- The accessibility audit and the performance budget.
- The OG image, favicon and meta.
- The "remove one element per plate" pass.
- `DEPLOY.md`.

## 12. Verification and QA

### Every phase
1. **Build and test.** `npm run build` with zero TypeScript errors, `npm test` passing, and no errors or warnings in the console.
2. **Screenshots.** Run `npm run shots`. The script starts and stops its own server.
   - When the URL contains `?shots` (and always in development), expose `window.__atlas.goTo(plate, progress)` and `window.__atlas.setVariant(v)`. This lets the script jump to named checkpoints: the start, middle and end of every sequence, plus each interactive state.
   - Capture 1440×900 and 390×844, once normally and once with `page.emulateMedia({ reducedMotion: 'reduce' })`.
   - Run axe on every state.
3. **Critique.** Open the screenshots and critique them as a demanding art director would. In PROGRESS.md, list three things that work and three that look generic, unfinished or off-brief. Fix those three, re-shoot, and check again.

### Before launch
- Lighthouse: Performance of at least 90 on desktop and 75 on mobile; Accessibility, Best Practices and SEO of at least 95.
- A complete keyboard-only pass and a screen-reader pass: headings, figures, controls and announcements all make sense.
- A complete reduced-motion pass.
- Resize from 1920px down to 360px without breakage, and rotate a phone.
- A proofreading pass: spelling, curly quotes, dashes, no widows in titles, every figure numbered correctly.

## 13. Stretch goals (only when I ask)
- Sound, off by default behind one toggle: soft brush and paper sounds from CC0 files I will put in `public/audio/`.
- A print stylesheet, so the atlas prints as a set of plates.
- Real sentence embeddings for the reader's words, using transformers.js, projected onto the chart.
