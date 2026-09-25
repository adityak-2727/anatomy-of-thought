# Anatomy of a Thought: design plan

Written in Phase 0, 25 September 2026. This is the plan of record. BRIEF.md wins wherever the two disagree. When a decision here changes, update this file and log the change in PROGRESS.md.

Contents

1. The idea, restated as rules
2. Tokens
3. Grid and breakpoints
4. Page structure
5. Wireframes
6. Motion storyboards
7. Responses to the reader
8. Technical plan
9. Accuracy review of the copy
10. Copy added or decided in this plan
11. Risks and fallbacks
12. Review against BRIEF §9
13. Open questions

---

## 1. The idea, restated as rules

The cyanotype process gives the whole site one grammar. Three states:

| State | Colour | Meaning | Where |
|---|---|---|---|
| Sensitised | `--sensitiser` | The reader can change this | Sentence input, big/small switch, temperature dial, draw lever, loupe toggles |
| Exposed | `--prussian` and `--paper` | The machine has processed this | Every field and everything on it |
| Toned | `--tone-umber` and `--tone-cream` | Finished | Plate VI field, after the end mark, and nothing else |

These rules keep the motion honest:

1. **Objects are exposed, never drawn.** Anything that lies on a field, such as the slip, the table card, the composing stick, the pins or the dial, appears because the field darkens around it and it stays white. Nothing that is an object fades in on its own.
2. **Only actions are drawn with a pen.** Cut lines, threads, constellation lines, the loop arrow, leader lines and tally strokes draw at the pen speed (900px/s).
3. **Type and rules are set.** Ticker numbers, letter labels, candidate names, brass rules, sorts and the final answer arrive with `press`: fast in, dead stop, a 1px recoil.
4. **Text on paper never moves.** Intros, notes and captions develop in place (opacity only, line by line, uneven). They never translate.

### The eight verbs

| Verb | Physically | On screen | Ease | Used on |
|---|---|---|---|---|
| brush | Sensitiser brushed on in strokes | Shader `brush` sweeps 3–4 seeded strokes | `brush` | Every field; the reader’s slip after Clear |
| expose | Light turns the paper blue around objects | Shader `exposure`; stars reveal; text develops | `develop` | Every field; Plate III stars; ghost threads |
| cut | A blade marks and parts the slip | Dashed line drawn at pen speed, then the pieces part | `hand`, `press` | Plate II; the reader’s sentence |
| pin | An object is laid down and pinned | Translate and rotate to rest; pin head pressed in | `settle`, `press` | Plates I, II and IV; the drawn slip on Plate V |
| thread | Cotton laid from piece to piece | Path drawn at pen speed; width carries weight | `hand` | Plate IV; Plate VI mini row; Plate III constellation lines |
| weigh | A quantity finds its level | An exposed strip runs to its length; a needle swings | `develop`, `settle` | Plate V bars and dial |
| set | Type or rules locked into the forme | Fast in, dead stop, 1px recoil | `press` | Tickers, labels, names, rules, sorts, the answer |
| tone | The print bathed from blue to umber | Shader `tone` spreads from the centre; SVG fills follow | `tone` | Plate VI only |

### One signature and one detail per plate

| Page | Idea | Signature motion | Memorable detail |
|---|---|---|---|
| Frontispiece | A title page being printed | The title emerging out of the blue | The letters hold the yellow-green for a moment, then wash to white, as unexposed sensitiser does |
| I. The specimen | Meet the riddle | The slip becomes a silhouette as the field exposes | The pins leave white shadows where they cross the blue |
| II. Dissection | Tokens | The cut | Each cut falls just before a space, so the separated pieces visibly carry their space with them |
| III. A chart of meaning | Embeddings | Twenty pieces become their stars | Constellation names lettered along curves, like an old celestial atlas |
| IV. The threads of attention | Looking back | The strong thread landing on trophy at big | A needle as the reading mark; the ghost exposure left behind when big becomes small |
| V. The weighing | Likelihood and choice | The bars weighing out | A hand tally of the last ten draws beside each row, next to the bar it should roughly match |
| VI. The composing stick | The loop and the answer | Toning | Each chosen sort is carried back to lengthen the sentence, and a fleuron ends it |

---

## 2. Tokens

All values live in `src/styles/tokens.css` (CSS) and `src/motion/eases.ts` (motion). No hex values or timings anywhere else. The shader and three.js read colours from the computed custom properties once at start-up, so they hold no hex values of their own either.

### 2.1 Colour

The brief’s nine tokens, unchanged:

```css
--paper: #EDEFE8;          --paper-shade: #DADFD6;
--prussian-deep: #0F2C54;  --prussian: #1C4A82;      --prussian-wash: #6E8FB8;
--sensitiser: #D8D08A;     --sensitiser-deep: #B9AE5E;
--tone-umber: #4A3228;     --tone-cream: #E6D6BA;
```

Semantic aliases, so components never pick raw colours:

```css
--ink: var(--prussian-deep);          /* text and line work on paper */
--silhouette: var(--paper);           /* text and line work on a field */
--rule: var(--paper-shade);           /* rules on paper, disabled states */
--focus-on-paper: var(--prussian-deep);
--focus-on-field: var(--sensitiser);
--o-constellation: 0.4;               /* constellation line opacity */
--o-ghost: 0.16;                      /* ghost threads after a switch */
--o-graticule: 0.22;                  /* chart graticule */
```

Contrast, measured in Phase 0 with the WCAG formula:

| Pair | Ratio | Consequence |
|---|---|---|
| paper on prussian | 7.70 | All legible matter on a field is paper |
| prussian-deep on paper | 12.01 | All legible matter on paper is ink |
| sensitiser on prussian | 5.66 | Sensitiser controls read well on fields |
| prussian-deep on sensitiser | 8.82 | Control labels are ink |
| prussian-deep on sensitiser-deep | 6.15 | Pressed labels stay legible |
| sensitiser-deep on prussian | 3.95 | The pressed state passes 3:1 as a graphic |
| tone-cream on tone-umber | 8.26 | The toned answer is legible |
| prussian-wash on prussian | 2.67 | Never text, and below 3:1 as a graphic: decorative faintness only |
| prussian-wash on paper | 2.88 | As above |
| prussian-deep on prussian | 1.56 | Ink never goes on blue |
| sensitiser on paper | 1.36 | A sensitiser control on paper is invisible; see below |

Two rules follow:
- **Sensitiser controls live on fields.** Every control that has to sit on paper gets a hairline ink edge, so that its boundary passes 3:1.
- **Colour changes are crossfades.** To keep to the transform, opacity, SVG attribute and uniform rule in CLAUDE.md, a state that changes colour (hover, pressed, darkening leader dots) stacks two layers and crossfades their opacity, or animates an SVG `fill`/`stroke` attribute. CSS `color` and `background-color` are never animated.

The site has no dark theme. The atlas is paper; `color-scheme: light` is set.

### 2.2 Type

Families:
- **Old Standard TT**: 400 and 400 italic, both preloaded. 700 is not shipped unless a real use turns up; none is planned.
- **League Gothic**: 400. It is first used on Plate II, so the browser fetches it on first use without a preload.

Loading:
- Latin subset WOFF2 files, self-hosted from the Fontsource packages, with `font-display: swap`.
- Metric-matched fallback faces: `Old Standard fallback` from local Times New Roman or Georgia, and `League Gothic fallback` from local Arial Narrow. Their `size-adjust`, `ascent-override` and `descent-override` values are computed in Phase 1 from the real font files, so nothing shifts when the fonts arrive.

Fluid sizes run from 390px to 1600px wide (values in rem, 1rem = 16px):

| Role | Token | Phone → desktop | CSS | Line height | Style |
|---|---|---|---|---|---|
| Title page | `--type-title` | 52 → 118 (1440) → 128 | `clamp(2.75rem, 1.719rem + 6.281vw, 8rem)` | 1.0 | Old Standard 400, tracking −0.01em |
| Title page subtitle | `--type-subtitle` | 20 → 28 | `clamp(1.25rem, 1.088rem + 0.661vw, 1.75rem)` | 1.35 | Italic, silhouette |
| Plate title | `--type-plate-title` | 34 → 50 → 52 | `clamp(2.125rem, 1.754rem + 1.524vw, 3.25rem)` | 1.08 | Old Standard 400 |
| Plate number | `--type-body` | 18 → 20 | as body | 1.55 | Italic: “Plate III” |
| Intro | `--type-intro` | 20 → 22 | `clamp(1.25rem, 1.204rem + 0.19vw, 1.375rem)` | 1.5 | Old Standard 400 |
| Body and notes | `--type-body` | 18 → 20 | `clamp(1.125rem, 1.09rem + 0.143vw, 1.25rem)` | 1.55 | Notes italic |
| Caption | `--type-caption` | 16 | `1rem` | 1.45 | Italic, starts “Fig. n.” |
| Field label | `--type-field-label` | 18 → 19 | `clamp(1.125rem, 1.105rem + 0.083vw, 1.1875rem)` | 1.3 | Italic, silhouette; the floor for anything on blue |
| Machine numbers | `--type-machine` | 20 → 22 | `clamp(1.25rem, 1.204rem + 0.19vw, 1.375rem)` | 1.0 | League Gothic, normal tracking |
| Small italic | `--type-small` | 16 | `1rem` | 1.4 | Imprint, plate indicator, loupe hint |

Rules:
- The measure is at most 62 characters (`max-inline-size: 31em` for body text), ragged right.
- Titles use `text-wrap: balance`; paragraphs use `pretty`. Widows are also prevented by hand with no-break spaces, because Safari’s support for `pretty` is recent.
- The title is written “Anatomy of&nbsp;a&nbsp;Thought”, with no-break spaces inside “of a Thought”, so it only ever breaks as “Anatomy / of a Thought”.
- Curly quotes and apostrophes throughout, including in the specimen (see §10).
- Nothing smaller than 18px on blue. Captions (16px) always sit on paper.
- Roman numerals for plate numbers are set in Old Standard. They are words, not the machine’s numbers.
- One open risk: Old Standard’s hairlines can break up when set small in white on blue. The Phase 1 style tile tests 18–19px silhouette text at DPR 1 and 2. The fallback is to use regular in place of italic for small labels on fields.

### 2.3 Space

