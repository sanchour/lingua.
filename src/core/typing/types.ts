// Typing practice (5.1-4a): the data scripts/typing/build.ts makes for each core language.
// Relative imports with extensions elsewhere in core/typing: these modules also run in Node.

export interface TypingData {
  lang: string;
  /** The language's letters, most met first, with their share of all letters typed. */
  letters: Array<[string, number]>;
  /** The most common words made only of those letters, most common first. */
  words: string[];
  /** Mandarin: the most common characters as [character, pinyin without tone (ü as v), pinyin with a tone number]. */
  chars?: Array<[string, string, string]>;
  /** Mandarin: common two- and three-character words with their toneless pinyin, "ni hao". */
  charWords?: Array<[string, string]>;
}
