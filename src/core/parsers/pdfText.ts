// Turning the positioned text of PDF pages into paragraphs, headings and chapters. pdf.js gives
// pieces of text with a position and size; this rebuilds lines, joins them into paragraphs (undoing
// end-of-line hyphens), drops running headers, footers and page numbers, and finds chapter starts.
import type { Block } from '@/data/types';
import type { ChapterDraft } from './text';

export interface PdfPiece {
  str: string;
  x: number;
  /** Baseline, measured upwards from the bottom of the page (PDF coordinates). */
  y: number;
  width: number;
  /** Font size. */
  size: number;
  /** pdf.js marks the last piece of a line. */
  eol?: boolean;
}

interface Line {
  text: string;
  y: number;
  x: number;
  /** Where the line ends on the right. */
  end: number;
  size: number;
}

/** Pieces into lines: a piece belongs to the line above unless its baseline moved by half a size. */
export function piecesToLines(pieces: PdfPiece[]): Line[] {
  const lines: Line[] = [];
  let line: Line | null = null;
  for (const p of pieces) {
    if (!p.str) {
      if (p.eol && line) line = pushLine(lines, line);
      continue;
    }
    if (line && Math.abs(p.y - line.y) <= Math.max(line.size, p.size) * 0.5) {
      const gap = p.x - line.end;
      const needsSpace = gap > Math.min(line.size, p.size) * 0.18 && !/\s$/.test(line.text) && !/^\s/.test(p.str);
      line.text += (needsSpace ? ' ' : '') + p.str;
      line.end = p.x + p.width;
      line.size = Math.max(line.size, p.size);
    } else {
      if (line) pushLine(lines, line);
      line = { text: p.str, y: p.y, x: p.x, size: p.size, end: p.x + p.width };
    }
    if (p.eol && line) line = pushLine(lines, line);
  }
  if (line) pushLine(lines, line);
  return lines;
}

function pushLine(lines: Line[], line: Line): null {
  const text = line.text.replace(/\s+/g, ' ').trim();
  if (text) lines.push({ ...line, text });
  return null;
}

const percentile = (values: number[], p: number) => {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))];
};

/** Running headers and footers: the same line (digits aside) at the top or bottom of many pages. */
export function repeatedLines(pages: Line[][]): Set<string> {
  const key = (t: string) => t.replace(/\d+/g, '#').toLowerCase();
  const seen = new Map<string, number>();
  for (const lines of pages) {
    const edges = new Set([...lines.slice(0, 2), ...lines.slice(-2)].map((l) => key(l.text)));
    for (const k of edges) seen.set(k, (seen.get(k) ?? 0) + 1);
  }
  const min = Math.max(3, Math.ceil(pages.length * 0.4));
  return new Set([...seen].filter(([, n]) => n >= min).map(([k]) => k));
}

export interface PdfPage {
  blocks: Block[];
}

/**
 * One page's lines into blocks. A paragraph ends at a wider gap than usual, at a change of size or at
 * a short last line; lines in a clearly larger size become headings.
 */
