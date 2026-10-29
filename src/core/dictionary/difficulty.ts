// How hard an example sentence is (6-1c, F0162): the mean frequency rank of its words, so a sentence of common words is easy and one
// with rare words is hard. Words the frequency list does not have count as rare. Pure: the ranks come in.
const UNRANKED = 20_000;

export function sentenceDifficulty(words: readonly string[], rankOf: (word: string) => number | undefined): number {
  if (!words.length) return UNRANKED;
  return words.reduce((sum, w) => sum + Math.min(rankOf(w) ?? UNRANKED, UNRANKED), 0) / words.length;
}

/** The sentences easiest first; equal difficulty keeps the order given. `wordsOf` splits a sentence into the words to look up. */
export function easiestFirst<T>(items: readonly T[], textOf: (item: T) => string, wordsOf: (text: string) => string[], rankOf: (word: string) => number | undefined): T[] {
  return items
    .map((item, i) => ({ item, i, d: sentenceDifficulty(wordsOf(textOf(item)), rankOf) }))
    .sort((a, b) => a.d - b.d || a.i - b.i)
    .map((x) => x.item);
}
