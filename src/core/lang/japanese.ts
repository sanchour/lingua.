// Japanese without spaces: which dictionary word a conjugated form comes from (食べました → 食べる),
// where the words of a sentence begin and end, and the kana that goes over each kanji.
// No imports: the pack scripts (Node) use this too.

const KANJI = /[㐀-䶿一-鿿豈-﫿々〆〇ヶ]/;
const HIRAGANA = /[ぁ-ゟ]/;
const KATAKANA = /[゠-ヿㇰ-ㇿｦ-ﾟ]/;
/** Any character of Japanese writing (kanji, kana, the long-vowel mark, iteration marks). */
export const JAPANESE_CHAR = /[々-〇ぁ-ゟ゠-ヿㇰ-ㇿ㐀-䶿一-鿿豈-﫿ｦ-ﾟ]/;

export const isKanji = (c: string) => KANJI.test(c);
export const isHiragana = (c: string) => HIRAGANA.test(c);
export const isKatakana = (c: string) => KATAKANA.test(c);
export const hasKanji = (s: string) => [...s].some(isKanji);

/** Katakana as hiragana (コーヒー → こーひー), for comparing readings. */
export function toHiragana(s: string): string {
  return s.replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));
}

// ── Conjugation ─────────────────────────────────────────────────────────────
// Rules in the style of Yomichan's deinflector: an ending, what replaces it, the kind of form the
// rule applies to and the kind it gives. Rules chain (食べていました → 食べている → 食べて → 食べる).

/** v1 ichidan, v5 godan, vs する, vk 来る, adj i-adjective; the rest are steps on the way. */
type Kind = 'v1' | 'v5' | 'vs' | 'vk' | 'adj' | 'cop' | 'stem' | 'te' | 'ta';
type Rule = [from: string, to: string, takes: Kind[] | null, gives: Kind];

const U = 'うくぐすつぬぶむる';
const I = 'いきぎしちにびみり';
const A = 'わかがさたなばまら';
const E = 'えけげせてねべめれ';
const O = 'おこごそとのぼもろ';
const DICT: Kind[] = ['v1', 'v5', 'vs', 'vk', 'adj', 'cop'];

const RULES: Rule[] = [];
const add = (from: string, to: string, takes: Kind[] | null, gives: Kind) => RULES.push([from, to, takes, gives]);
const godan = (row: string, suffix: string, takes: Kind[] | null) => [...row].forEach((c, i) => add(c + suffix, U[i], takes, 'v5'));

// Polite: 食べます, 行きました, 話しません → the stem.
for (const s of ['ます', 'ました', 'ません', 'ませんでした', 'ましょう', 'まして', 'ませ']) add(s, '', null, 'stem');
// Wanting, while, too much, please: 食べたい, 歩きながら, 飲みすぎる, 座りなさい.
for (const s of ['たい', 'たがる', 'ながら', 'なさい', 'すぎる', 'やすい', 'にくい', 'そう']) add(s, '', ['adj', 'v1', 'v5', 'stem'], 'stem');
// The stem itself: 食べ → 食べる, 行き → 行く, し → する, き/来 → 来る.
add('', 'る', ['stem'], 'v1');
[...I].forEach((c, i) => add(c, U[i], ['stem'], 'v5'));
add('し', 'する', ['stem'], 'vs');
add('き', 'くる', ['stem'], 'vk');
add('来', '来る', ['stem'], 'vk');

// て and た forms: 食べて, 待って, 読んで, 書いて, 泳いで, 話して, して, 来て, 行って.
for (const [te, ta] of [['て', 'た'], ['で', 'だ']] as const) {
  // Any word may be such a form: the rules below take only these kinds.
  add(te, te, null, 'te');
  add(ta, ta, null, 'ta');
}
const teTa = (te: string, to: string, gives: Kind) => {
  add(te, to, ['te'], gives);
  add(te.replace(/[てで]$/, (c) => (c === 'て' ? 'た' : 'だ')), to, ['ta'], gives);
};
teTa('て', 'る', 'v1');
for (const to of 'うつる') teTa('って', to, 'v5');
for (const to of 'ぬぶむ') teTa('んで', to, 'v5');
teTa('いて', 'く', 'v5');
teTa('いで', 'ぐ', 'v5');
teTa('して', 'す', 'v5');
teTa('して', 'する', 'vs');
teTa('きて', 'くる', 'vk');
teTa('来て', '来る', 'vk');
teTa('行って', '行く', 'v5');
teTa('いって', 'いく', 'v5');
// The copula: でした, でしょう, だった, だろう.
for (const s of ['でした', 'でしょう', 'でして']) add(s, 'です', null, 'cop');
for (const s of ['だった', 'だろう', 'であった', 'である']) add(s, 'だ', null, 'cop');