A 4px base scale: `--s-1` 4, `--s-2` 8, `--s-3` 12, `--s-4` 16, `--s-5` 24, `--s-6` 32, `--s-7` 48, `--s-8` 64, `--s-9` 96, `--s-10` 144, `--s-11` 192.

Between plates, `--plate-gap: clamp(96px, 22vh, 240px)` of plain paper, so each plate breathes before the next field is brushed.

### 2.4 Motion tokens (`src/motion/eases.ts`)

Eases are starting curves, to be tuned live in `?debug`. Each is kept as control points, so lil-gui can edit them and re-create the CustomEase under the same name.

| Name | Character | Initial path |
|---|---|---|
| `brush` | Quick start, long wet drag | `M0,0 C0.05,0.42 0.14,0.74 0.34,0.88 0.54,0.97 0.74,0.995 1,1` |
| `develop` | Slow start, gathering, long settle | `M0,0 C0.22,0 0.3,0.08 0.42,0.3 0.55,0.56 0.66,0.86 0.82,0.96 0.9,0.99 1,1` |
| `hand` | Pen stroke with a hesitation near the middle | `M0,0 C0.12,0.18 0.3,0.42 0.44,0.5 0.5,0.53 0.56,0.55 0.62,0.6 0.76,0.72 0.88,0.97 1,1` |
| `settle` | power3.out with a 1.5% overshoot | `M0,0 C0.14,0.62 0.28,1.015 0.5,1.015 0.7,1.015 0.84,1 1,1` |
| `press` | Fast in, dead stop | `M0,0 C0.3,0 0.62,0.5 1,1`, plus a separate 1px recoil tween (see below) |
| `tone` | Very slow in and out | `M0,0 C0.62,0 0.38,1 1,1` |

The recoil in `press` must be 1px whatever the distance travelled, so it cannot live inside a normalised ease. `setPress(target, vars)` appends `y: -1` over 0.05s and `y: 0` over 0.07s after the main tween.

Timings:

```ts
PEN_SPEED = 900;                     // px per second
pen(len) = clamp(0.12, 1.6, len / PEN_SPEED)  // floor so a 40px cut is still seen
DUR = {
  respond: [0.12, 0.22],             // hover, focus, press
  move:    [0.35, 0.9],
  expose:  [1.2, 2.6],               // or 40–60vh when scrubbed
  tone:    [2.5, 4.0],
  rmFade:  0.15,                     // reduced-motion crossfade ceiling
};
vary(base, key, amount = 0.12)       // deterministic ±12% from plate seed + key
jitterStagger(step, key)             // ±25% of the step, seeded
SCRUB = { story: 0.7, camera: 1.0, needle: 0.6 };  // Lenis already smooths; keep these low
LENIS_LERP = 0.1;  LOUPE_LERP = 0.2;
SEEDS = { frontispiece: 1843, plates: [1844, 1845, 1846, 1847, 1848, 1849] };
```

Pin lengths (desktop vh / phone vh, about 60%):

| Plate | I | II | III | IV | V | VI |
|---|---|---|---|---|---|---|
| Desktop | 150 | 250 | 350 | 300 | 150 | 250 |
| Phone | 90 | 150 | 210 | 180 | 90 | 150 |

Every pin ends with a **rest** of about 12% of its length, where nothing moves, so the reader can read or play on a still page.

---

## 3. Grid and breakpoints

Grid tokens: `--cols: 12; --gutter: 24px; --margin: clamp(20px, 6vw, 96px); --content-max: 1600px`.

At 1440px the content box is 1267px wide and a column is 83.6px. The 4-column text block is 406px and the 7-column field is 729px. At 1920px (capped at 1600) they are 516px and 921px.

| Layout | When | Arrangement |
|---|---|---|
| Phone | `width < 768px` | Single column in the brief’s order: number and title, intro, field, caption, notes. Only the figure pins, at about 60% length. |
| Folio | `768–1099px`, or any width under 700px tall | Single column with larger type. The text measure stays ≤ 31em, and odd and even plates indent the text block differently, so the book’s alternation survives. The field is full width. Desktop pin lengths. |
| Desktop | `≥ 1100px` wide and `≥ 700px` tall | Text 4 columns, air 1, field 7. Odd plates put the text on the left, even plates on the right. The whole plate frame pins. From 1100 to 1279px the text takes 5 columns and the air column goes, because 4 columns there would set the intro at about 34 characters. |
| Wide | `≥ 1600px` | As desktop; the content is capped and centred. |

Why Folio exists: at 768×1024 a 4 + 7 split leaves a text column about 200px wide, roughly 18 characters of intro per line, which breaks the brief’s own line-length rules. The loupe uses press-and-hold wherever `pointer: coarse`, whatever the width.

Deliberate grid breaks, each with its reason:
- **Frontispiece field: columns 2–11, centred.** It is the only centred page.
- **Plate IV field: all 12 columns, with the text in a band above it.** The sentence must lie on one line so that looking back is always leftward, and twenty pieces at the 18px floor need about 850–950px. When the measured row doesn’t fit, the plate switches to the vertical row automatically.
- **List of plates: columns 1–7,** so the leaders have length and the right side is left open, as on a contents page.

---

## 4. Page structure

```html
<body>
  <a class="skip" href="#plates">Skip to the plates</a>
  <canvas class="paper" aria-hidden="true"></canvas>          <!-- fixed, behind everything -->

  <header class="frontispiece">                                 <!-- banner -->
    <div class="field" data-field data-seed="1843">
      <h1>Anatomy of&nbsp;a&nbsp;Thought</h1>
      <p class="subtitle">What happens to one sentence …</p>
      <svg role="img" aria-labelledby="…"><title>A paper slip, pinned</title>…</svg>
    </div>
    <p class="imprint">Printed in cyanotype and code, 2026</p>
    <p class="hint">Scroll to begin</p>
  </header>

  <nav class="list-of-plates" aria-labelledby="list-title">…</nav>

  <main id="plates">
    <section class="plate" id="plate-1" aria-labelledby="plate-1-title" data-pin="150/90">
      <div class="plate__frame">                                <!-- what pins on desktop -->
        <div class="plate__text">
          <h2 id="plate-1-title"><span class="plate__number">Plate I</span> The specimen</h2>
          <p class="intro">…</p>
          <p class="note">…</p>
        </div>
        <figure class="plate__figure" data-loupe>
          <div class="field" data-field data-seed="1844">
            …figure: slips, SVG with role="img", title and desc…
            <div class="machine" aria-hidden="true">…League Gothic layer…</div>
            <button class="loupe-toggle" aria-pressed="false">Show the machine’s view</button>
          </div>
          <figcaption>Fig. 1. …</figcaption>
          <div class="machine-text visually-hidden">…a real table…</div>
        </figure>
      </div>
    </section>
    … plates 2–6 …
  </main>

  <footer>
    <section class="colophon" aria-labelledby="colophon-title">…</section>
    <section class="index" aria-labelledby="index-title">…</section>
  </footer>

  <p class="plate-indicator" aria-hidden="true">Plate III of VI</p>
</body>
```

- The `h2` contains “Plate I” and the title, so heading navigation reads “Plate I, The specimen”.
- The plate indicator is `aria-hidden`: it repeats what the headings already say.
- **Without JavaScript,** every text is present. Each figure shows a static form of its content: the slip, the table of pieces and IDs, “List the stars” open, the table of strongest threads, the likelihoods at T = 1 and the answer. The machine-text tables become visible. An inline script in `<head>` adds `js` (and `rm` under reduced motion) to `<html>` before first paint; everything animated is scoped under `.js`.

---

## 5. Wireframes

Symbols: `.~~~.` and `( )` mark a brushed field with ragged edges; `[word]` is a paper slip; `|12345|` is a ticker strip; `o` is a pin head; `{ }` is a sensitiser control. All marks are custom SVG; the ASCII only shows position.

### Frontispiece

Desktop (1440×900):
```
+------------------------------------------------------------------------------+
|                                                                              |
|        .~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~.       |
|       (                                                                )      |
|      (                            Anatomy                              )     |
|       (                         of a Thought                          )      |
|      (                                                                 )     |
|       (           What happens to one sentence between the            )      |
|      (              asking and the answer, in six plates.              )     |
|       (                                                               )      |
|      (                            o=====                               )     |
|       (                                                               )      |
|        '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~'       |
|                                                                              |
|                     Printed in cyanotype and code, 2026                      |
|                               Scroll to begin                                |
+------------------------------------------------------------------------------+
 field: columns 2-11, top 6svh to 80svh. Title 118px, subtitle 26px italic,
 emblem (a small slip, one pin) about 88x26px. The imprint and hint are ink on
 paper; both sit on the first screen.
```

Phone (390×844):
```
+------------------------------------+
|  .~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~.  |
| (                                ) |
|(            Anatomy               )|
| (         of a Thought           ) |
|(                                  )|
| (   What happens to one          ) |
|(    sentence between the asking   )|
| (   and the answer, in six       ) |
|(    plates.                       )|
| (           o=====               ) |
|  '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~'  |
|                                    |
|       Printed in cyanotype         |
|         and code, 2026             |
|         Scroll to begin            |
+------------------------------------+
 title 52px; the field is 72svh; the imprint is balanced so "2026" never
 stands alone.
```

### List of plates

Desktop:
```
+------------------------------------------------------------------------------+
|  List of plates                                                              |
|                                                                              |
|  The specimen ............................................ I                 |
|  Dissection .............................................. II                |
|  A chart of meaning ...................................... III               |
|  The threads of attention ................................ IV                |
|  The weighing ............................................ V                 |
|  The composing stick ..................................... VI                |
|                                                                              |
|  Colophon                                                                    |
|  Index                                                                       |
+------------------------------------------------------------------------------+
 columns 1-7. Entries at intro size; numerals right-aligned in their own
 column. Leader dots are SVG circles in prussian-wash, crossfading to ink on
 hover. Colophon and Index follow after a gap, with no leader or numeral.
```

Phone: the same list at 20px, full width, with shorter leaders.

### Plate I. The specimen

