#version 300 es
// Paper and chemistry. One shader, two passes:
//   uMode 0 draws the paper across the fixed viewport canvas;
//   uMode 1 draws one brushed cyanotype field into that field's own canvas.
// All colours arrive from the CSS tokens through uPalette.

precision highp float;
precision highp int;

uniform int uMode;
uniform vec2 uResolution;   // device px of the region being drawn
uniform float uScale;       // device px per CSS px
uniform vec3 uPalette[9];   // paper, paper-shade, prussian-deep, prussian, wash, sensitiser, sensitiser-deep, umber, cream

uniform vec2 uPaperOffset;  // CSS px: how far the paper has travelled with the page
uniform vec3 uPaperTune;    // fibres, blotches, grain

uniform vec4 uRect;         // field rectangle in CSS px within its canvas (x, y, w, h)
uniform vec4 uState;        // brush, exposure, tone, seed
uniform vec4 uStyle;        // brush angle (rad), strokes, overshoot (px), centre bias
uniform vec4 uTune;         // edge roughness (px), streaks, unevenness, deep pockets

out vec4 outColor;

#define PAPER    uPalette[0]
#define SHADE    uPalette[1]
#define DEEP     uPalette[2]
#define PRUSSIAN uPalette[3]
#define WASH     uPalette[4]
#define SENS     uPalette[5]
#define UMBER    uPalette[7]
#define CREAM    uPalette[8]

uint hash3(uvec3 v) {
  v = v * 1664525u + 1013904223u;
  v.x += v.y * v.z; v.y += v.z * v.x; v.z += v.x * v.y;
  v ^= v >> 16u;
  v.x += v.y * v.z; v.y += v.z * v.x; v.z += v.x * v.y;
  return v.x ^ v.y ^ v.z;
}

float rnd(ivec2 c, float seed) {
  return float(hash3(uvec3(uvec2(c), uint(seed)))) * (1.0 / 4294967295.0);
}

// Gradient noise, remapped to about [0, 1]. Value noise shows its square lattice
// wherever it is thresholded; gradient noise has no such grid.
vec2 gradient(ivec2 c, float seed) {
  float a = rnd(c, seed) * 6.2831853;
  return vec2(cos(a), sin(a));
}

float noise2(vec2 p, float seed) {
  vec2 i = floor(p);
  vec2 f = p - i;
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  ivec2 c = ivec2(i);
  float a = dot(gradient(c, seed), f);
  float b = dot(gradient(c + ivec2(1, 0), seed), f - vec2(1.0, 0.0));
  float d = dot(gradient(c + ivec2(0, 1), seed), f - vec2(0.0, 1.0));
  float e = dot(gradient(c + ivec2(1, 1), seed), f - vec2(1.0, 1.0));
  return clamp(0.5 + 1.06 * mix(mix(a, b, u.x), mix(d, e, u.x), u.y), 0.0, 1.0);
}

const mat2 OCTAVE = mat2(0.8, 0.6, -0.6, 0.8);

float fbm3(vec2 p, float seed) {
  float s = 0.0;
  float a = 0.5;
  for (int i = 0; i < 3; i++) {
    s += a * noise2(p, seed + float(i) * 19.0);
    p = OCTAVE * p * 2.02 + 7.3;
    a *= 0.5;
  }
  return s / 0.875;
}

mat2 rot(float a) {
  float c = cos(a);
  float s = sin(a);
  return mat2(c, s, -s, c);
}

// Paper held up to the light: a soft cloudy formation, and a few faint fibres whose
// direction changes from one region to the next. Only ever darker than paper.
float fibreSet(vec2 p, float angle, float seed) {
  float f = noise2(rot(angle) * p * vec2(0.8, 0.05), seed);
  return smoothstep(0.8, 0.95, f);
}

