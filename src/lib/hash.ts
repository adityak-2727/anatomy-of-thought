// FNV-1a over UTF-8 bytes. Used for the specimen's illustrative IDs and for seeding.

const encoder = new TextEncoder();

export function fnv1a32(text: string): number {
  let h = 0x811c9dc5;
  for (const byte of encoder.encode(text)) {
    h ^= byte;
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** An illustrative token ID in 100–99,999, stable forever for the same piece text. */
export function pieceId(text: string): number {
  return 100 + (fnv1a32(text) % 99900);
}