Desktop (odd plate: text left):
```
+------------------------------------------------------------------------------+
|  Plate I                      .~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~.  |
|  The specimen                (                                              ) |
|                               (   o                                     o  ) |
|  Here is our specimen, a     (   +---------------------------------------+ ) |
|  small riddle. You probably   (  |  The trophy doesn’t fit in the        |  )|
|  solved it without noticing. (   |  suitcase because it’s too big.       | ) |
|  The plates that follow show  (  |  What’s too big?                      |  )|
|  how a machine arrives at    (   +---------------------------------------+ ) |
|  the same answer.             (                                            )  |
|                               '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~'  |
|  It could mean the trophy or   Fig. 1. The specimen, a riddle of the kind    |
|  the suitcase. One word near   called a Winograd schema.                     |
|  the end decides which.                                                      |
+------------------------------------------------------------------------------+
 text: cols 1-4 | air: col 5 | field: cols 6-12. Slip text 34px, ink on paper;
 the slip is turned -0.6 degrees. The pins cross the slip edge: ink where they
 lie on the slip, paper where they lie on the blue.
```

Phone:
```
+------------------------------------+
| Plate I                            |
| The specimen                       |
|                                    |
| Here is our specimen, a small      |
| riddle. You probably solved it     |
| without noticing. The plates that  |
| follow show how a machine arrives  |
| at the same answer.                |
|  .~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~.  | <- figure pins here (90vh)
| (  o                         o   ) |
|(   | The trophy doesn’t fit  |    )|
| (  | in the suitcase because |   ) |
|(   | it’s too big. What’s    |    )|
| (  | too big?                |   ) |
|  '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~'  |
| Fig. 1. The specimen, a riddle of  |
| the kind called a Winograd schema. |
|                                    |
| It could mean the trophy or the    |
| suitcase. One word near the end    |
| decides which.                     |
+------------------------------------+
```

### Plate II. Dissection

Desktop (even plate: field left):
```
+------------------------------------------------------------------------------+
|  .~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~.          Plate II           |
| (   a     b        c       d    e     f    g     )        Dissection          |
| (   o     o        o       o    o     o    o      )                           |
| (  [The] [trophy] [doesn] [’t] [fit] [in] [the]   )       A machine can’t    |
| (  |4471||20931|  |5518|  |...                    )      read letters or     |
| (                                                  )      words. It reads     |
| (   h      i      j         k    l    m     n       )     pieces, called      |
| (  [suit] [case] [because] [it] [’s] [too] [big]    )     tokens. First the   |
| (  |...                                            )      sentence is cut     |
| (                                                  )      into pieces, and    |
| (   o   p      q    r     s     t                   )     each piece is       |
| (  [.] [What] [’s] [too] [big] [?]                  )     swapped for a       |
| (  |...                                            )      number.             |
| (                                                  )                          |
| (  Lay down a sentence of your own                  )     Doesn’t becomes two |
| (  {~~~~~~~~~~~~ sensitiser slip ~~~~~~~~~} {Expose} )    pieces, and so does |
| (                        {Show the machine’s view}  )     suitcase. …         |
|  '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~'                            |
|  Fig. 2. The specimen divided into twenty pieces.        Most pieces carry    |
|  Illustrative: every model cuts a little differently.     the space in front  |
|                                                           of them.            |
|                                                                              |
|                                                          (lens) Hold the     |
|                                                          loupe over a figure |
|                                                          to see what the     |
|                                                          machine sees.       |
+------------------------------------------------------------------------------+
 field: cols 1-7 | air: col 8 | text: cols 9-12.
 Before the cut, the sentence lies on two strips, "The trophy doesn’t fit in
 the suitcase" and "because it’s too big. What’s too big?", because twenty
 pieces at 20px do not fit one 729px line.
 After the cut, the pieces fall into three loose rows (7, 7, 6). Each slot is
 max(piece width, ticker width) plus a gap, so narrow pieces never collide
 with their neighbours' tickers.
 The letter labels a-t sit above each piece with a short leader. Tickers
 hang below.
```

Phone: the field is full width, the pieces fall into four or five rows, and the reader’s slip sits at the foot of the field. The text column’s notes and the loupe hint follow the caption.

### Plate III. A chart of meaning

Desktop (odd plate: text left):
```
+------------------------------------------------------------------------------+
|  Plate III                    .~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~.  |
|  A chart of meaning          (  [The][trophy][doesn][’t][fit][in][the]      ) |
|                               ( [suit][case][because][it][’s][too][big]    )  |
|  Each piece is given a place (  [.][What][’s][too][big][?]                   )|
|  on a vast chart. Pieces      (      +          .   The Laurel             )  |
|  that are used in similar    (    *     .    ,-*--*--.       +     .       )  |
|  ways end up close together.  (  .   +    *-'         *   .              )    |
|                              (       The Chest    .        *  The Rule   )    |
|  [stop caption slot]          (   *--*--*     .      +    *-*        .     )  |
|  Trophy lives among medal,   (        .   The Crowded Centre   ...        )   |
|  cup and prize.               (                        The Uncharted    )     |
|                               ( {Show the machine’s view}                )    |
|  (mark) List the stars        '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~'  |
|                                Fig. 3. A hand-drawn chart of a few hundred   |
|                                pieces in three dimensions. A real model’s    |
|                                chart has thousands of dimensions and no      |
|                                pictures.                                     |
+------------------------------------------------------------------------------+
 The three.js canvas is transparent and sits exactly over the field. Names
 are lettered along arcs in an HTML/SVG overlay, and each name is a real
 button. A faint graticule and a ruled border with degree ticks make it an
 atlas plate, not a starfield.
 The stop captions replace one another in the note slot. The Uncharted note
 appears under them only when the reader has uncharted pieces.
```

Phone: the field is square (full width) and only the names near the current stop are lettered. There is no drag; constellation names are tapped.

### Plate IV. The threads of attention

Desktop (full-width break):
```
+------------------------------------------------------------------------------+
|  Plate IV                                   [note slot, one at a time]       |
|  The threads of attention                   When it first appears, it can’t  |
|                                             know what it means. The clue     |
|  To understand a piece, the machine lets    hasn’t arrived yet.              |
|  it look back at every piece before it and                                   |
|  weigh which ones matter. Never ahead: a    All readers  Reader one  Reader  |
|  piece can only see what has already been   two  Reader three                |
|  read.                                      Several readers look at once, …  |
| .~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~. |
|(                   _____________________________________                    )|
|(         _________/_______________________              \      needle      )|
|(        /        /                        \              \      |          )|
|(  [The] [trophy] [doesn] … [suit] [case] [because] [it] [’s] [too] [big] . What ’s too big ? )|
|(                                                                            )|
|(  {Change big to small}                          +---------------------+   )|
|(                                                 |  .   it o ~~> trophy  |  )|
|(                         {Show the machine’s view}+---------------------+   )|
| '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~' |
|  Fig. 4. Where each piece looks while reading.   Fig. 4b. …                  |
|  Weights illustrative.                                                       |
+------------------------------------------------------------------------------+
 Band above: cols 1-6 hold the title and intro; cols 8-12 hold the note slot,
 the reader choices (ink italic, underlined when chosen) and their note.
 The row lies on a shallow smile curve, so the arcs have headroom.
 Pieces the machine hasn't read yet are lettered faintly in prussian-wash
 directly on the blue. When the needle reaches a piece, it is laid as a white
 slip.
 The inset Fig. 4b is framed by a paper hairline inside the field. Its
 caption sits on paper under the field, because 16px text is not allowed on
 blue.
```

Phone and Folio (when the row doesn’t fit):
```
+------------------------------------+
| Plate IV                           |
| The threads of attention           |
| Intro …                            |
|  .~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~.  | <- figure pins (180vh)
| ( [The]        )                 ) |
|(  [trophy] ----'   )             ) |
| ( [doesn]          |             ) |
|(  …                |             ) |
| ( [it]  -----------'             ) |
|(  [’s]                            )|
| ( [too]                          ) |
|(  [big] <needle                   )|
| (  …  (20 rows, 28px pitch)      ) |
|  '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~'  |
| [note slot, inside the pinned area]|
|  Fig. 4 …  {Change big to small}   |
|  readers, inset, Fig. 4b …         |
+------------------------------------+
 The threads bow out to the right, from the current piece up to earlier
 ones. The pinned area is the field plus the note slot, sized in svh so it
 survives the iOS toolbars.
```

### Plate V. The weighing

Desktop (odd plate: text left):
```
+------------------------------------------------------------------------------+
|  Plate V                      .~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~.  |
|  The weighing                (   [The] [  ?  ]                              ) |
|                               (  +=========================+               )  |
|  Now the machine must answer,(   | trophy  ================ ||92.5%|  ,---.  ) |
|  one piece at a time. It      (  |-------------------------|       /cool  \ )  |
|  gives every piece it knows a(   | suit    ==               ||5.1%| | dial |  ) |
|  score, turns the scores into (  |-------------------------|       \  hot / )  |
|  likelihoods, and chooses.   (   | cup     =          ||    ||0.8%|  `---'   ) |
|                               (  | prize   =          |     …       {lever}  )  |
|  Turn it down and the machine(   | bag / box / medal …     |      Drawn:     ) |
|  always takes the favourite.  (  +=========================+      trophy    )  |
|  Turn it up and it grows     (                            {Show the machine’s view})|
|  adventurous, and sometimes   '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~'  |
|  wrong.                        Fig. 5. The seven likeliest next pieces.      |
|                                Scores illustrative; a real model scores      |
|                                every piece it knows.                         |
+------------------------------------------------------------------------------+
 The table is a paper card lying on the field, so it stays white, like the
 slip on Plate I.
 On the card: ink rules (a double rule at the head, hairlines between rows),
 the candidate names in Old Standard, and bars as exposed prussian strips
 with brushed ends. A narrow column of hand tally strokes counts the last ten
 draws.
 The tickers with percentages hang off the card's right edge onto the blue.
 The dial and lever are sensitiser-coloured objects on the field.