// i-adjectives: 高かった, 高くない, 高くて, 高く, 高ければ, 高さ.
for (const s of ['かった', 'くない', 'くて', 'く', 'ければ', 'かろう', 'さ']) add(s, 'い', null, 'adj');
// Negative: 食べない, 行かない, しない, 来ない; ない conjugates like an adjective (なかった, なくて).
add('ない', 'る', ['adj'], 'v1');
godan(A, 'ない', ['adj']);
add('しない', 'する', ['adj'], 'vs');
add('こない', 'くる', ['adj'], 'vk');
add('来ない', '来る', ['adj'], 'vk');
for (const s of ['ず', 'ずに', 'ぬ']) {
  add(s, 'る', null, 'v1');
  godan(A, s, null);
}
add('せず', 'する', null, 'vs');
add('なければ', 'ない', null, 'adj');
add('なきゃ', 'ない', null, 'adj');
add('なくちゃ', 'ない', null, 'adj');
add('ないで', 'ない', null, 'adj');
// Passive and potential (食べられる, 読まれる, 読める), causative (食べさせる, 読ませる): they conjugate like v1.
add('られる', 'る', ['v1'], 'v1');
godan(A, 'れる', ['v1']);
[...E].forEach((c, i) => add(`${c}る`, U[i], ['v1'], 'v5'));
add('させる', 'る', ['v1'], 'v1');
godan(A, 'せる', ['v1']);
add('させる', 'する', ['v1'], 'vs');
add('される', 'する', ['v1'], 'vs');
// Let's (食べよう, 行こう), if (食べれば, 行けば), commands (食べろ, 行け).
add('よう', 'る', null, 'v1');
godan(O, 'う', null);
add('しよう', 'する', null, 'vs');
add('こよう', 'くる', null, 'vk');
add('れば', 'る', null, 'v1');
godan(E, 'ば', null);
add('すれば', 'する', null, 'vs');
add('くれば', 'くる', null, 'vk');
add('ろ', 'る', null, 'v1');
godan(E, '', null);
add('しろ', 'する', null, 'vs');
add('こい', 'くる', null, 'vk');
// After a て form: 食べている, 食べてる, 書いておく, 行ってしまう, 来てください.
const AFTER_TE: Array<[string, Kind[]]> = [
  ['いる', ['v1']], ['る', ['v1']], ['おく', ['v5']], ['く', ['v5']], ['しまう', ['v5']], ['くる', ['vk']], ['いく', ['v5']],
  ['くれる', ['v1']], ['もらう', ['v5']], ['あげる', ['v1']], ['みる', ['v1']], ['ある', ['v5']], ['ください', ['adj']], ['下さい', ['adj']],
  ['くれ', ['v1']], ['は', ['v1']], ['も', ['v1']],
];
for (const [aux, takes] of AFTER_TE) {
  add(`て${aux}`, 'て', [...takes, 'v1', 'v5'].filter((k, i, a) => a.indexOf(k) === i) as Kind[], 'te');
  add(`で${aux}`, 'で', [...takes, 'v1', 'v5'].filter((k, i, a) => a.indexOf(k) === i) as Kind[], 'te');
}
// The casual forms of てしまう and ては (食べちゃう, 読んじゃった, 行っちゃ).
add('ちゃう', 'て', ['v5'], 'te');
add('じゃう', 'で', ['v5'], 'te');
add('ちゃ', 'て', null, 'te');
add('じゃ', 'で', null, 'te');
add('たら', 'た', null, 'ta');
add('だら', 'だ', null, 'ta');
add('たり', 'た', null, 'ta');
add('だり', 'だ', null, 'ta');

const MAX_STEPS = 9;

/**
 * Dictionary forms a conjugated word may come from, nearest first, without the word itself
 * (食べました → 食べる; 行かなかった → 行く). Many candidates are not words: a dictionary decides.
 */
export function deinflect(word: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  let frontier: Array<[string, Kind | null]> = [[word, null]];
  for (let step = 0; step < MAX_STEPS && frontier.length; step++) {
    const next: Array<[string, Kind | null]> = [];
    for (const [form, kind] of frontier) {
      for (const [from, to, takes, gives] of RULES) {
        // Later steps go on only from what the rule before gave. The word as written can be a
        // dictionary form already (食べている is a v1 verb), but not a stem or a て form until a
        // rule says so.
        if (kind !== null ? !takes?.includes(kind) : takes !== null && !takes.some((k) => DICT.includes(k))) continue;
        if (!form.endsWith(from)) continue;
        const result = form.slice(0, form.length - from.length) + to;
        if (!result) continue;
        const key = `${result}|${gives}`;
        if (seen.has(key)) continue;
        seen.add(key);
        next.push([result, gives]);
        if (DICT.includes(gives) && result !== word && !out.includes(result)) out.push(result);
      }
    }
    frontier = next;
    if (out.length > 60) break;
  }
  return out;
}

// ── Word splitting ──────────────────────────────────────────────────────────

