// Matching what was typed against song titles and artist names, for Cantus search: case, accents
// and punctuation don't count, version tags ("(feat. …)", "(Remix)", "- Single") come off for
// comparing, and a typo or two is forgiven ("bad bunni", "inolvidabel").

/** Scripts written without spaces between words: matched by containment, not word by word. */
const UNSPACED = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}\p{Script=Thai}\p{Script=Lao}\p{Script=Khmer}\p{Script=Myanmar}]/u;

/**
 * Lowercase, without accents or punctuation: "BAILE INoLVIDABLE!" → "baile inolvidable". Accents
 * come off Latin, Greek and Cyrillic letters only: elsewhere marks are letters' vowels (Hindi, Thai).
 */
export function fold(text: string): string {
  return text
    .normalize('NFD')
    .replace(/([\p{Script=Latin}\p{Script=Greek}\p{Script=Cyrillic}])\p{M}+/gu, '$1')
    .normalize('NFC')
    .toLocaleLowerCase()
    .replace(/['’ʼ`´]/g, '')
    .replace(/[^\p{L}\p{N}\p{M}]+/gu, ' ')
    .trim();
}

/** The folded words of a text. */
export const words = (text: string): string[] => fold(text).split(' ').filter(Boolean);

/**
 * Typos between two words, a swap of neighbours counting as one ("inolvidabel" → 1); stops
 * counting past `max`.
 */
export function editDistance(a: string, b: string, max = Infinity): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const x = [...a];
  const y = [...b];
  let before: number[] = [];
  let prev = Array.from({ length: y.length + 1 }, (_, j) => j);
  for (let i = 1; i <= x.length; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= y.length; j++) {
      const cost = x[i - 1] === y[j - 1] ? 0 : 1;
      let d = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      if (i > 1 && j > 1 && x[i - 1] === y[j - 2] && x[i - 2] === y[j - 1]) d = Math.min(d, before[j - 2] + 1);
      cur[j] = d;
      rowMin = Math.min(rowMin, d);
    }
    if (rowMin > max) return max + 1;
    before = prev;
    prev = cur;
  }
  return prev[y.length];
}

/** Typos forgiven in a word of this length: none in short words, where one changes the word. */
export const tolerance = (word: string) => {
  const n = [...word].length;
  return UNSPACED.test(word) || /^\p{N}+$/u.test(word) ? 0 : n <= 3 ? 0 : n <= 5 ? 1 : 2;
};

/**
 * How well a typed word fits a word of a title or name: 1 the same, 0.9 the start of it (the last
 * word, still being typed), 0.75 within a typo or two, else 0.
 */
export function wordFit(typed: string, word: string, last = false): number {
  if (typed === word) return 1;
  if (UNSPACED.test(typed)) return word.includes(typed) ? 0.9 : 0;
  if (last && typed.length >= 2 && word.startsWith(typed)) return 0.9;
  const allowed = Math.min(tolerance(typed), tolerance(word));
  return allowed && editDistance(typed, word, allowed) <= allowed ? 0.75 : 0;
}

export interface Fit {
  /** Mean fit of the typed words (0–1). */
  score: number;
  /** Every typed word found. */
  all: boolean;
  /** Every typed word found as it is. */
  exact: boolean;
}

/**
 * How well typed words are found among a text's words, each used once. The last typed word may be
 * unfinished when `typing` is set.
 */
export function fit(typed: readonly string[], target: readonly string[], typing = false): Fit {
  if (!typed.length) return { score: 0, all: false, exact: false };
  const used = new Set<number>();
  let total = 0;
  let all = true;
  let exact = true;
  typed.forEach((t, i) => {
    let best = 0;
    let at = -1;
    target.forEach((w, j) => {
      if (used.has(j)) return;
      const f = wordFit(t, w, typing && i === typed.length - 1);
      if (f > best) {
        best = f;
        at = j;
      }
    });
    if (at >= 0) used.add(at);
    total += best;
    if (!best) all = false;
    if (best < 1) exact = false;
  });
  return { score: total / typed.length, all, exact };
}

/** Where a name's words stand together in the typed words, all of them. */
export interface Span {
  start: number;
  end: number;
  exact: boolean;
}

/** Finds a name inside the typed words: "baile inolvidable bad bunny" holds "Bad Bunny" at 2–4. */
export function findSpan(typed: readonly string[], name: readonly string[], typing = false): Span | null {
  if (!name.length || name.length > typed.length) return null;
  for (let start = 0; start + name.length <= typed.length; start++) {
    let exact = true;
    let ok = true;
    for (let k = 0; k < name.length && ok; k++) {
      const i = start + k;
      const f = wordFit(typed[i], name[k], typing && i === typed.length - 1);
      if (!f) ok = false;
      else if (f < 1) exact = false;
    }
    if (ok) return { start, end: start + name.length, exact };
  }
  return null;
}

/** Every artist named in a credit: "Bad Bunny, Ozuna & Farruko" → three. */
export const artistsOf = (credit: string): string[] =>
  credit
    .split(/\s*(?:,|&|\+|\/|\bfeat\.?|\bft\.?|\bfeaturing\b|\bx\b|\by\b|\bwith\b|\band\b|\bcon\b)\s*/i)
    .map((a) => a.trim())
    .filter(Boolean);