```

Phone: the card is full width. The dial and lever sit side by side under the card, and the tally stays on the card.

### Plate VI. The composing stick

Desktop (even plate: field left):
```
+------------------------------------------------------------------------------+
|  .~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~.           Plate VI         |
| (   mini row: ▭▭▭▭▭▭▭▭▭▭▭▭▭▭▭▭▭▭▭▭ ▭  <- appended  )          The composing   |
| (     (threads above it re-thread once per loop)  )          stick           |
| (                                   .---.          )                          |
| (                     loop arrow   /     \         )         Each chosen piece|
| (    ____________________________ v______ \        )         is added to the  |
| (   | [The][ trophy][.][*]                 |__      )        end, and the     |
| (   |_______________________________________|     )         whole reading    |
| (                                                  )         runs again to    |
| (      The trophy.   (printed after toning)        )         choose the next. |
| (                        {Show the machine’s view} )         It stops when …  |
|  '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~'                            |
|  Fig. 6. The reply, set one piece at a time.                Four pieces, four |
|                                                             full readings.    |
|                                                             Five for suitcase.|
+------------------------------------------------------------------------------+
 The stick is drawn in paper line, in elevation. Sorts are paper blocks with
 a shoulder line and a nick, and the piece in ink on the face.
 A sort for a piece with a leading space has a blank shoulder on its left,
 echoing the cut on Plate II.
 The mini row is twenty small slip shapes with no letters, so it stays within
 the 18px-on-blue rule.
 [*] is the fleuron end mark.
```

Phone: the stick spans the field width, the mini row sits above it, and the answer below.

### Colophon and index

Desktop:
```
+------------------------------------------------------------------------------+
|  Colophon                                                                    |
|                                                                              |
|  This atlas was designed, written and built by Aditya.                      |
|  Every mark on these plates, each star, thread and letter, is drawn by      |
|  code; there are no photographs. The text is set in Old Standard, …         |
|  … Whether any of this amounts to a thought is a question for another       |
|  atlas.                                                                      |
|                                                                              |
|  Expose the atlas again                                                      |
|                                                                              |
|  Index                                                                       |
|                                                                              |
|  attention, IV                          one piece at a time, VI              |
|  attention head, see reader             reader, IV                           |
|  chart of meaning, III                  sampling, V                          |
|  constellation, III                     score, V                             |
|  embedding, III                         stopping, VI                         |
|  layer, IV                              temperature, V                       |
|  likelihood, V                          token, II                            |
|  logit, see score                       tokeniser, II                        |
+------------------------------------------------------------------------------+
 The colophon is set in cols 1-6 at body size. The index uses two CSS columns
 that read downwards, in cols 1-8. Each term is a link (ink, fine underline)
 to its plate; "see" is italic, as an index convention.
```

Phone: a single column for both.

### Fixed furniture

- **Plate indicator:** a small paper slip at the bottom left (inside the margin), 16px italic ink, turned 0.4°. A slip stays legible over paper and over blue, so no colour switching is needed.
- **Loupe:** a 168px lens replacing the cursor over `[data-loupe]` figures. The rim is a 1.5px paper line with a crescent of fine engraved hatching inside the upper-left edge.

---

## 6. Motion storyboards

Notation:
- **Approach** is the scroll before a pin, while the plate rises into view. Its percentages are the plate top’s position in the viewport.
- **Pin** ranges are in vh from the start of the pin, desktop values. Phone ranges scale to the phone pin lengths.
- **Seconds** mean time-based.

Every plate runs the same outline (brush and expose on approach, then the signature in the pin, then rest), with different seeds, stroke directions and exposure patterns, so no two plates print alike.

### Frontispiece: the one untriggered moment (time-based, about 3.0s)

| t (s) | Beat | Verb | Ease | Detail |
|---|---|---|---|---|
| 0 | Fonts ready, or 1.5s timeout | — | — | Blank paper only. The canvas draws paper; the field’s brush is 0. |
| 0.00–1.10 | Four strokes | brush | `brush` | Stroke durations are about 0.42, 0.38, 0.46 and 0.35s, starting at 0, 0.22, 0.47 and 0.70 (seeded jitter). They are broad and near-horizontal, and they overshoot the rectangle. Nothing is legible. |
| 0.85–2.55 | The field develops | expose | `develop` | Exposure 0 → 1, centre first and uneven (noise threshold). |
| 1.00–2.20 | The title holds yellow-green | expose | — | A sensitiser-coloured copy of the title (aria-hidden) is revealed with the brush, so the letters stay yellow-green while the field darkens around them. |
| 1.60–2.60 | The title washes white | expose | `develop` | The paper-coloured title (SplitText characters) fades in, centre out, each character’s delay set by its distance from the field centre. The subtitle follows 0.25s later. |
| 2.10 | The emblem’s pin | pin | `press` | The pin presses into the emblem slip; the slip itself appeared by exposure. |
| 2.30 / 2.62 | Imprint, then hint | set | `press` | Ink prints on paper: opacity with a fast-in, dead-stop curve. |

- **Skip:** any wheel, touchstart, pointerdown or keydown (except Tab) jumps the timeline to `progress(1)` at once.
- **Reduced motion:** the page renders developed and the sequence never runs.
- **Replay:** from the colophon, the seed goes up by one, so every exposure brushes a little differently, as real prints do.
- **Fallback for the two-copy title:** if the yellow-green letters read as a glitch in Phase 2 screenshots, drop the sensitiser copy and let the paper title emerge from the blue alone.

### List of plates

Static. Printed ink on paper does not animate on arrival. Only the reader’s responses move, listed in §7.

### Plate I. The specimen (pin 150vh)

| Range | Beat | Verb | Ease |
|---|---|---|---|
| Approach 100%→45% | Three horizontal strokes of sensitiser (seed 1844) | brush | `brush` |
| Approach 90%→40% | The intro develops, line by line, unevenly | expose | `develop` |
| Approach 60%→0% | The slip is laid: y −14px → 0, rotation −1.4° → −0.6° | pin | `settle` |
| Approach 30%→0% | Left pin, then right pin, pressed in (+jitter) | pin | `press` |
| Pin 0–60vh | The field exposes centre first. The slip and the pin shadows stay white. | expose | `develop` |
| Pin 30–55vh | The note develops | expose | `develop` |
| Pin 45–65vh | The caption develops | expose | `develop` |
| Pin 65–150vh | Rest. The riddle sits still. | — | — |

The long rest is deliberate: this is where the reader solves the riddle. It will be tuned in Phase 7.

### Plate II. Dissection (pin 250vh)

| Range | Beat | Verb | Ease |
|---|---|---|---|
| Approach 100%→40% | Diagonal strokes (seed 1845); the intro develops | brush | `brush` |
| Approach 70%→0% | A quick exposure. The two strips turn to silhouettes. | expose | `develop` |
| Pin 0–10vh | Breath | — | — |
| Pin 10–70vh | 19 dashed cut lines, left to right. Each draws at pen speed; the jittered gaps between them are the hand moving to the next cut. | cut | `hand` |
| Pin 70–85vh | The slip is cut: the dashes go, and the pieces part by 3–6px with a tiny jolt | cut | `press` |
| Pin 75–100vh | Note 1 develops (“Doesn’t becomes two pieces…”) | expose | `develop` |
| Pin 85–150vh | Flip: the pieces separate into three loose rows, turned ±0.8° | pin | `settle` |
| Pin 150–215vh | Per piece, jittered: pin pressed; letter set with a drawn leader; ticker feeds out from beneath | pin, set | `press`, `hand` |
| Pin 160–185vh | Note 2 develops (“Most pieces carry the space…”), once the gaps show the spaces | expose | `develop` |
| Pin 200–215vh | The caption develops | expose | `develop` |
| Pin 215–230vh | The reader’s slip is brushed onto the foot of the field | brush | `brush` |
| Pin 230–250vh | Rest; the input is live | — | — |

The reader’s sentence response is time-based; see §7.

### Plate III. A chart of meaning (pin 350vh)

three.js starts importing one screen before the plate (IntersectionObserver, `rootMargin: 100%`).

| Range | Beat | Verb | Ease |
|---|---|---|---|
| Approach | Vertical strokes (seed 1846); exposure; the twenty pieces lie on the field in Plate II’s three rows | brush, expose | `brush`, `develop` |
| Pin 0–15vh | Breath | — | — |
| Pin 15–70vh | Hand-off: each piece lifts (scale 1.03, rotation → 0) and travels to its star’s screen position (x on `hand`, y on `develop`, so the path curves). It shrinks, then fades over the last 30% while its star reveals. Pieces 1/7, 12/17, 13/18 and 14/19 converge on shared stars (see §10). | expose | `hand`, `develop` |
| Pin 20–60vh | The other ~500 stars reveal unevenly (per-star seeded thresholds) | expose | `develop` |
| Pin 60–85vh | Constellation lines draw, each at pen speed (`setDrawRange` on subdivided segments) | thread | `hand` |
| Pin 70–90vh | Names are lettered along their arcs, jittered | set | `press` |
| Pin 85–95vh | The reader’s words are ringed and labelled “yours”; unknown pieces set into The Uncharted | thread, set | `hand`, `press` |
| Pin 90–120 / 120–150vh | Camera to The Laurel / dwell: caption 1; trophy, medal, cup and prize labelled | — | `develop` |
| Pin 150–180 / 180–205vh | To The Chest / dwell: caption 2 | — | `develop` |
| Pin 205–235 / 235–260vh | To The Wardrobe / dwell: caption 3 | — | `develop` |
| Pin 260–285 / 285–305vh | To The Rule / dwell: caption 4 | — | `develop` |
| Pin 305–325 / 325–350vh | To The Crowded Centre / rest: caption 5. Drag and fly-to become live. | — | `develop` |

- The camera moves along a Catmull-Rom path through the stop poses. It only moves when the reader scrolls, and it never drifts on its own.
- Each stop’s dwell is a still page for reading.
- Captions replace each other: the old one fades in 150ms and the new one develops.

### Plate IV. The threads of attention (pin 300vh)

| Range | Beat | Verb | Ease |
|---|---|---|---|
| Approach | Long horizontal strokes across the full width (seed 1847); exposure; the sentence lettered faintly in prussian-wash | brush, expose | `brush`, `develop` |
| Pin 0–15vh | The needle arrives at piece 1; “The” is laid as a white slip | pin | `settle` |
| Pin 15–255vh | Twenty steps of about 11vh, with more room at “it” (14vh) and at the first “big” (18vh). In each step: 0–25% the needle moves and piece s is laid; 25–85% its threads draw back to earlier pieces, long arcs taking longer at pen speed; 85–100% hold. | pin, thread | `settle`, `hand` |
| During steps | The previous step’s threads fall to ghost opacity (0.16), then go at the next step. Only one piece’s threads are ever fully drawn. | expose | `develop` |
| Step 11 (it) | Note 1 develops | expose | `develop` |
| Step 14 (big) | Note 2 replaces note 1; the thread to trophy is the thickest drawn so far; the inset’s mark starts to drift | thread | `hand` |
| Step 18 | Note 3 replaces note 2 | expose | `develop` |
| Step 20 (?) | The threads reach back to the answer noun; the inset’s mark settles near trophy | thread | `hand` |
| Pin 255–300vh | Rest: the switch and readers are live | — | — |

Thread widths:
- Line work stays within hairline to 2px: width = 0.5 + 1.5 × √w px, and threads below w = 0.03 are not drawn.
- Weights of 0.3 or more get a second ply, a parallel strand 1.2px away, so dominance reads at a glance without breaking the 2px rule.

### Plate V. The weighing (pin 150vh)

| Range | Beat | Verb | Ease |
|---|---|---|---|
| Approach | Strokes (seed 1848); exposure reveals the card, dial and lever as silhouettes | brush, expose | `brush`, `develop` |
| Pin 0–20vh | “The” is set into the first slot; a blank slot waits beside it | set | `press` |
| Pin 10–35vh | The brass rules are set, head first; the candidate names are set row by row | set | `press` |
| Pin 35–105vh | Each bar exposes to its length at T = 1, its duration in proportion to its length; its ticker feeds out as the bar ends | weigh, set | `develop`, `press` |
| Pin 90–110vh | The note develops (plus the variant note when small) | expose | `develop` |
| Pin 105–120vh | The caption develops | expose | `develop` |
| Pin 120–150vh | Rest: the dial and lever are live | — | — |

### Plate VI. The composing stick (pin 250vh)

For big, four loops of about 50vh. For small, five loops, compressed to about 40vh each.

| Range | Beat | Verb | Ease |
|---|---|---|---|
| Approach | Strokes (seed 1849); exposure reveals the stick and the mini row | brush, expose | `brush`, `develop` |
| Pin 0–10vh | Breath | — | — |
| Loop n, 0–25% | The sort drops into the stick | set | `press` |
| Loop n, 25–60% | The loop arrow draws from the sort back to the end of the mini row | thread | `hand` |
| Loop n, 60–70% | A new small slip is appended to the mini row | pin | `settle` |
| Loop n, 70–95% | The mini threads re-thread in one fast sweep: the whole reading, again | thread | `hand` (fast pen) |
| Pin 160–180vh | The fleuron sort drops in. No loop follows: the reading has stopped. | set | `press` |
| Crossing 180vh | Toning is triggered and plays in time: 3.2s, radial from the centre, with a slightly noisy edge | tone | `tone` |
| Tone at ~70% | The answer is printed large in cream: “The trophy.” | set | `press` |
| Pin 200–250vh | Rest | — | — |

**Toning is time-based.** A bath takes the time it takes, and the reader has reached the end. Scrolling back above the trigger un-tones in 0.8s, because toning belongs to the story state (the end mark). Field exposure, by contrast, only ever increases (§8.4).

### Colophon and index

Static ink.
- **“Expose the atlas again”:** Lenis scrolls to the top (1.6s, `develop`), then the frontispiece replays with seed + 1.
- **Reduced motion:** the page jumps to the top and the frontispiece is shown developed.

---

## 7. Responses to the reader

All time-based, with durations varied per element (±12%). Under reduced motion, every row becomes a crossfade of 150ms or less.

| Trigger | Response | Verb | Duration | Ease |
|---|---|---|---|---|
| Hover or focus a list entry | Leader dots crossfade to ink, left to right | — | 120ms per dot, 8ms stagger ±3ms | `hand` |
| Click a list entry | Lenis `scrollTo` the plate | — | 1.2–1.6s by distance | `develop` |
| Hover a sensitiser control | A fine ink rule draws under the label | — | 160ms | `hand` |
| Press a sensitiser control | Pressed layer (sensitiser-deep) fades in; 1px press and recoil | set | 120ms + 120ms | `press` |
| Expose (Plate II) | Validate. Then the slip washes from sensitiser to paper (0.9s, `develop`); cut lines draw (pen speed); cut (0.2s); pieces part and settle into a row (Flip, 0.6s, `settle`); pins, letters and tickers (`press`, 300–450ms each, jittered stagger). Status: “Exposed. …” | expose, cut, pin, set | about 2.6s in all | as listed |
| Invalid sentence | The message is set under the slip; `aria-invalid` | set | 150ms | `press` |
| Clear | The reader’s pieces fade (220ms); the slip is brushed back to sensitiser (400ms) | brush | 0.6s | `brush` |
| Hover a star | Its word is set beside it | set | 140ms | `press` |
| Drag the chart (fine pointer, at rest) | Damped turn within ±12° yaw and ±6° pitch | — | lerp 0.08 | — |
| Activate a constellation name | Camera flies there. During the sequence, Lenis first scrolls to the rest, then flies. | — | 1.2–1.6s | `develop` |
| Change big to small | The words are re-set (220ms, `press`); the strongest threads swing to suit and case (700ms, `hand`); the old threads fall to a ghost (1.8s, `tone`); the inset mark drifts (900ms, `settle`); the label swaps; the announcement is made; `#small` goes into the URL | thread, set | about 1.8s | as listed |
| Choose a reader | The old threads fade (150ms); the new threads draw (fast pen, about 350ms) | thread | about 0.5s | `hand` |
| Temperature input | Bars re-weigh (240ms, `settle`); ticker numbers re-set (120ms, `press`) with no counting animation; the dial needle follows (180ms) | weigh | 240ms | `settle` |
| Drag the dial | Draggable rotation with inertia, snapped to 0.05 on release | weigh | — | — |
| Draw a piece | Lever pulled (180ms, `press`) and returned (420ms, `settle`); “Drawn: trophy” slip pinned (380ms, `settle`); one tally stroke drawn, the oldest faded (150ms) | pin | about 0.6s | as listed |
| Loupe over a figure | Lens follows (lerp 0.2); appears 150ms | — | — | — |
| Show the machine’s view | Whole machine layer revealed | expose | 200ms | `develop` |
| Plate indicator change | Crossfade | — | 150ms | — |

