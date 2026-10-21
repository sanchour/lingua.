// A printed page read by OCR (5.1-3a, "photos of a book's pages"): the lines Tesseract found become
// the text's paragraphs. Its own paragraphs aren't trusted (it splits them mid-word); lines are put
// back together by where they sit: a paragraph ends at a wider gap, an indent, a jump to another
// column, or a short line that ends a sentence. A word broken over two lines is mended, and what was
// read with little certainty (a thumb, a page number, the facing page's edge) is left out.

export interface OcrLine {
  text: string;
  /** Tesseract's certainty, 0–100. */
  confidence: number;
  bbox: { x0: number; y0: number; x1: number; y1: number };
}

/** Languages written without spaces: their lines join with nothing between. */
const UNSPACED = new Set(['zh', 'ja', 'th', 'yue']);

/** One paragraph's lines as running text: "Lin-" + "guist" → "Linguist". */
export function joinLines(lines: string[], lang: string): string {
  let out = '';
  for (const raw of lines) {
    const line = raw.replace(/\s+/g, ' ').trim();
    if (!line) continue;
    if (!out) out = line;
    // A hyphen at a line's end before a small letter splits a word (not "Nord-" + "Süd").
    else if (/\p{L}[-‐­]$/u.test(out) && /^\p{Ll}/u.test(line)) out = out.slice(0, -1) + line;
    else out += UNSPACED.has(lang) ? line : ` ${line}`;
  }
  return out;
}

/** The value `share` of the way up the sorted list (0.5: the median). */
const percentile = (values: number[], share: number) => {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * share))];
};
const median = (values: number[]) => percentile(values, 0.5);

/** The page's paragraphs worth keeping, in reading order. */
export function pageParagraphs(found: OcrLine[], lang: string): string[] {
  const lines = found.filter((l) => l.confidence >= 50 && l.text.trim());
  if (!lines.length) return [];
  const height = median(lines.map((l) => l.bbox.y1 - l.bbox.y0)) || 1;
  const gaps = lines.slice(1).flatMap((l, i) => (l.bbox.y0 > lines[i].bbox.y0 ? [l.bbox.y0 - lines[i].bbox.y1] : []));
  const gap = gaps.length ? Math.max(0, median(gaps)) : height / 2;
  // The column's right edge, where full lines end; a paragraph's last line stops short of it.
  const right = percentile(
    lines.map((l) => l.bbox.x1),
    0.9,
  );

  const groups: OcrLine[][] = [];
  lines.forEach((line, i) => {
    const prev = lines[i - 1];
    const breaks =
      !prev ||
      line.bbox.y0 < prev.bbox.y0 || // another column or block, higher up
      line.bbox.y0 - prev.bbox.y1 > Math.max(gap * 1.8, gap + height * 0.6) ||
      line.bbox.x0 - prev.bbox.x0 > height * 0.8 || // an indented first line
      (prev.bbox.x1 < right - height * 1.5 && /[.!?:…»"”'’)]$/u.test(prev.text.trim()));
    if (breaks) groups.push([line]);
    else groups[groups.length - 1].push(line);
  });

  const out: string[] = [];
  for (const group of groups) {
    const text = joinLines(
      group.map((l) => l.text),
      lang,
    );
    const letters = text.match(/\p{L}/gu)?.length ?? 0;
    // A running head or a page number alone, or a smudge read as letters.
    if (letters < 3 || letters < text.length * 0.5) continue;
    out.push(text);
  }
  return out;
}
