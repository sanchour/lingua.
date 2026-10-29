// Which syllable carries the stress (6-1c), where a language's spelling says so: Spanish, by its two rules and the written accent.
// Other languages keep what the dictionary gives (Russian marks it in the headword) or show none.
const VOWEL = /[aeiouáéíóúü]/i;
const ACCENT = /[áéíóú]/i;

/** The index of the stressed syllable of a Spanish word split into syllables, or undefined when there is nothing to go on. */
export function spanishStress(syllables: readonly string[]): number | undefined {
  if (!syllables.length || !syllables.some((s) => VOWEL.test(s))) return undefined;
  const marked = syllables.findIndex((s) => ACCENT.test(s));
  if (marked >= 0) return marked;
  if (syllables.length === 1) return 0;
  // Words ending in a vowel, n or s are stressed on the last syllable but one; the others on the last.
  return /[aeiouáéíóúüns]$/i.test(syllables[syllables.length - 1]) ? syllables.length - 2 : syllables.length - 1;
}
