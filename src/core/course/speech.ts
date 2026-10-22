// The Speak lesson: what the browser heard, set against the phrase word by word (character by
// character in Mandarin). Case, punctuation, accents and Arabic vowel marks don't count: the speech
// recogniser writes none of them reliably.

const UNSPACED = new Set(['zh', 'ja']);

const fold = (s: string, lang: string) =>
  s
    .toLocaleLowerCase(lang)
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^\p{L}\p{N}]/gu, '');

export interface HeardWord {
  /** The word as written in the phrase, with its punctuation. */
  text: string;
  heard: boolean;
}

function pieces(text: string, lang: string): string[] {
  if (UNSPACED.has(lang)) return [...text];
  return text.split(/\s+/).filter(Boolean);
}

function matchOne(target: string, heard: string, lang: string): { words: HeardWord[]; score: number } {
  const left = new Map<string, number>();
  for (const p of pieces(heard, lang)) {
    const k = fold(p, lang);
    if (k) left.set(k, (left.get(k) ?? 0) + 1);
  }
  const words = pieces(target, lang).map((text) => {
    const k = fold(text, lang);
    if (!k) return { text, heard: true, counts: false };
    const n = left.get(k) ?? 0;
    if (n) left.set(k, n - 1);
    return { text, heard: n > 0, counts: true };
  });
  const counted = words.filter((w) => w.counts);
  return { words: words.map(({ text, heard }) => ({ text, heard })), score: counted.length ? counted.filter((w) => w.heard).length / counted.length : 0 };
}

/** The phrase's words, each heard or not, from the recogniser's best guesses: the closest one counts. */
export function speechMatch(target: string, heard: string[], lang: string): { words: HeardWord[]; score: number; said: string } {
  let best = { ...matchOne(target, '', lang), said: '' };
  for (const h of heard) {
    const m = matchOne(target, h, lang);
    if (m.score > best.score || !best.said) best = { ...m, said: h };
  }
  return best;
}

/** Said well enough to move on. */
export const SPOKEN_PASS = 0.75;
