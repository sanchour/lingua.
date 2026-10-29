import { sentencesOf, tokenize } from '@/core/text/tokenizer';
import { toPlain } from './markdown';

export function writingMeasures(markdown: string, lang: string) {
  const text = toPlain(markdown);
  const words = tokenize(text, lang).filter((t) => t.isWord);
  const unique = new Set(words.map((w) => w.norm));
  const lengths = sentencesOf(text, lang).map((s) => tokenize(s, lang).filter((t) => t.isWord).length).filter(Boolean);
  return {
    words: words.length,
    unique: unique.size,
    diversity: words.length ? unique.size / words.length : 0,
    sentences: lengths.length,
    averageLength: lengths.length ? words.length / lengths.length : 0,
    longest: lengths.reduce((longest, n) => Math.max(longest, n), 0),
    longSentences: lengths.filter((n) => n > 20).length,
  };
}