export function linesToBlocks(lines: Line[], bodySize: number, skip: Set<string>): Block[] {
  const kept = lines.filter((l) => !/^[\divxlc]{1,4}$/i.test(l.text) && !skip.has(l.text.replace(/\d+/g, '#').toLowerCase()));
  // The usual distance between lines: a low percentile, since short paragraphs make paragraph gaps
  // nearly as common as line gaps; and never more than a generous line spacing for the size.
  const gaps = kept.slice(1).map((l, i) => kept[i].y - l.y).filter((g) => g > 0);
  const lineGap = Math.min(percentile(gaps, 0.25) || bodySize * 1.3, bodySize * 1.6);
  const right = percentile(kept.map((l) => l.end), 0.9);
  const blocks: Block[] = [];
  let para = '';
  let paraIsHeading = false;
  const flush = () => {
    const text = para.trim();
    if (text) blocks.push({ t: paraIsHeading ? 'h' : 'p', text });
    para = '';
  };
  kept.forEach((l, i) => {
    const heading = l.size >= bodySize * 1.25 && l.text.length <= 90;
    const prev = kept[i - 1];
    const newPara =
      !prev ||
      heading !== paraIsHeading ||
      prev.y - l.y > lineGap * 1.35 ||
      Math.abs(l.size - prev.size) > bodySize * 0.15 ||
      (!heading && prev.end < right - bodySize * 4 && /[.!?:»"”)]$/.test(prev.text));
    if (newPara) {
      flush();
      paraIsHeading = heading;
      para = l.text;
    } else if (/[\p{L}]-$/u.test(para) && /^\p{Ll}/u.test(l.text)) {
      para = para.slice(0, -1) + l.text;
    } else {
      para += ` ${l.text}`;
    }
  });
  flush();
  return blocks;
}

/** The size most of a document is written in, weighted by how much text uses it. */
export function bodySizeOf(pages: Line[][]): number {
  const weight = new Map<number, number>();
  for (const lines of pages) for (const l of lines) weight.set(Math.round(l.size), (weight.get(Math.round(l.size)) ?? 0) + l.text.length);
  let best = 10;
  let most = 0;
  for (const [size, n] of weight) if (n > most) [best, most] = [size, n];
  return best;
}

/**
 * Pages into chapters: at the bookmarks' pages when the PDF has them, else at its headings, else
 * every ten pages.
 */
export function pagesToChapters(pages: Block[][], starts: Array<{ title: string; page: number }>): ChapterDraft[] {
  const marks = starts.filter((s, i) => s.page >= 0 && s.page < pages.length && (i === 0 || s.page > starts[i - 1].page));
  if (marks.length >= 2) {
    const chapters: ChapterDraft[] = [];
    if (marks[0].page > 0) chapters.push({ title: undefined, blocks: pages.slice(0, marks[0].page).flat() });
    marks.forEach((m, i) => chapters.push({ title: m.title, blocks: pages.slice(m.page, marks[i + 1]?.page ?? pages.length).flat() }));
    return chapters.filter((c) => c.blocks.length);
  }

  const all = pages.flat();
  const headings = all.filter((b) => b.t === 'h').length;
  if (headings >= 2 && headings <= all.length / 3) {
    const chapters: ChapterDraft[] = [];
    let current: ChapterDraft = { blocks: [] };
    for (const b of all) {
      if (b.t === 'h' && current.blocks.some((x) => x.t !== 'h')) {
        chapters.push(current);
        current = { blocks: [] };
      }
      if (b.t === 'h' && !current.title) current.title = b.text;
      current.blocks.push(b);
    }
    if (current.blocks.length) chapters.push(current);
    return chapters;
  }

  const chapters: ChapterDraft[] = [];
  for (let i = 0; i < pages.length; i += 10) {
    const blocks = pages.slice(i, i + 10).flat();
    const last = Math.min(pages.length, i + 10);
    if (blocks.length) chapters.push({ title: pages.length > 10 ? `Pages ${i + 1}–${last}` : undefined, blocks });
  }
  return chapters;
}

/** Joins a paragraph cut by a page break: the next page's first paragraph continues mid-sentence. */
export function joinAcrossPages(pages: Block[][]): Block[][] {
  const out = pages.map((p) => [...p]);
  for (let i = 1; i < out.length; i++) {
    const prev = out[i - 1].at(-1);
    const first = out[i][0];
    if (prev?.t === 'p' && first?.t === 'p' && !/[.!?:»"”)]$/.test(prev.text) && /^\p{Ll}/u.test(first.text)) {
      const joined = /[\p{L}]-$/u.test(prev.text) ? prev.text.slice(0, -1) + first.text : `${prev.text} ${first.text}`;
      out[i - 1][out[i - 1].length - 1] = { t: 'p', text: joined };
      out[i].shift();
    }
  }
  return out;
}