export interface JapaneseLexicon {
  /** Whether the dictionary lists this spelling. */
  has(word: string): boolean;
  /** How unusual a listed word is: about ln(frequency rank), lower is commoner. */
  cost(word: string): number;
}

const MAX_WORD = 12;
const UNKNOWN_CHAR = 14;
const UNKNOWN_RUN = 13;
/** A conjugated form costs a little more than its dictionary form. */
const CONJUGATED = 0.4;

export interface JapaneseWord {
  start: number;
  end: number;
  /** The dictionary form, when the word was found through its conjugation. */
  base?: string;
}

/**
 * The likeliest words of a run of Japanese (only kanji and kana, no spaces or punctuation): of all
 * ways to cut it into listed words, the one whose words are commonest together. Conjugated verbs and
 * adjectives stay whole (食べました), particles stand alone (今日 は, not the greeting 今日は).
 */
export function segmentJapanese(text: string, lex: JapaneseLexicon): JapaneseWord[] {
  const n = text.length;
  const best = new Float64Array(n + 1).fill(Infinity);
  const from = new Int32Array(n + 1).fill(-1);
  const bases = new Map<number, string>();
  best[0] = 0;
  const deinflected = new Map<string, string | null>();
  const viaConjugation = (w: string): string | null => {
    let hit = deinflected.get(w);
    if (hit === undefined) {
      hit = isHiragana(w[w.length - 1]) && w.length >= 2 ? (deinflect(w).find((b) => lex.has(b)) ?? null) : null;
      deinflected.set(w, hit);
    }
    return hit;
  };
  for (let i = 0; i < n; i++) {
    if (best[i] === Infinity) continue;
    // A run of katakana nobody listed (a name, a loanword) is one word.
    let kataEnd = i;
    while (kataEnd < n && isKatakana(text[kataEnd])) kataEnd++;
    for (let len = 1; len <= MAX_WORD && i + len <= n; len++) {
      const w = text.slice(i, i + len);
      let cost = Infinity;
      let base: string | undefined;
      if (lex.has(w)) cost = lex.cost(w);
      const b = viaConjugation(w);
      if (b) {
        const c = lex.cost(b) + CONJUGATED;
        if (c < cost) {
          cost = c;
          base = b;
        }
      }
      if (cost === Infinity) {
        if (len === 1) cost = UNKNOWN_CHAR;
        else if (i + len === kataEnd && kataEnd - i >= 2) cost = UNKNOWN_RUN;
        else continue;
      }
      const total = best[i] + cost;
      if (total < best[i + len]) {
        best[i + len] = total;
        from[i + len] = i;
        if (base) bases.set(i + len, base);
        else bases.delete(i + len);
      }
    }
  }
  const words: JapaneseWord[] = [];
  for (let end = n; end > 0; end = from[end]) {
    const start = from[end];
    const base = bases.get(end);
    words.push(base ? { start, end, base } : { start, end });
  }
  return words.reverse();
}

// ── Readings ────────────────────────────────────────────────────────────────

/**
 * The reading of a conjugated form, from its dictionary form's reading: 食べました with 食べる
 * (たべる) reads たべました. Undefined when the two don't share their kanji.
 */
export function readingOf(form: string, lemma: string, lemmaReading: string): string | undefined {
  if (form === lemma) return lemmaReading;
  // The lemma's kana ending (okurigana) is the end of its reading too: 食|べる, た|べる.
  let tail = 0;
  while (tail < lemma.length && tail < lemmaReading.length && !isKanji(lemma[lemma.length - 1 - tail]) && toHiragana(lemma[lemma.length - 1 - tail]) === toHiragana(lemmaReading[lemmaReading.length - 1 - tail])) tail++;
  const stem = lemma.slice(0, lemma.length - tail);
  const stemReading = lemmaReading.slice(0, lemmaReading.length - tail);
  if (!stem || !form.startsWith(stem)) return undefined;
  return stemReading + form.slice(stem.length);
}

/**
 * A word cut into pieces with the kana that goes over its kanji: 食べました (たべました) →
 * [食, た] [べました]; お茶 (おちゃ) → [お] [茶, ちゃ]. Null when the reading doesn't fit the word.
 */
export function furigana(word: string, reading: string): Array<[text: string, ruby?: string]> | null {
  if (!hasKanji(word)) return null;
  // Split into runs of kanji and of kana; the kana runs must appear in the reading, in order.
  const runs: Array<[string, boolean]> = [];
  for (const c of word) {
    const k = isKanji(c);
    const last = runs[runs.length - 1];
    if (last && last[1] === k) last[0] += c;
    else runs.push([c, k]);
  }
  const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`^${runs.map(([t, k]) => (k ? '(.+?)' : `(${escape(toHiragana(t))})`)).join('')}$`);
  const m = pattern.exec(toHiragana(reading));
  if (!m) return null;
  return runs.map(([t, k], i) => (k ? [t, m[i + 1]] : [t]));
}
