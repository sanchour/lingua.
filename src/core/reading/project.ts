import { tokenize } from '@/core/text/tokenizer';
import type { Chapter, WordState } from '@/data/types';

export function chapterVocabulary(chapter: Pick<Chapter, 'blocks'>, lang: string) {
  return chapter.blocks.flatMap((b) => b.t === 'img' ? [] : tokenize(b.text, lang).filter((t) => t.isWord).map((t) => t.norm!));
}
export function chapterDensity(norms: string[], states: Map<string, WordState>) {
  const unknown = norms.filter((n) => !states.get(n)).length;
  return { words: norms.length, unknown, share: norms.length ? unknown / norms.length : null };
}