---

## 8. Technical plan

### 8.1 Boot order (`src/main.ts`)

1. **Read flags:** `?shots`, `?debug`, `?nogl`, and `prefers-reduced-motion` (also watched live).
2. **`state.init()`:** read `#small` and listen for `hashchange`.
3. **`background.init()`:** try WebGL2. On failure, or with `?nogl`, add `.no-gl` and use the CSS fallback.
4. **Fonts:** `Promise.race([document.fonts.ready, 1500ms])`.
5. **`scroll.init()`:** start Lenis (unless reduced motion), then build the **pin skeleton**: one ScrollTrigger per plate from `data-pin`, created at once. The document height is then final before any heavy plate code loads, which keeps CLS near 0 and makes `goTo` reliable.
6. **Initial chunk:** `frontispiece.init()`, `listOfPlates.init()` and `plateIndicator.init()`.
7. **Lazy plates:** an IntersectionObserver (`rootMargin: 100% 0px`) dynamically imports each plate one screen before it arrives. Each plate’s `init(ctx)` attaches its timeline to its existing pin trigger.
8. **Dev and shots:** `window.__atlas = { goTo, setVariant, ready, idle }` in dev and under `?shots`.
9. **Debug:** under `?debug`, `import('./debug/gui')`.

### 8.2 Modules

As in BRIEF §10, plus three small additions (marked *):

| Module | Job |
|---|---|
| `src/state.ts` | `variant`, `readerSentence`, `readerPieces`; `get`, `set`, `subscribe`; URL hash sync with `replaceState` (no scroll jump) |
| `src/motion/eases.ts` | CustomEase definitions, durations, `pen()`, `vary()`, pin lengths, seeds |
| `src/motion/scroll.ts` | Lenis + ScrollTrigger, the pin skeleton, `scrollToPlate()`, “paper offset” maths (§8.4) |
| `src/motion/reduced-motion.ts` | `gsap.matchMedia` conditions; switches between the live and still builds |
| `src/motion/random.ts`* | Seeded PRNG (mulberry32) behind `vary` and all hand-made irregularity |
| `src/boot.ts`* | Shared start-up for every page: CSS, flags, fonts, Lenis, the background, `?debug` |
| `src/gl/background.ts` (+ `.vert`/`.frag` via `?raw`) | Paper and fields; `createField()` returns a `FieldHandle` (`{ el, state: {brush, exposure, tone}, style, invalidate() }`) tweened by GSAP; render on demand; CSS fallback |
| `src/motion/verbs.ts`* | `setPress()` (the 1px recoil), pen-speed helpers |
| `src/components/marks.ts`* | Generates the hand-made marks: pins, slip cuts, torn and deckled edges, threads and stray fibres, leaders, the ␣ mark, the lens rim. Later: the needle, the fleuron, the dial, the lever, the stick, sorts, star symbols, the loop arrow, tally strokes |
| `src/components/piece.ts`* | A token slip with its pin, letter, leader and ticker; `pinPieces()` batches the layout read |
| `src/components/ticker.ts` | Ticker strip creation (seeded torn `clip-path` polygon, rotation) and `feedOut()` |
| `src/components/loupe.ts` | Lens, pointer and touch logic, toggles, hint |
| `src/components/plate-indicator.ts` | Watches the pins; crossfades the label |
| `src/plates/*.ts` | One per page; `init(ctx)` and `destroy()`, animations inside `gsap.context()` |
| `src/lib/tokeniser.ts`, `softmax.ts`, `hash.ts` | Pure, dependency-free, tested |
| `src/data/specimen.ts`, `vocab.ts` | Hand-authored data (below) |
| `scripts/vocab-place.mjs` | Dev-only helper: seeded placement and nearest-neighbour lines for words not placed by hand, printed as literal data and pasted into `vocab.ts`. The committed data is literal, not generated at runtime. |

`PlateContext = { root, trigger, field, mm, seed, reduced, phone }`.

### 8.3 Data

**`src/data/specimen.ts`**
- `PIECES.big` and `PIECES.small`: 20 × `{ text, display, letter }`.
  - `text` is canonical, with a leading `' '` and straight `'` (for example `" doesn"`, `"'t"`); it is what gets hashed.
  - `display` uses the curly `’`, with the leading space implicit in layout.