/** Bracketed or dashed tags that are only how a file was labelled, not another recording. */
const LABEL = /^(?:official|oficial|video|audio|lyrics?|letra|visuali[sz]er|hd|hq|4k|explicit|clean|mono|stereo|single|album version|original mix|remaster(?:ed)?|\d{4} remaster(?:ed)?|remaster(?:ed)? \d{4}|radio edit)(?: (?:official|oficial|video|audio|lyrics?|letra|visuali[sz]er|hd|hq|music))*$/;

/** Words of a version that isn't the song as the artist recorded it. */
const COVER = /\b(?:cover|covers|covered|karaoke|tribute|tributo|homenaje|hommage|in the style of|made famous|originally performed|instrumental|piano version|version piano|piano cover|lullaby|lullabies|de cuna|music box|8 bit|ringtone|sped up|slowed|nightcore|string quartet|kidz bop|rockabye baby)\b/;

export interface TitleParts {
  /** Folded title without its tags: "diles". */
  base: string;
  /** Folded version tags that make it another recording ("remix", "en vivo"), else ''. */
  version: string;
  /** A cover, karaoke, tribute, instrumental or other remake. */
  cover: boolean;
}

/**
 * A title's parts for comparing: "Diles (feat. Arcángel, Ñengo Flow)" is "diles"; "Despacito
 * (Remix) [feat. Justin Bieber]" is "despacito" in version "remix"; "Baile Inolvidable (Piano
 * Cover)" is a cover. Remasters and video labels are the same recording.
 */
export function titleParts(title: string, artist = ''): TitleParts {
  let rest = title.replace(/\s*[([](?:feat|ft|featuring|with|con|prod)\.?\s[^)\]]*[)\]]/gi, ' ');
  const tags: string[] = [];
  rest = rest.replace(/[([]([^)\]]*)[)\]]/g, (_, tag: string) => {
    tags.push(tag);
    return ' ';
  });
  // "Song - Remix", "Song - Live at Wembley", "Song - 2011 Remaster".
  const dash = /\s[-–—]\s(.+)$/.exec(rest);
  if (dash && /\b(?:remix|mix|live|en vivo|ao vivo|en directo|directo|acoustic|acustic[oa]|ac[uú]stico|version|versi[oó]n|edit|remaster(?:ed)?|unplugged|demo|instrumental|cover|karaoke|sped up|slowed)\b/i.test(dash[1])) {
    tags.push(dash[1]);
    rest = rest.slice(0, dash.index);
  }
  const versions = tags
    .map(fold)
    .filter((t) => t && !LABEL.test(t))
    .join(' ');
  const base = fold(rest) || fold(title);
  return { base, version: versions, cover: COVER.test(`${versions} ${base === fold(title) ? '' : ''}`) || COVER.test(fold(artist)) || COVER.test(versions) };
}

/** An album's name without "- Single", "- EP" or "(Deluxe Edition)", folded. */
export const albumBase = (name: string) =>
  fold(name.replace(/\s+-\s+(?:single|ep)$/i, '').replace(/\s*[([](?:deluxe|expanded|special|anniversary|bonus|remaster)[^)\]]*[)\]]/gi, '')) || fold(name);

/** A single or EP, rather than an album. */
export const isSingle = (name: string) => /\s-\s(?:single|ep)$/i.test(name);

/**
 * The words seen in results, counted, with how each is usually written: what a typo is put right
 * from ("inolvidabel" → "inolvidable", seen fifty times).
 */
export class Vocabulary {
  private counts = new Map<string, number>();
  private spelled = new Map<string, Map<string, number>>();

  /** Counts a title's or a name's words once. */
  add(text: string): void {
    const seen = new Set<string>();
    for (const raw of text.toLocaleLowerCase().split(/[^\p{L}\p{N}\p{M}'’ʼ`´]+/u)) {
      const w = fold(raw);
      if (!w || w.includes(' ') || seen.has(w)) continue;
      seen.add(w);
      this.counts.set(w, (this.counts.get(w) ?? 0) + 1);
      const forms = this.spelled.get(w) ?? new Map<string, number>();
      forms.set(raw.normalize('NFC'), (forms.get(raw.normalize('NFC')) ?? 0) + 1);
      this.spelled.set(w, forms);
    }
  }

  count(word: string): number {
    return this.counts.get(word) ?? 0;
  }

  /** How a folded word is most often written ("cancion" → "canción"). */
  spelling(word: string): string {
    const forms = this.spelled.get(word);
    if (!forms) return word;
    return [...forms.entries()].sort((a, b) => b[1] - a[1])[0][0];
  }

  /**
   * The word a typed one most likely meant: a word the results use, within a typo or two of one they don't.
   * null when it is common itself, or the start of a common word (still being typed).
   */
  correct(typed: string, typing = false): string | null {
    const allowed = tolerance(typed);
    if (!allowed) return null;
    const own = this.count(typed);
    let best: string | null = null;
    let bestCount = 0;
    let bestDistance = Infinity;
    for (const [w, n] of this.counts) {
      if (w === typed) continue;
      if (typing && w.startsWith(typed) && n >= 2) return null;
      // Seen a few times where the typed word never is (or ten times as often).
      if (n < 3 || n < 10 * own) continue;
      const d = editDistance(typed, w, Math.min(allowed, tolerance(w)));
      if (d > Math.min(allowed, tolerance(w))) continue;
      if (d < bestDistance || (d === bestDistance && n > bestCount)) {
        best = w;
        bestCount = n;
        bestDistance = d;
      }
    }
    return best;
  }
}