vec3 paper(vec2 p) {
  float cloud = fbm3(p * 0.012, 3.0) * 0.6 + fbm3(p * 0.0035, 5.0) * 0.4;
  float region = noise2(p * 0.0025, 7.0);
  float fibres = fibreSet(p, 0.4, 11.0) * smoothstep(0.35, 0.6, region)
    + fibreSet(p, 1.9, 23.0) * smoothstep(0.65, 0.4, region)
    + fibreSet(p, -0.9, 29.0) * smoothstep(0.3, 0.7, noise2(p * 0.0021, 13.0)) * 0.7;
  vec3 c = mix(PAPER, SHADE, clamp((cloud - 0.42) * uPaperTune.y, 0.0, 1.0));
  c = mix(c, SHADE, clamp(fibres, 0.0, 1.0) * uPaperTune.x);
  c += (rnd(ivec2(gl_FragCoord.xy), 5.0) - 0.5) * uPaperTune.z;
  return c;
}

vec4 field(vec2 p) {
  float seed = uState.w;
  vec2 halfSize = uRect.zw * 0.5;
  vec2 q = p - (uRect.xy + halfSize);
  float ang = uStyle.x;
  vec2 b = rot(-ang) * q;           // brush space: x runs along the stroke
  float over = uStyle.z;
  float rough = uTune.x;

  // The outline: a rectangle pushed in and out by noise stretched along the brush,
  // overshooting its edges unevenly.
  vec2 d2 = abs(q) - halfSize;
  float sd = length(max(d2, 0.0)) + min(max(d2.x, d2.y), 0.0);
  float edgeN = fbm3(vec2(b.x * 0.011, b.y * 0.09), seed + 1.0) - 0.5;
  // Bristle hairs are strong along some stretches of edge and absent along others.
  float hairy = smoothstep(0.3, 0.8, noise2(b * 0.008, seed + 4.0));
  float bristle = (noise2(vec2(b.x * 0.004, b.y * 0.55), seed + 2.0) - 0.5) * (0.35 + hairy * 1.3);
  float wave = fbm3(b * 0.0035, seed + 81.0) - 0.5;   // long, slow undulation of every edge
  float overshoot = over * (0.3 + 0.7 * noise2(b * 0.006, seed + 3.0));
  sd += edgeN * rough * 2.0 + bristle * rough * 0.8 + wave * rough * 3.2 - overshoot;
  float aa = 1.0 / uScale;
  float shape = 1.0 - smoothstep(-aa, aa, sd);
  if (shape <= 0.0) return vec4(0.0);

  // Strokes: bands across the brush direction, laid one after another in
  // alternating directions, each revealed along its length as the brush travels.
  float n = max(uStyle.y, 1.0);
  vec2 ext = vec2(
    abs(halfSize.x * cos(ang)) + abs(halfSize.y * sin(ang)),
    abs(halfSize.x * sin(ang)) + abs(halfSize.y * cos(ang))
  ) + over + rough * 2.0;
  float bandH = 2.0 * ext.y / n;
  float share = 0.55;               // each stroke's share of the brush time
  float density = 0.0;
  float coverSum = 0.0;             // where strokes overlap, the coat is double
  float strokeTone = 0.5;           // each stroke carries a slightly different load
  for (int k = 0; k < 6; k++) {
    float fk = float(k);
    if (fk >= n) break;
    float start = n > 1.0 ? fk * (1.0 - share) / (n - 1.0) : 0.0;
    float t = clamp((uState.x - start) / share, 0.0, 1.0);
    if (t <= 0.0) continue;
    t = 1.0 - pow(1.0 - t, 1.6);

    float centre = -ext.y + (fk + 0.5) * bandH;
    // A stroke's edge drifts a little and frays into bristle lines; it does not ripple.
    float wobble = (noise2(vec2(b.x * 0.004, fk * 3.1), seed + 5.0 + fk) - 0.5) * bandH * 0.12;
    float fray = (noise2(vec2(b.x * 0.003, b.y * 0.45), seed + 6.0 + fk) - 0.5) * 7.0;
    float dv = abs(b.y - centre + wobble) - bandH * 0.62 + fray;
    if (k == 0 || fk == n - 1.0) dv -= over * 2.0;
    float inBand = 1.0 - smoothstep(-4.0, 4.0, dv);

    float dir = mod(fk, 2.0) < 0.5 ? 1.0 : -1.0;
    float s = b.x * dir;
    float front = -ext.x + t * ext.x * 2.0;
    float tips = (noise2(vec2(b.y * 0.22, fk * 7.0), seed + 9.0) - 0.5) * 38.0;
    float along = 1.0 - smoothstep(-10.0, 10.0, s - front - tips);

    // The brush runs dry past the far edge: streaky and thin, mostly in the overshoot.
    float dry = smoothstep(ext.x - over - 40.0, ext.x, s);
    float streak = noise2(vec2(s * 0.01, b.y * 0.5), seed + 13.0 + fk);
    float dens = 1.0 - dry * smoothstep(0.35, 0.8, streak) * 0.55;
    float c = inBand * along * dens;
    coverSum += inBand * along;
    if (c > density) {
      density = c;
      strokeTone = rnd(ivec2(k, 3), seed);
    }
  }
  float alpha = shape * density;
  if (alpha <= 0.0) return vec4(0.0);

  // Exposure: a noise-thresholded mix, centre first and uneven.
  vec2 nq = q / max(halfSize, vec2(1.0));
  float r = length(nq) * 0.8;
  float bias = uStyle.w;
  float uneven = uTune.z;
  // The whole sheet shifts from yellow-green through grey-green to blue, the centre
  // ahead, mottled rather than smooth: chemistry, not an airbrush, and not speckle either.
  float en = fbm3(b * 0.0055, seed + 21.0);
  float mottle = noise2(b * 0.035, seed + 71.0) * 0.6 + noise2(b * 0.11, seed + 73.0) * 0.4;
  float x = uState.y * (1.35 + bias * 1.2 + uneven) - r * bias - en * uneven - mottle * 0.3;
  float dev = smoothstep(0.0, 0.32, x);

  // Sensitiser pools along the strokes, so the deepest blues are long and streaky.
  float pocket = smoothstep(0.55, 0.86, fbm3(vec2(b.x * 0.0025, b.y * 0.014) + 11.0, seed + 31.0));
  // Brush marks gather in some places and not others, and vary in width.
  float cluster = smoothstep(0.42, 0.85, noise2(vec2(b.x * 0.0016, b.y * 0.011), seed + 61.0));
  float fineMarks = smoothstep(0.68, 0.96, noise2(vec2(b.x * 0.003, b.y * 0.2), seed + 41.0));
  float broadMarks = smoothstep(0.72, 0.96, noise2(vec2(b.x * 0.0018, b.y * 0.06), seed + 43.0));
  float streakL = clamp((fineMarks * 0.55 + broadMarks) * cluster, 0.0, 1.0);
  float darkMarks = smoothstep(0.74, 0.97, noise2(vec2(b.x * 0.0024, b.y * 0.13), seed + 47.0))
    * smoothstep(0.5, 0.9, noise2(vec2(b.x * 0.0014, b.y * 0.009), seed + 67.0));
  float overlap = smoothstep(1.05, 1.7, coverSum);

  vec3 blue = strokeTone > 0.5
    ? mix(PRUSSIAN, DEEP, (strokeTone - 0.5) * 0.3)
    : mix(PRUSSIAN, WASH, (0.5 - strokeTone) * 0.1);
  blue = mix(blue, DEEP, clamp(pocket * uTune.w + overlap * 0.1 + darkMarks * 0.22, 0.0, 0.6));
  blue = mix(blue, WASH, streakL * uTune.y);
  // Part-exposed sensitiser passes through a grey-green on its way to blue.
  vec3 col = mix(SENS, blue, dev);

  // Toning: blue gives way to umber, spreading from the centre like a bath.
  float tone = uState.z;
  if (tone > 0.0) {
    float tn = fbm3(b * 0.007, seed + 51.0);
    float tx = tone * 1.9 - length(nq) * 0.8 - tn * 0.35;
    float tm = smoothstep(0.0, 0.25, tx);
    vec3 umber = mix(UMBER, CREAM, streakL * uTune.y * 0.6);
    col = mix(col, umber, tm);
  }

  return vec4(col * alpha, alpha);
}

void main() {
  vec2 p = vec2(gl_FragCoord.x, uResolution.y - gl_FragCoord.y) / uScale;
  if (uMode == 0) {
    outColor = vec4(paper(p + uPaperOffset), 1.0);
  } else {
    outColor = field(p);
  }
}