- `pieceId(text)` = `100 + fnv1a32(utf8(text)) % 99900`, giving 100–99,999, stable forever.
- `REPLY.big`: `The`, ` trophy`, `.`, END. `REPLY.small`: `The`, ` suit`, `case`, `.`, END.
- `READERS.big` and `READERS.small`: three 20×20 lower-triangular matrices, written out literally. `ALL` is their mean, computed.
- `SCORES.big` and `SCORES.small`, as in the brief.

**The story targets apply to the averaged view,** because that is the default the reader sees. Reader one alone must therefore over-state the story, since readers two and three dilute it. Sketch for row 14 (big):

| Reader | Weights | |
|---|---|---|
| Reader one | trophy .75, it .20, suit .02, case .01, self .02 | |
| Reader two | too .45, self .25, trophy .15, it .10, ’s .05 | |
| Reader three | because .40, it .25, trophy .20, self .15 | |
| **Average** | **trophy .367, it .183, too .150**, self .140, because .133 | Meets the brief |

**`src/data/vocab.ts`**
- About 520 entries `{ text, c, p: [x, y, z], mag }` across 15 constellations (25–45 each), plus The Uncharted as a region, not entries.
- Magnitude follows astronomical convention: 1 is brightest, for the commonest words.
- The words in the story (trophy, medal, cup, prize; case, box, bag, trunk; suit; big, small; it and the other small words) are placed by hand. The rest are placed by the helper and then adjusted.
- `LINES`: 5–12 index pairs per constellation, near neighbours only, never between constellations.
- `STOPS`: six camera poses (the overview and the five stops), each with a target, a distance and an angle.
- An end-mark star sits at the edge of The Crowded Centre, because the brief puts every reply piece on the chart.

**Tests (vitest):**
- **Tokeniser:** both specimens give exactly the §3 pieces; `’` and `'` behave the same; contractions and punctuation split; suitcase becomes suit + case; long words split into 3–5-letter chunks; output is capped at 40 pieces; the same input always gives the same output.
- **Hash:** the range holds; the specimen and reply IDs are unique and stable (snapshot).
- **Attention:**
  - Causal, for every reader and variant: `w[i][j] = 0` for all `j > i`.
  - Every row sums to 1 ± 1e-9.
  - Averaged row 14 (big): trophy is in [0.35, 0.45] and is the largest; it is second, in [0.15, 0.25].
  - Row 14 (small): suit + case is the largest share and it is the largest single other piece.
  - Row 11: the largest weight is below 0.25.
  - Row 20: the answer noun is the largest.
- **Softmax:** sums to 1; at T = 1 trophy is 0.925 ± 0.005; at T ≤ 0.05 the result is one-hot; stable with large scores.
- **Vocab:**
  - Size 400–600; 15 constellations of 25–45 words.
  - The required words are present, in the right constellations; “suitcase” is absent.
  - Lines per constellation are 5–12 and stay inside their constellation; magnitudes run 1–6.
  - big–small, hot–cold and up–down are each within a small distance.
  - Every Plate III caption word is on the chart.
- **HTML:** the static likelihoods written into `index.html` (for readers without JavaScript) match `softmax(T = 1)`, so the two can’t drift apart.

### 8.4 The background: how fields reach the shader

*Revised in Phase 1.* The plan at first had one fixed canvas draw the paper and up to two fields, positioned each frame from the scroll. That breaks wherever scrolling is native (every phone, and reduced motion on desktop): the compositor moves the text a frame or more before the main thread can redraw the canvas, so a field would visibly trail its own content. The as-built design keeps the brief’s one WebGL2 context and one fragment shader, but gives each field its own canvas.

**Two passes, one shader**
- **Paper pass (`uMode 0`).** The fixed, full-viewport `canvas.paper` sits behind all content (`z-index: -1`). Only `html` carries the `--paper` colour: a `body` background would paint over the canvas. DPR is capped at 2 (1.5 on `pointer: coarse`).
- **Field pass (`uMode 1`).** Each `.field` holds a `canvas.field__canvas` behind its content (inside the field’s own stacking context, bleeding `--field-bleed` past its edges for the overshoot). To draw a field, the shader renders it into a corner of the WebGL drawing buffer at the field’s size, and that region is copied with `drawImage` into the field’s canvas within the same task. The paper pass then redraws the whole buffer before the frame is shown.
- Because each field canvas lives in the DOM, it scrolls and pins with its content natively: no lag, no pin maths, no per-frame layout reads.

**Render on demand**
- A field is redrawn only when its `brush`, `exposure`, `tone` or style changes, or when it is resized. **A still field costs nothing while the page scrolls.**
- The paper is redrawn when the page scrolls (its grain travels with the page), on resize, and after any field pass.
- An IntersectionObserver (60% margin) keeps each field canvas at full size only near the viewport. Far off screen, it shrinks to 1×1 and is redrawn on return.
- A field larger than the drawing buffer renders at a reduced scale.

**Uniforms**
- Global: `uResolution`, `uScale` (device px per CSS px), `uPalette[9]` (read from the CSS tokens), `uPaperTune`, `uTune`.
- Paper: `uPaperOffset`. Later, the scroll module can hold the grain still under a pinned plate (`setPaperOffset`).
- Field: `uRect` (the field inside its canvas), `uState` (brush, exposure, tone, seed) and `uStyle` (angle, strokes, overshoot, centre bias).

**Shader outline**

All noise is gradient noise. Value noise showed its square lattice wherever it was thresholded.

1. **Paper.** A soft cloudy formation at two scales, plus faint fibres whose direction changes from region to region. Only ever darker than paper.
2. **The field edge.** A rectangle SDF, pushed in and out by noise stretched along the brush, with a slow undulation, and bristle hairs that are strong along some stretches and absent along others. The overshoot varies around the edge.
3. **Brush coverage.** 3–4 bands across the brush direction, laid one after another in alternating directions. Each band is revealed along its length with ragged bristle tips, frays at its edges, and runs dry past the far edge. Overlaps are a double coat and expose a little deeper. Each stroke carries a slightly different load.
4. **Exposure.** The whole sheet shifts from sensitiser through grey-green to blue, the centre ahead, mottled. Pigment pools along the strokes (deeper blue). Brush marks gather in clusters of varied width (lighter, towards wash), with a few dark ones.
5. **Tone.** A radial mask growing with `uTone`, with a noisy edge. Prussian becomes umber, with cream in the streaks.

Measured cost is not yet known on real hardware. The software renderer used for screenshots can’t measure it, so this is checked on real devices in Phase 8.

**Exposure only goes up**
- Field `brush` and `exposure` are scrubbed on the first pass but stay at their maximum (`state.exposure = max(current, progress)`): something the machine has processed stays processed.
- Story beats inside the plate stay reversible under scroll. `?shots` and `goTo` set field states directly.

**Resilience**
- On `webglcontextlost`, switch to the CSS fallback; on restore, rebuild.
- If frames average over 20ms for two seconds, first drop the render scale to 0.75, then switch to the fallback.

**CSS fallback**
- Each field element gets `background-color: color-mix(in srgb, var(--prussian) calc(var(--exposure) * 100%), var(--sensitiser))`.
- Its opacity follows `--brush`, and a seeded SVG mask gives it the ragged edge.
- Toning follows the same pattern with umber and cream.
- The same `FieldHandle` tweens drive it, so every sequence still reads.

### 8.5 Scroll and pins

**Setup**
- Lenis `{ lerp: 0.1, syncTouch: false }` (touch stays native), driven from the GSAP ticker with `lagSmoothing(0)`, exactly as in the brief.
- `ScrollTrigger.config({ ignoreMobileResize: true })`, and svh units throughout.

**What pins**
- **Desktop:** the plate frame (text and figure) pins. The frame is designed to fit 700px of height; below 700px the layout falls back to Folio (§3), so text is never cut off.
- **Phone and Folio:** the `figure` pins, and the text scrolls normally above and below. On Plate IV the note slot is part of the pinned area.

**Scrub and snapping**
- Scrub values follow the SCRUB token (0.6–1.0), kept low because Lenis already smooths.
- No snapping. It would fight the reader.

**Anchors and the hash**
- Links go to `#plate-1` … `#plate-6`, `#colophon` and `#index`. With JavaScript, clicks are intercepted and scrolled with Lenis, and the URL hash is left alone so that `#small` survives.
- No element ever has `id="small"`.

**`__atlas.goTo(plate, progress)`**
- Scrolls instantly to `pin.start + progress × (pin.end − pin.start)`.
- Under `?shots` scrub is set to `true`, so there is no lag, and the call resolves after two animation frames.
- For the frontispiece it seeks the load timeline instead.

### 8.6 Plate III: the chart and the DOM-to-WebGL hand-off

**Scene**
- A `PerspectiveCamera` with a narrow field of view (about 28°), for an engraved, near-orthographic look with a little depth.
- The canvas is transparent (`alpha: true`) and positioned exactly over the field.

**Stars**
- One `THREE.Points` with a `ShaderMaterial`. Per-star attributes: magnitude, reveal threshold and seed; plus a `uReveal` uniform and a small per-specimen-star reveal array.
- The fragment shader draws an engraved symbol from `gl_PointCoord`:
  - magnitudes 1–2: a dot, eight fine rays and a ring;
  - magnitudes 3–4: a dot and four rays;
  - magnitudes 5–6: a dot.
- Hard, antialiased edges in `--paper` (using derivatives), `NormalBlending` and `depthWrite: false`: no glow, no additive blending, no bloom.
- Point size depends on magnitude and is only lightly attenuated with distance, so symbols stay engraved when the camera is close.

**Lines**
- `LineSegments`, each line subdivided into eight segments with seeded jitter for the laid-thread wobble.
- `--paper` at `--o-constellation` opacity; WebGL’s 1px line is a true hairline.
- Lines are “drawn” by growing `setDrawRange` in step with pen speed.

**Names**
- For each constellation, an arc above its projected bounding circle.
- Each name is a `<button>` absolutely positioned at the arc’s midpoint. It contains an inline SVG `<textPath>` in italic, at 18px or more, and its `aria-label` is the plain name.
- Positions are recomputed only when the camera moves.

**The hand-off, step by step**

