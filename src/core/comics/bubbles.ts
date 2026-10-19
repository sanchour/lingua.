// A comic page's speech bubbles from what OCR found: its paragraphs, cleaned of noise (bits of the
// drawing read as letters), the all-capitals lettering of comics turned into ordinary sentences,
// pieces of one bubble joined, and put in reading order (right to left for manga and Arabic).

export interface OcrBox {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface OcrParagraph {
  text: string;
  confidence: number;
  bbox: OcrBox;
  lines?: Array<{ text: string; bbox: OcrBox }>;
}

export interface Bubble {
  text: string;
  /** Where it sits on the page: [x, y, width, height], each 0–1. */
  box: [number, number, number, number];
}

/** Languages whose comics are read right to left. */
const RTL = new Set(['ja', 'ar', 'fa', 'he', 'ur']);
/** Written without spaces between words: lines join without one. */
const UNSPACED = new Set(['ja', 'zh', 'yue', 'th']);
/** Where capitals carry meaning (German nouns): capitals stay as lettered. */
const KEEP_CASE = new Set(['de', 'lb']);

const LETTER = /\p{L}/gu;

/** Joins a paragraph's lines: a word broken with a hyphen at a line's end comes back together. */
export function joinLines(lines: string[], lang: string): string {
  const glue = UNSPACED.has(lang) ? '' : ' ';
  let out = '';
  for (const raw of lines) {
    const line = raw.replace(/\s+/g, ' ').trim();
    if (!line) continue;
    if (!out) out = line;
    // "tré-" + "sor", or in comic capitals "TESO-" + "RO".
    else if ((/\p{Ll}-$/u.test(out) && /^\p{Ll}/u.test(line)) || (/\p{Lu}-$/u.test(out) && /^\p{Lu}/u.test(line))) out = out.slice(0, -1) + line;
    else out += glue + line;
  }
  return out;
}

/**
 * COMICS ARE LETTERED IN CAPITALS: made into sentences, so words read and look up as usual. With
 * `isWord` (the language's dictionary), a word it doesn't know keeps its capital: likely a name.
 */
export function sentenceCase(text: string, lang: string, isWord?: (lower: string) => boolean): string {
  if (KEEP_CASE.has(lang)) return text;
  const cased = text.match(/[\p{Lu}\p{Ll}]/gu) ?? [];
  if (cased.length < 3) return text;
  const upper = cased.filter((c) => c === c.toLocaleUpperCase(lang) && c !== c.toLocaleLowerCase(lang)).length;
  if (upper / cased.length < 0.8) return text;
  let out = text.toLocaleLowerCase(lang).replace(/(^|[.!?…¡¿]\s*|^["«“„‹—–-]\s*)(\p{Ll})/gu, (_, before: string, c: string) => before + c.toLocaleUpperCase(lang));
  if (isWord) out = out.replace(/[\p{L}\p{M}]+/gu, (w) => (w.length < 2 || w !== w.toLocaleLowerCase(lang) || isWord(w) ? w : w.charAt(0).toLocaleUpperCase(lang) + w.slice(1)));
  if (lang === 'en') out = out.replace(/\bi\b/g, 'I').replace(/\bi'/g, "I'");
  return out;
}

/** Bits of the drawing read as letters: too unsure, too short, or mostly not letters. */
export function isNoise(text: string, confidence: number): boolean {
  const letters = text.match(LETTER)?.length ?? 0;
  const visible = text.replace(/\s/g, '').length;
  if (letters < 2 || confidence < 50) return true;
  if (letters / Math.max(1, visible) < 0.6) return true;
  // A letter or two repeated ("III", "ll") is usually lines in the art.
  return /^(\p{L})\1*$/u.test(text.replace(/[^\p{L}]/gu, '')) && letters < 4;
}

interface Piece {
  text: string;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  lineHeight: number;
}

const overlapX = (a: Piece, b: Piece) => Math.max(0, Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0)) / Math.max(1, Math.min(a.x1 - a.x0, b.x1 - b.x0));

/** The page's bubbles from OCR paragraphs, in reading order. `w`, `h`: the image OCR read. */
export function bubblesFrom(paragraphs: OcrParagraph[], w: number, h: number, lang: string, isWord?: (lower: string) => boolean): Bubble[] {
  let pieces: Piece[] = [];
  for (const p of paragraphs) {
    const lines = p.lines?.length ? p.lines.map((l) => l.text) : p.text.split('\n');
    const text = joinLines(lines, lang);
    if (!text || isNoise(text, p.confidence)) continue;
    const lineCount = Math.max(1, p.lines?.length ?? lines.filter((l) => l.trim()).length);
    pieces.push({ text, ...p.bbox, lineHeight: (p.bbox.y1 - p.bbox.y0) / lineCount });
  }

  // One bubble read as two paragraphs: one just under the other and in the same column.
  pieces.sort((a, b) => a.y0 - b.y0);
  const merged: Piece[] = [];
  for (const p of pieces) {
    const above = merged.find((m) => p.y0 - m.y1 < Math.max(m.lineHeight, p.lineHeight) * 0.9 && p.y0 >= m.y0 && overlapX(m, p) > 0.5);
    if (above) {
      above.text = joinLines([above.text, p.text], lang);
      above.x0 = Math.min(above.x0, p.x0);
      above.x1 = Math.max(above.x1, p.x1);
      above.y1 = Math.max(above.y1, p.y1);
    } else merged.push({ ...p });
  }
  pieces = merged;

  // Reading order: rows from the top, and across each row in the language's direction.
  const rows: Piece[][] = [];
  for (const p of pieces) {
    const row = rows[rows.length - 1];
    if (row && p.y0 < row[0].y0 + Math.max(h * 0.03, Math.min(row[0].y1 - row[0].y0, p.y1 - p.y0) * 0.5)) row.push(p);
    else rows.push([p]);
  }
  const rtl = RTL.has(lang);
  const pad = 0.006;
  return rows
    .flatMap((row) => row.sort((a, b) => (rtl ? b.x1 - a.x1 : a.x0 - b.x0)))
    .map((p) => {
      const x = Math.max(0, p.x0 / w - pad);
      const y = Math.max(0, p.y0 / h - pad);
      return {
        text: sentenceCase(p.text, lang, isWord),
        box: [x, y, Math.min(1 - x, (p.x1 - p.x0) / w + pad * 2), Math.min(1 - y, (p.y1 - p.y0) / h + pad * 2)] as [number, number, number, number],
      };
    });
}
