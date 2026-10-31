// Importing Markdown documents, Obsidian/Notion notes with YAML front matter & [[wikilinks]],
// and grammar notes into Lingua (F1475, F1483, F1511).
import type { Block } from '@/data/types';
import type { CsvNote } from './deckCsv';
import type { ChapterDraft } from './text';

export interface ParsedMarkdownDoc {
  frontMatter: Record<string, string | string[]>;
  title?: string;
  wikilinks: string[];
  chapters: ChapterDraft[];
  notes: CsvNote[];
  grammarTopics: Array<{
    title: string;
    level?: string;
    summary: string;
    examples: string[];
  }>;
}

const FRONT_MATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;
const WIKILINK_RE = /\[\[([^[\]|]+)(?:\|([^[\]]+))?\]\]/g;

export function parseYamlFrontMatter(source: string): { frontMatter: Record<string, string | string[]>; body: string } {
  const clean = source.replace(/^\uFEFF/, '');
  const m = FRONT_MATTER_RE.exec(clean);
  if (!m) return { frontMatter: {}, body: clean };

  const fm: Record<string, string | string[]> = {};
  for (const line of m[1].split(/\r?\n/)) {
    const colon = line.indexOf(':');
    if (colon <= 0) continue;
    const key = line.slice(0, colon).trim();
    const rawVal = line.slice(colon + 1).trim();
    if (!key) continue;
    if (rawVal.startsWith('[') && rawVal.endsWith(']')) {
      const inner = rawVal.slice(1, -1).trim();
      fm[key] = inner ? inner.split(',').map((s) => s.trim().replace(/^["']|["']$/g, '')) : [];
    } else {
      fm[key] = rawVal.replace(/^["']|["']$/g, '');
    }
  }

  return { frontMatter: fm, body: clean.slice(m[0].length) };
}

export function extractWikilinks(text: string): string[] {
  const seen = new Set<string>();
  for (const m of text.matchAll(WIKILINK_RE)) {
    const target = m[1].trim();
    if (target) seen.add(target);
  }
  return [...seen];
}

function stripMarkdownInline(text: string): string {
  return text
    .replace(WIKILINK_RE, (_, target: string, alias?: string) => (alias ?? target).trim())
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .trim();
}

export function parseMarkdownDocument(source: string, fallbackTitle?: string): ParsedMarkdownDoc {
  const { frontMatter, body } = parseYamlFrontMatter(source);
  const wikilinks = extractWikilinks(body);
  const lines = body.replace(/\r\n?/g, '\n').split('\n');

  let docTitle = typeof frontMatter.title === 'string' ? frontMatter.title : fallbackTitle;
  const chapters: ChapterDraft[] = [];
  let currentChapter: ChapterDraft = { title: docTitle, blocks: [] };

  const notes: CsvNote[] = [];
  const grammarTopics: ParsedMarkdownDoc['grammarTopics'] = [];

  let activeSectionHeading = '';
  let activeNotesMap: Record<string, string> = {};
  let activeGrammar: { title: string; level?: string; summaryLines: string[]; examples: string[] } | null = null;

  const flushSection = () => {
    if (activeSectionHeading && activeNotesMap.meaning) {
      notes.push({
        term: activeNotesMap.term ?? stripMarkdownInline(activeSectionHeading),
        meaning: activeNotesMap.meaning,
        example: activeNotesMap.example ? { text: activeNotesMap.example } : undefined,
        tags: activeNotesMap.tags ? activeNotesMap.tags.split(/\s+/).map((t) => t.replace(/^#/, '')).filter(Boolean) : [],
      });
    }
    if (activeGrammar && (activeGrammar.summaryLines.length > 0 || activeGrammar.examples.length > 0)) {
      grammarTopics.push({
        title: activeGrammar.title,
        level: activeGrammar.level,
        summary: activeGrammar.summaryLines.join(' ').trim(),
        examples: activeGrammar.examples,
      });
    }
    activeSectionHeading = '';
    activeNotesMap = {};
    activeGrammar = null;
  };

  let paraBuffer: string[] = [];
  const flushParagraph = () => {
    if (!paraBuffer.length) return;
    const text = stripMarkdownInline(paraBuffer.join(' '));
    if (text) {
      currentChapter.blocks.push({ t: 'p', text });
      if (activeGrammar) activeGrammar.summaryLines.push(text);
    }
    paraBuffer = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      flushParagraph();
      continue;
    }

    // Markdown table row: | term | meaning | example |
    if (line.startsWith('|') && line.endsWith('|') && !/^\|[\s-:|]+\|$/.test(line)) {
      flushParagraph();
      const cells = line
        .slice(1, -1)
        .split('|')
        .map((c) => stripMarkdownInline(c));
      if (cells.length >= 2 && cells[0] && cells[1] && !/^(term|word|front)$/i.test(cells[0])) {
        notes.push({
          term: cells[0],
          meaning: cells[1],
          example: cells[2] ? { text: cells[2] } : undefined,
          tags: [],
        });
      }
      continue;
    }

    // Headings
    const hMatch = /^(#{1,3})\s+(.+)$/.exec(line);
    if (hMatch) {
      flushParagraph();
      const level = hMatch[1].length;
      const headingText = stripMarkdownInline(hMatch[2]);
      if (level === 1 && !docTitle) {
        docTitle = headingText;
      }
      if (level <= 2) {
        flushSection();
        if (currentChapter.blocks.length > 0) {
          chapters.push(currentChapter);
        }
        currentChapter = { title: headingText, blocks: [{ t: 'h', text: headingText }] };
        activeSectionHeading = headingText;
        const cefrMatch = /\(([ABC][12])\)\s*$/.exec(headingText);
        activeGrammar = {
          title: headingText.replace(/\s*\([ABC][12]\)\s*$/, ''),
          level: cefrMatch?.[1],
          summaryLines: [],
          examples: [],
        };
      } else {
        currentChapter.blocks.push({ t: 'h', text: headingText });
      }
      continue;
    }

    // Blockquote
    if (line.startsWith('>')) {
      flushParagraph();
      const quoteText = stripMarkdownInline(line.replace(/^>\s*/, ''));
      if (quoteText) {
        const block: Block = { t: 'quote', text: quoteText };
        currentChapter.blocks.push(block);
      }
      continue;
    }

    // Bullet item: check for structured "- **Meaning:** ..." or "- term — meaning"
    const bulletMatch = /^[-*+]\s+(.+)$/.exec(line);
    if (bulletMatch) {
      flushParagraph();
      const itemRaw = bulletMatch[1];
      const kvMatch = /^\*\*([^*:]+):\*\*\s*(.+)$/.exec(itemRaw);
      if (kvMatch && activeSectionHeading) {
        const k = kvMatch[1].trim().toLowerCase();
        const v = stripMarkdownInline(kvMatch[2]);
        activeNotesMap[k] = v;
        continue;
      }
      const pairMatch = /^(.+?)\s+(?:—|--|->|:)\s+(.+)$/.exec(stripMarkdownInline(itemRaw));
      if (pairMatch) {
        notes.push({
          term: pairMatch[1].trim(),
          meaning: pairMatch[2].trim(),
          tags: [],
        });
        if (activeGrammar) activeGrammar.examples.push(`${pairMatch[1].trim()} — ${pairMatch[2].trim()}`);
        continue;
      }
      const cleanItem = stripMarkdownInline(itemRaw);
      if (cleanItem) {
        currentChapter.blocks.push({ t: 'p', text: `• ${cleanItem}` });
        if (activeGrammar) activeGrammar.examples.push(cleanItem);
      }
      continue;
    }

    paraBuffer.push(line);
  }

  flushParagraph();
  flushSection();
  if (currentChapter.blocks.length > 0) {
    chapters.push(currentChapter);
  }

  return {
    frontMatter,
    title: docTitle,
    wikilinks,
    chapters,
    notes,
    grammarTopics,
  };
}