1. The overview camera pose is fixed until the hand-off ends. At `refresh`, each of the twenty pieces’ stars is projected with that pose into CSS pixels relative to the field. Those are the targets.
2. The DOM pieces start in Plate II’s three-row arrangement. It is the same layout function at the same field width, so the arrangement matches exactly.
3. In the scrubbed timeline, piece i moves from its slot to its target, shrinking to about 60%. Over the last 30% of its travel its opacity goes 1 → 0, while its star’s reveal goes 0 → 1 (alpha and a scale from 0.6 to 1) at the same screen position. The eye reads it as one object changing state.
4. Pieces with identical text converge on one star: both `too`s, both `’s`s and both `big`s. “The” and “the” go to two neighbouring stars, because they are different pieces with different IDs; see §10.
5. The camera starts to drift only after the last hand-off, so the targets never move under a piece in flight.
6. On resize, targets are recomputed at `refresh` and the scrubbed timeline is rebuilt (`invalidateOnRefresh`).

**Interaction at rest**
- **Drag** (fine pointers only): pointer events, not Draggable, so Plate III doesn’t load Draggable at all. Yaw is limited to ±12° and pitch to ±6°, damped at lerp 0.08.
- **Hover:** the pointer is compared with the projected positions (about 520 projections, computed only on pointer move); the nearest star within 12px has its label set.
- **Fly-to:** tweens the camera along the path to the constellation’s stop.

**Render loop**
- Renders only when the scroll progress, drag, fly-to, hover or size changes.
- An IntersectionObserver pauses the renderer entirely when the plate is off screen.

**The reader’s words**
- Pieces from `state.readerPieces` that match a star get an overlay ring (drawn with `hand`) and a “yours” label.
- Pieces that don’t match are set as open marks along The Uncharted, a dashed arc at the chart’s lower rim, and the Uncharted note develops in the text column.

**Fallbacks**
- `plate3-chart-svg.ts`, with no three.js, projects the same data with the same overview pose into an SVG. Stops become `viewBox` tweens.
- The SVG is used when WebGL fails, and when three.js hasn’t arrived by the time the pin passes 5%. In that case the plate keeps the SVG for the rest of the visit rather than swapping mid-sequence.
- The same projection draws the Plate IV inset (Fig. 4b), so the two charts agree.
- **Accessibility:** a “List the stars” `<details>` with an `h3` per constellation and its words.

### 8.7 Plates IV to VI in brief

**Plate IV**
- Pieces are DOM slips, measured once at refresh. Threads are SVG paths: cubic arcs whose height is proportional to |xᵢ − xⱼ|^0.85, capped.
- The pre-computed thread geometry carries seeded jitter from `simplex-noise`, so the fuzzy cotton costs no runtime filter.
- The static line work elsewhere shares one `feTurbulence` / `feDisplacementMap` filter.
- One thread set per step per view (All readers, and readers one to three) per variant is built lazily.
- `setVariant` rebuilds the current step’s set and keeps the old set as a ghost.
- The vertical layout is chosen by measuring whether the row fits the field, not by width alone.

**Plate V**
- Bars are SVG paths with a seeded brushed end. Their extent is an SVG attribute animated by GSAP.
- The dial is SVG with Draggable (`type: 'rotation'`, bounds −135° to +135° mapped to T 0 to 2, inertia). It writes to a real `<input type="range" min="0" max="2" step="0.05">` and dispatches `input`.
  - The input is visually hidden but focusable, and its focus ring is drawn around the dial through `:focus-visible` on a sibling.
  - Input changes rotate the dial unless a drag is in progress; a flag prevents feedback loops.
- Sampling uses the cumulative distribution with `Math.random`, or with the seeded PRNG under `?shots`.
- A live region announces, for example, “Drawn: trophy. In the last ten draws: trophy 8, suit 1, cup 1.”

**Plate VI**
- Everything on the field is SVG, so toning can animate `fill` and `stroke` attributes. The per-element delay is proportional to the element’s distance from the field centre, which matches the shader’s radial bath.
- The plate subscribes to `variant` and rebuilds its timeline on the same trigger.

### 8.8 The loupe, tickers and marks

**The loupe (fine pointers)**
- Each figure has a `.machine` sibling layer, ink on paper, laid out from the same geometry as the figure.
- On pointer move, target coordinates update, and the lens position is lerped at 0.2 in the GSAP ticker.
- The machine layer gets `clip-path: circle(60px at x y)` and `transform: scale(1.4)` with `transform-origin` at the pointer. The 60px local radius becomes 84px on screen, a 168px lens.
- The lens rim is a separate fixed SVG that follows the same lerped point.
- `cursor: none` applies only on `[data-loupe]` under `(pointer: fine)`.
- The brief explicitly asks for `clip-path` here. It is the one sanctioned exception to “animate transforms, opacity and SVG attributes only”.

**The loupe on touch**
- A hold of 350ms shows the lens 100px above the finger.
- Moving more than 8px before 350ms cancels, because that is a scroll.
- Once the lens is up, a non-passive `touchmove` listener prevents scroll.
- Figures get `-webkit-touch-callout: none; user-select: none`.
- If iOS proves unreliable, touch falls back to the toggle, and the hint text follows.

**The loupe for keyboards and screen readers**
- The “Show the machine’s view” toggle reveals the whole layer (`aria-pressed`, label “Hide the machine’s view” when on).
- Each figure is followed by a real `<table>` holding the machine’s view, visually hidden but always there for screen readers.

**Plate III’s machine layer** is a small dynamic block: the nearest star’s word, six coordinates in League Gothic, and “and thousands more” in Old Standard italic ink.

**Tickers**
- A span holding League Gothic numbers, with a seeded torn-end `clip-path` polygon and a seeded rotation of ±0.5°.
- `feedOut` moves it from `translateY(-100%)` inside an overflow-clipped holder under the piece. It feeds out from beneath the piece with `press`.

**Marks.** Every mark is generated SVG in `marks.ts`, with no icon fonts or libraries.

### 8.9 Accessibility

- **Landmarks:** banner (frontispiece), navigation (list of plates), main (plates), contentinfo (colophon and index).
- **Headings:** one `h1`; `h2` for each plate, the list, the colophon and the index; `h3` inside “List the stars”.
- **Figures:** each is a `figure` with a `figcaption`. SVG figures get `role="img"` with `title` and `desc`, and the machine-text table follows.
- **Live regions (polite):**
  - Plate II: the status and errors.
  - Plate IV: the variant announcement: “Now the suitcase is too small. The threads lead to suitcase.”, and when switching back, “Now the trophy is too big. The threads lead to trophy.”
  - Plate V: each draw.
- **Readers:** a radio group (`fieldset` with a visually hidden `legend`, “Readers”), styled as italic words.
- **Focus:** `:focus-visible` shows a 2px outline offset 3px, `--focus-on-field` on blue and `--focus-on-paper` on paper.
- **Focus order and hidden content:** focus order follows the page. Controls inside a pinned plate are always reachable. Content hidden before its beat stays in the accessibility tree (opacity, never `display: none`), so screen readers get the whole atlas in order.
- **Reduced motion:** no Lenis, no pins, no scrub; every plate is shown in its developed end state. Plate IV shows the final step with all three notes visible. Interactions use crossfades of 150ms or less. The loupe still works.
- **Axe and WebGL:** axe cannot see colours drawn by WebGL. On a field, text is paper-coloured over a transparent element above the canvas, so axe’s colour-contrast rule would report paper on paper. The shots script therefore:
  - runs **every** axe rule on every state in the `?nogl` render, where fields are real CSS colours in the same tokens;
  - runs every rule **except** `color-contrast` in the WebGL render.

  This is recorded here so it never looks like a hidden exemption.

### 8.10 Performance budget

Initial JavaScript, gzipped estimate:

| Part | Size |
|---|---|
| GSAP core | 28KB |
| ScrollTrigger | 18KB |
| CustomEase | 3KB |
| SplitText | 6KB |
| Lenis | 5KB |
| simplex-noise | 2KB |
| Boot, state, background, frontispiece, list, indicator | about 22KB |
| **Total** | **about 84KB**, against a budget of 180KB |

Loaded later:

| Chunk | Contents |
|---|---|
| Plate II | Flip (7KB) and DrawSVG (2KB) |
| Plate III | three.js (tree-shaken, about 130KB), outside the budget |
| Plate V | Draggable and Inertia (19KB) |
| `?debug` | lil-gui |

- **LCP:** the title’s sensitiser copy paints as soon as the brush reveals it, at about fonts plus 0.4s, and the canvas is not an LCP candidate.
- **CLS:** held near 0 by the pin skeleton being built at boot, and by the metric-matched font fallbacks.
- **Scroll:** zero layout reads per frame for fields, the shader samples baked textures, the three.js renderer pauses off screen, and nothing renders at rest.

### 8.11 QA harness (`scripts/shots.mjs`)

**Method**
- Build the site, then start `vite preview` through the Vite JS API on a free port, and stop it afterwards.
- For each viewport (1440×900 and 390×844), motion mode (normal and `reducedMotion: 'reduce'`) and render (GL, and `?nogl` for the contrast pass):
  1. load `/?shots`;
  2. await `__atlas.ready`;
  3. for each checkpoint, call `goTo` or the action, await `__atlas.idle()`, take a screenshot into `shots/<viewport>-<motion>-<checkpoint>.png`, and run axe.
- Console errors and warnings are collected.
- The script writes `shots/report.json` and exits non-zero on any violation or console error.

**Checkpoints**

| Page | Checkpoints |
|---|---|
| Frontispiece | 0, 0.35, 0.7, 1 |
| List of plates | At rest; one entry hovered |
| Plate I | 0, 0.5, 1 |
| Plate II | 0, 0.3 (cut lines), 0.45 (cut), 0.6 (separated), 0.85 (tickers), 1; reader sentence exposed; error shown; loupe over a piece (a synthetic pointer) |
| Plate III | 0, 0.2 (hand-off), each of the five stops, rest with the reader’s words and The Uncharted; the SVG fallback |
| Plate IV | Step at it, step at big, step at ?; small; readers one, two and three; the inset |
| Plate V | 0, 0.5, 1; T = 0; T = 2; after five draws |
| Plate VI | 0, loop 1, end mark, toned (big), toned (small) |
| Colophon and index | At rest |

### 8.12 Debug (`?debug`)

A lil-gui panel, dynamically imported, with controls for:
- the palette tokens, updating the CSS variables and the shader palette live;
- each ease’s control points;
- the pen speed, the scrub values and the Lenis lerp;
- for the field under the pointer: brush, exposure and tone sliders, the seed, stroke count and angle, noise scale, streak strength, overshoot and centre bias.

