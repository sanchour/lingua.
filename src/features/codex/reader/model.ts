import { useEffect, useState } from 'react';
import { tokenize } from '@/core/text/tokenizer';
import type { Token } from '@/core/text/tokenizer';
import { getChapter } from '@/data/library';
import type { Block, Chapter, Text, WordState } from '@/data/types';
import { getWordStates } from '@/data/words';
import type { SenseOption } from '@/core/lang/context';
import { lookupGlosses, lookupSenses } from '@/services/translate/gloss';
import type { GlossInfo } from '@/services/translate/gloss';

export interface BlockModel {
  block: Block;
  /** null for images */
  tokens: Token[] | null;
}

export interface ChapterModel {
  chapter: Chapter;
  blocks: BlockModel[];
  norms: string[];
  /** Mutable: the word engine keeps it current as states change. */
  states: Map<string, WordState>;
  glosses: Map<string, GlossInfo>;
  /** Senses of the forms that are ambiguous, for choosing by context. */
  senses: Map<string, SenseOption[]>;
}

// A few recent chapters stay in memory so turning back and forth is instant.
const cache = new Map<string, Promise<ChapterModel | null>>();
const CACHE_SIZE = 4;

async function build(text: Text, index: number): Promise<ChapterModel | null> {
  const chapter = await getChapter(text.id, index);
  return chapter ? modelFromChapter(text, chapter) : null;
}

/** Tokens, word states and glosses for a chapter (also used for Sonus transcripts, held in memory). */
export async function modelFromChapter(text: Pick<Text, 'lang'>, chapter: Chapter): Promise<ChapterModel> {
  const unique = new Set<string>();
  const blocks: BlockModel[] = chapter.blocks.map((block) => {
    if (block.t === 'img') return { block, tokens: null };
    const tokens = tokenize(block.text, text.lang);
    for (const t of tokens) if (t.isWord) unique.add(t.norm!);
    return { block, tokens };
  });
  const norms = [...unique];
  const [states, glosses, senses] = await Promise.all([getWordStates(text.lang, norms), lookupGlosses(text.lang, norms), lookupSenses(text.lang, norms).catch(() => new Map<string, SenseOption[]>())]);
  return { chapter, blocks, norms, states, glosses, senses };
}

export function loadChapterModel(text: Text, index: number): Promise<ChapterModel | null> {
  const key = `${text.id}:${index}`;
  let job = cache.get(key);
  if (!job) {
    job = build(text, index);
    cache.set(key, job);
    if (cache.size > CACHE_SIZE) cache.delete(cache.keys().next().value!);
  }
  return job;
}

/** Keeps preloaded chapters in step when a word's state changes in the open one. */
export function updateCachedState(norm: string, state: WordState): void {
  for (const job of cache.values()) {
    void job.then((m) => {
      if (!m || !m.norms.includes(norm)) return;
      if (state) m.states.set(norm, state);
      else m.states.delete(norm);
    });
  }
}

export function useChapterModel(text: Text | null | undefined, index: number): ChapterModel | null | undefined {
  const [model, setModel] = useState<ChapterModel | null | undefined>(undefined);
  useEffect(() => {
    if (!text) return;
    let cancelled = false;
    void loadChapterModel(text, index).then((m) => {
      if (cancelled) return;
      setModel(m);
      // Warm the next chapter while the reader is on this one.
      if (m && index + 1 < text.chapterCount) {
        const idle = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 600));
        idle(() => void loadChapterModel(text, index + 1));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [text, index]);
  return model;
}
