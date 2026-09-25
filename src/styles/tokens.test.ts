import { describe, expect, it } from 'vitest';
import tokens from './tokens.css?raw';

// The palette exactly as BRIEF §4 gives it.
const BRIEF = {
  '--paper': '#EDEFE8',
  '--paper-shade': '#DADFD6',
  '--prussian-deep': '#0F2C54',
  '--prussian': '#1C4A82',
  '--prussian-wash': '#6E8FB8',
  '--sensitiser': '#D8D08A',
  '--sensitiser-deep': '#B9AE5E',
  '--tone-umber': '#4A3228',
  '--tone-cream': '#E6D6BA',
};

function readPalette(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of tokens.matchAll(/(--[a-z-]+):\s*(#[0-9A-Fa-f]{6})\s*;/g)) out[m[1]] = m[2].toUpperCase();
  return out;
}

function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe('tokens.css', () => {
  const palette = readPalette();

  it('holds exactly the nine colours of the brief, and no others', () => {
    expect(palette).toEqual(BRIEF);
  });

  it('keeps the text pairings the brief relies on', () => {
    expect(contrast(palette['--paper'], palette['--prussian'])).toBeGreaterThan(7.6);
    expect(contrast(palette['--prussian-deep'], palette['--paper'])).toBeGreaterThan(11.9);
    expect(contrast(palette['--sensitiser'], palette['--prussian'])).toBeGreaterThan(5.5);
    expect(contrast(palette['--prussian-deep'], palette['--sensitiser'])).toBeGreaterThan(4.5);
    expect(contrast(palette['--tone-cream'], palette['--tone-umber'])).toBeGreaterThan(4.5);
  });

  it('never allows black or near-black', () => {
    for (const hex of Object.values(palette)) expect(luminance(hex)).toBeGreaterThan(0.01);
  });
});

describe('source files', () => {
  // Colours come only from tokens.css (CLAUDE.md). Everything else must use the tokens.
  const sources = import.meta.glob(['../**/*.{ts,css,glsl}', '!../**/*.test.ts', '!./tokens.css'], {
    query: '?raw',
    import: 'default',
    eager: true,
  }) as Record<string, string>;

  it('contain no hard-coded hex colours', () => {
    const offenders = Object.entries(sources)
      .filter(([, text]) => /#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?(?:[0-9a-fA-F]{2})?\b/.test(text.replace(/url\(#[^)]*\)/g, '')))
      .map(([file]) => file);
    expect(offenders).toEqual([]);
  });

  it('were found', () => {
    expect(Object.keys(sources).length).toBeGreaterThan(10);
  });
});