---

## 9. Accuracy review of the copy

Every line of copy in the brief was checked against BRIEF §8’s list of safe claims.

| Copy | Verdict |
|---|---|
| Plate II intro: “A machine can’t read letters or words. It reads pieces…” | Acceptable as teaching. Some tokenisers do have single-letter pieces, but the machine never receives letters as such. Keep. |
| “Most pieces carry the space in front of them.” | True of the common tokeniser families. Keep. |
| Plate III stops | These describe the chart’s fixed positions, which is correct for input embeddings. The Wardrobe’s “becomes luggage only once case arrives and the reading begins” speaks of the word, not of a position, so it holds. Keep. |
| Plate IV notes | Correct: attention looks back only; there are many layers; the “worked on by itself” step is the per-position block between rounds. Keep. |
| **Fig. 4b: “After the reading, it has moved. It now sits close to trophy.”** | **Not strictly right for this kind of model.** Reading is causal, so the working vector at it’s own position is computed before big exists and never changes afterwards. What moves towards trophy is the sense of it carried by the later pieces, from big onwards and above all at the final “?”, which is where the answer is chosen. **Resolved:** the revised caption and the two-mark inset in §13 replace it. |
| Plate V and VI copy | Correct: scores for every piece, a softmax, sampling, temperature, appending, stopping at the end mark. “Four pieces, four full readings” counts one full pass per chosen piece, which is correct. |
| Colophon | Honest about “thought” and about illustrative figures. Keep. |

---

## 10. Copy added or decided in this plan

- **Fig. 1 caption.** The brief gives none, but figures must be numbered in order, so Plate I needs one: “Fig. 1. The specimen, a riddle of the kind called a Winograd schema.” It is true, and it gives the curious reader a term to look up.
- **Apostrophes.**
  - The display text uses `’` everywhere: “doesn’t”, “it’s”, “What’s”, and the pieces “’t” and “’s”.
  - The data keeps the brief’s straight `'`, which is what gets hashed, so IDs stay stable.
  - The tokeniser treats `’` and `'` as the same character.
- **Leading spaces.** They are never drawn on the pieces themselves. They show in the loupe as `␣`, and on Plate II as the visible gap left of each piece after the cut.
- **“The” and “the” on the chart.** They are different pieces with different IDs, so they get neighbouring stars in The Crowded Centre. Merging them would contradict Plate II.
  - Rule: a piece maps to the star with exactly its text (without the leading space) when one exists, otherwise to its lowercase form.
  - Repeated identical pieces (too, ’s, big) share a star, which is correct.
- **A third error on Plate II:** “Keep it under forty pieces.” A 120-character sentence of punctuation could exceed the tokeniser’s 40-piece cap. It is in the same voice as the brief’s two errors.
- **Control labels:**
  - “Temperature”, with “cool” and “hot” at the ends.
  - “Draw a piece”, which leads to “Drawn: trophy”.
  - “Last ten draws”, the head of the tally column.
  - “Show the machine’s view”, which becomes “Hide the machine’s view”.
  - “List the stars”, “yours” and “Skip to the plates”.
- **Plate V tally.** Hand tally strokes per row, counting the last ten draws. The brief’s “tally” is taken literally; this puts observed counts beside expected likelihoods on the same row.
- **Plate VI.** The mini row carries no letters (it is a row of small slip shapes), so the 18px rule on blue holds.
- **Reader’s sentence.** It is not stored across visits. The brief asks for none, and the restrained choice is to keep nothing.

---

## 11. Risks and fallbacks

| Risk | Likelihood | Mitigation | Fallback |
|---|---|---|---|
| Background shader too heavy on integrated GPUs or phones | Medium | Fields redraw only when their state changes (never for scrolling); the paper pass is cheap; DPR caps; zero layout reads | Render scale 0.75, then the CSS fallback automatically (to build in Phase 8 if real devices need it) |
| Fields trailing their text on native scroll | Was certain with one fixed canvas | Each field draws into its own canvas inside the field (§8.4) | — |
| Two WebGL contexts at once (background and Plate III) | Low–medium | The background is idle while Plate III is pinned, because nothing on it changes | SVG chart |
| Lenis and pinning jitter, especially in Safari | Medium | ScrollTrigger’s default fixed pinning on the window scroller, `anticipatePin: 1`, testing in WebKit through Playwright | Disable Lenis in Safari only |
| iOS toolbar resizes re-triggering refreshes | High | `ignoreMobileResize`, svh units, pins sized in svh | — |
| DrawSVG on dashed cut lines: its dasharray fights the dash pattern | Certain | Draw a solid path inside a `<mask>` over the dashed path | Clip-rect growth for straight cuts |
| Flip inside a scrubbed timeline breaking on resize | Medium | Rebuild on `refreshInit`, with `invalidateOnRefresh` | Plain x/y tweens from a computed layout |
| The Plate IV row not fitting at 1100–1280px | Medium | Measure, and tighten slip padding to 10px | The vertical row, chosen by measurement |
| Plate frames taller than short laptop screens | Medium | Frames designed for 700px; the Folio layout below that | — |
| Old Standard hairlines breaking up in small white-on-blue text | Medium | Test in the Phase 1 style tile at DPR 1 and 2 | Regular in place of italic for field labels; 19px floor |
| three.js slow to arrive when the reader jumps to Plate III | Medium | Import one screen early; the field develops meanwhile | The SVG chart for the rest of the visit |
| Axe blind to WebGL colours | Certain | The `?nogl` contrast pass (§8.9) | — |
| The iOS long-press loupe conflicting with scroll and callouts | Medium | 8px movement threshold, callout off, non-passive `touchmove` only once active | The toggle, with the hint adjusted |
| New major versions (TypeScript 7.0, Vite 8.3, Vitest 5.0) at install time | Medium | Pin exact versions in Phase 1; check `?raw` imports and types first | Pin the previous majors (TypeScript 5.9, Vite 7, Vitest 3), after asking |
| SplitText with screen readers | Low | SplitText’s aria handling keeps the title’s accessible name; the sensitiser copy is `aria-hidden` | — |
| Toning in the DOM out of step with the shader | Low | Delays by distance from the centre; tuned in `?debug` | A uniform crossfade |
| Frontispiece LCP pushed past 2.5s by the sequence | Low | The sensitiser copy paints early; fonts preloaded | Paint the imprint first |

---

## 12. Review against BRIEF §9

I drafted the plan first, then read it line by line against §9 and CLAUDE.md’s Never list. These defaults had crept in. The sections above already contain the revisions.

| Drift | Why it’s a default | Revision |
|---|---|---|
| A small drawn arrow under “Scroll to begin”, nudging downwards | A cousin of the bouncing mouse icon and the appended “→” | Removed. The hint is plain text printed in ink, the same as the imprint. |
| Plate V sketched as a bar chart with a tinted header row, right-aligned percentages and gridlines | The pricing table and the SaaS chart | A paper card with brass rules set in, no tints or gridlines, exposed strips with brushed ends, numbers on tickers hanging off the card, and hand tally strokes |
| Plate III as a dark starfield with soft dots and slow ambient rotation | The “AI particles” and space-screensaver look; a network graph | Engraved star symbols with hard edges, a graticule and a ruled border with degree ticks, lines only between near neighbours inside a constellation, and no motion unless the reader scrolls or drags |
| Plate IV as the standard attention diagram: every row at once, arcs coloured by weight | The stock machine-learning figure | One piece’s threads at a time, a single colour, ply and width carrying weight within 2px, a needle as the reading mark, and a ghost exposure on the switch |
| Intro text fading up by 20px on each plate | Fade-and-slide-up on every section | Text never translates. It develops in place, opacity only, uneven by line, in step with the field. |
| Pieces on Plate II lifting and casting a shadow on hover | Hover lift and shadow | No hover response on things that aren’t controls. On figures, the loupe is the only hover affordance. |
| Sensitiser buttons with rounded corners and a drop shadow | The SaaS button | Slips of sensitised paper: cut corners, a deckled edge, italic ink labels; pressing uses `press`, and nothing has a shadow |
| “PLATE III” in small capitals above each title | The tracked-caps eyebrow | “Plate III” in italic sentence case, inside the `h2` |
| A side rail of dots for plate progress | Template navigation | A single paper slip reading “Plate III of VI” |
| `power2.out` used as the default in the first storyboards | The same eases everywhere | Every beat is mapped to one of the six custom eases and one of the eight verbs; durations vary by plate seed; lines follow pen speed |
| A “↺” glyph on “Expose the atlas again” | An icon on a link | Text only, ink with a fine underline |
| Hiding the loupe on phones | A shortcut, not a decision | Press and hold, as the brief says, with the toggle as fallback |
| A row highlight on hovered list entries | A generic hover state | Only the leader dots darken |
| The frontispiece as a centred block of title and subtitle | Close to the centred hero | It has no buttons and no call to action. The emblem, the imprint and the brushed field make it a title page, and it is the only centred page. |
| Animating CSS colour for hovers and states | Breaks the CLAUDE.md motion rule | Stacked layers crossfaded by opacity, or SVG `fill`/`stroke` attributes |
| The word “journey” in my own storyboard notes | A banned word creeping in | Removed. The brief’s copy was scanned for every banned word; none appear. |

Candidates for the “remove one element per plate” pass (Phase 8), noted now so each plate is built with them in mind:

| Page | Candidate |
|---|---|
| Frontispiece | The rule under the title |
| Plate I | The second pin’s shadow |
| Plate II | The leader lines on the letter labels |
| Plate III | The graticule |
| Plate IV | The second ply |
| Plate V | The column heads on the card |
| Plate VI | The shoulder line on the sorts |

---

## 13. Questions, resolved at the start of Phase 1

These answers override the brief’s draft copy.

1. **Fig. 4b.** Use the revised wording. The inset shows two marks: a faint ring where it stays in The Crowded Centre, and a mark that drifts to trophy (or suitcase), standing for the sense of it carried by the pieces after big. The caption: “Fig. 4b. By the question mark, the machine’s sense of it sits close to trophy. The first it stays put; it cannot see ahead.” In the variant, “trophy” becomes “suitcase”.
2. **The colophon credit.** Only the author’s name, with no mention of Claude. The first sentence reads: “This atlas was designed, written and built by Aditya.” The rest of the draft is unchanged.
