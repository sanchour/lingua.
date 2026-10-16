import type { Block } from '@/data/types';

export interface ChapterDraft {
  title?: string;
  blocks: Block[];
}

/** Legacy single-byte encodings to try when a .txt file isn't UTF-8. */
const LEGACY_ENCODING: Record<string, string> = {
  ru: 'windows-1251',
  el: 'windows-1253',
  hu: 'windows-1250',
};

/** Decodes a text file: UTF-8 (with or without BOM) or the language's usual legacy encoding. */
export function decodeText(bytes: Uint8Array, lang: string): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes).replace(/^﻿/, '');
  } catch {
    return new TextDecoder(LEGACY_ENCODING[lang] ?? 'windows-1252').decode(bytes);
  }
}

// `\b` only knows Latin letters, so the boundary is spelled out (works for Cyrillic and Greek).
const CHAPTER_WORDS = /^(chapter|part|book|capítulo|capitulo|parte|глава|часть|κεφάλαιο|μέρος|chapitre|partie|kapitel|teil|capitolo|fejezet|rész)(?=$|[\s.:\d])/iu;
const ROMAN_OR_NUMBER = /^([IVXLC]+|\d+)[.)]?$/;

function isHeadingLine(line: string): boolean {
  const t = line.trim();
  if (!t || t.length > 70) return false;
  if (CHAPTER_WORDS.test(t) || ROMAN_OR_NUMBER.test(t)) return true;
  return false;
}

/**
 * Turns plain text into chapters of paragraphs. Paragraphs are separated by blank lines (or by
 * single line breaks when the file has no blank lines). Lines like "Chapter 3" / "Глава 3" / "IV"
 * start a new chapter.
 */
export function textToChapters(text: string, fallbackTitle?: string): ChapterDraft[] {
  const normalized = text.replace(/\r\n?/g, '\n').trim();
  const hasBlankLines = /\n\s*\n/.test(normalized);
  const paragraphs = (hasBlankLines ? normalized.split(/\n\s*\n/) : normalized.split('\n'))
    .map((p) => p.replace(/\s*\n\s*/g, ' ').replace(/[ \t]+/g, ' ').trim())
    .filter(Boolean);

  const chapters: ChapterDraft[] = [];
  let current: ChapterDraft = { title: fallbackTitle, blocks: [] };
  for (const p of paragraphs) {
    if (isHeadingLine(p)) {
      if (current.blocks.length) chapters.push(current);
      current = { title: p, blocks: [{ t: 'h', text: p }] };
    } else {
      current.blocks.push({ t: 'p', text: p });
    }
  }
  if (current.blocks.length) chapters.push(current);
  return chapters;
}

/**
 * Splits a chapter into parts of at most `maxWords` words at paragraph boundaries, so a reader page
 * never has to lay out a huge chapter at once.
 */
export function splitIntoParts(chapter: ChapterDraft, countWords: (text: string) => number, maxWords = 2500): Array<ChapterDraft & { wordCount: number }> {
  const parts: Array<ChapterDraft & { wordCount: number }> = [];
  let blocks: Block[] = [];
  let words = 0;
  for (const block of chapter.blocks) {
    const n = block.t === 'img' ? 0 : countWords(block.text);
    if (words + n > maxWords && blocks.length) {
      parts.push({ title: chapter.title, blocks, wordCount: words });
      blocks = [];
      words = 0;
    }
    blocks.push(block);
    words += n;
  }
  if (blocks.length) parts.push({ title: chapter.title, blocks, wordCount: words });
  return parts;
}
