// Parsing Amazon Kindle's "My Clippings.txt" (F1512, F1615).
// Entries are separated by "==========" lines, each with a book header, a metadata line
// ("- Your Highlight on page … | Added on …" or localized equivalents), a blank line, and body text.
import type { CsvNote } from './deckCsv';

export interface KindleClipping {
  bookTitle: string;
  author?: string;
  kind: 'highlight' | 'note' | 'bookmark';
  location?: string;
  addedAt?: string;
  text: string;
}

export interface KindleBookGroup {
  bookTitle: string;
  author?: string;
  clippings: KindleClipping[];
}

const SEPARATOR = /^={5,}\s*$/m;
const AUTHOR_AT_END = /^(.*?)\s*\(([^()]+)\)\s*$/;

function detectKind(metaLine: string): 'highlight' | 'note' | 'bookmark' {
  const lower = metaLine.toLowerCase();
  if (/note|notiz|nota|note|заметк|笔记/.test(lower)) return 'note';
  if (/bookmark|lesezeichen|marcador|signet|закладк|书签/.test(lower)) return 'bookmark';
  return 'highlight';
}

export function looksLikeKindleClippings(source: string): boolean {
  const head = source.slice(0, 4000);
  return /={8,}/.test(head) && /^\s*-\s+.+\|/m.test(head);
}

export function parseKindleClippings(source: string): KindleClipping[] {
  const normalized = source.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  const rawBlocks = normalized.split(SEPARATOR);
  const out: KindleClipping[] = [];

  for (const raw of rawBlocks) {
    const lines = raw
      .split('\n')
      .map((l) => l.trim())
      .filter((l, idx, arr) => !(idx === 0 && !l) && !(idx === arr.length - 1 && !l));
    if (lines.length < 2) continue;

    const headerLine = lines[0].replace(/^\uFEFF/, '').trim();
    const metaLine = lines[1];
    if (!headerLine || !metaLine.startsWith('-')) continue;

    let bookTitle = headerLine;
    let author: string | undefined;
    const authorMatch = AUTHOR_AT_END.exec(headerLine);
    if (authorMatch) {
      bookTitle = authorMatch[1].trim();
      author = authorMatch[2].trim();
    }

    const kind = detectKind(metaLine);
    const metaParts = metaLine.replace(/^-\s*/, '').split('|').map((s) => s.trim());
    const location = metaParts[0];
    const addedAt = metaParts.length > 1 ? metaParts[metaParts.length - 1] : undefined;

    const text = lines
      .slice(2)
      .join('\n')
      .trim();

    if (kind === 'bookmark' || !text) continue;
    out.push({ bookTitle, author, kind, location, addedAt, text });
  }

  return out;
}

export function groupKindleByBook(clippings: KindleClipping[]): KindleBookGroup[] {
  const map = new Map<string, KindleBookGroup>();
  for (const c of clippings) {
    const key = `${c.bookTitle.toLowerCase()}::${(c.author ?? '').toLowerCase()}`;
    let group = map.get(key);
    if (!group) {
      group = { bookTitle: c.bookTitle, author: c.author, clippings: [] };
      map.set(key, group);
    }
    group.clippings.push(c);
  }
  return [...map.values()];
}

/** Converts Kindle highlights into flashcard notes (short clippings become terms; longer ones become context examples). */
export function kindleClippingsToNotes(clippings: KindleClipping[]): CsvNote[] {
  const out: CsvNote[] = [];
  for (let i = 0; i < clippings.length; i++) {
    const cur = clippings[i];
    if (cur.kind === 'note') continue;
    // If the immediately following clipping in the same book is a user note, pair it as the meaning/gloss.
    const next = clippings[i + 1];
    const pairedNote = next && next.kind === 'note' && next.bookTitle === cur.bookTitle ? next.text : '';
    const words = cur.text.split(/\s+/).filter(Boolean);
    if (words.length <= 6) {
      out.push({
        term: cur.text,
        meaning: pairedNote || `From ${cur.bookTitle}`,
        tags: ['kindle', cur.bookTitle.slice(0, 30).replace(/\s+/g, '-').toLowerCase()],
      });
    } else {
      out.push({
        term: words.slice(0, 4).join(' ') + '…',
        meaning: pairedNote || `Highlight from ${cur.bookTitle}`,
        example: { text: cur.text },
        tags: ['kindle', cur.bookTitle.slice(0, 30).replace(/\s+/g, '-').toLowerCase()],
      });
    }
  }
  return out;
}
