// Romanization for the alphabet lessons (Lingua 3.0-8, part 5): what a word in Cyrillic, Greek,
// vowelled Arabic, kana or Hangul reads as in Latin letters. Pure and self-contained (no `@/`
// imports), so the word-mining script can use it too. Each scheme is a common, readable one:
//   Russian   a simple BGN/PCGN-style transliteration (ж zh, х kh, ц ts, щ shch, ь ', ъ ")
//   Greek     ELOT 743 (the Greek standard): ου ou, αυ/ευ av/ev or af/ef, μπ mp, ντ nt, γγ ng
//   Arabic    a common scholarly scheme from the vowel marks (ā ī ū, ḥ ṣ ḍ ṭ ẓ, ʿ for ع, ʾ for ء)
//   Japanese  modified Hepburn (し shi, つ tsu, ふ fu, ん n, っ doubles, ー a macron)
//   Korean    Revised Romanization, for words whose syllables are open but the last (no sound
//             changes then happen between syllables, so the spelling and the sound agree)
//   Georgian  the national system of 2002 (თ t, ტ t', ქ k, კ k', ღ gh, ყ q', წ ts', ჭ ch')

const RU: Record<string, string> = {
  а: 'a',
  б: 'b',
  в: 'v',
  г: 'g',
  д: 'd',
  е: 'e',
  ё: 'yo',
  ж: 'zh',
  з: 'z',
  и: 'i',
  й: 'y',
  к: 'k',
  л: 'l',
  м: 'm',
  н: 'n',
  о: 'o',
  п: 'p',
  р: 'r',
  с: 's',
  т: 't',
  у: 'u',
  ф: 'f',
  х: 'kh',
  ц: 'ts',
  ч: 'ch',
  ш: 'sh',
  щ: 'shch',
  ъ: '"',
  ы: 'y',
  ь: "'",
  э: 'e',
  ю: 'yu',
  я: 'ya',
};

export function romanizeRu(word: string): string {
  const w = word.normalize('NFD').replace(/[̀́]/g, '').normalize('NFC').toLowerCase();
  return [...w].map((c) => RU[c] ?? c).join('');
}

const EL: Record<string, string> = {
  α: 'a',
  β: 'v',
  γ: 'g',
  δ: 'd',
  ε: 'e',
  ζ: 'z',
  η: 'i',
  θ: 'th',
  ι: 'i',
  κ: 'k',
  λ: 'l',
  μ: 'm',
  ν: 'n',
  ξ: 'x',
  ο: 'o',
  π: 'p',
  ρ: 'r',
  σ: 's',
  ς: 's',
  τ: 't',
  υ: 'y',
  φ: 'f',
  χ: 'ch',
  ψ: 'ps',
  ω: 'o',
};
/** Letters after which αυ, ευ and ηυ read f rather than v (voiceless consonants, and the word's end). */
const VOICELESS = new Set(['θ', 'κ', 'ξ', 'π', 'σ', 'ς', 'τ', 'φ', 'χ', 'ψ']);

export function romanizeEl(word: string): string {
  // A diaeresis (ϊ, ϋ) keeps two vowels apart, so ϋ is never part of a pair.
  const chars = [...word.toLowerCase().normalize('NFD')].reduce<Array<{ c: string; split: boolean }>>((out, c) => {
    if (c === '̈') {
      if (out.length) out[out.length - 1].split = true;
    } else if (!/\p{M}/u.test(c)) out.push({ c, split: false });
    return out;
  }, []);
  let s = '';
  for (let i = 0; i < chars.length; i++) {
    const c = chars[i].c;
    const n = chars[i + 1];
    if (n && !n.split && n.c === 'υ' && c === 'ο') {
      s += 'ou';
      i++;
    } else if (n && !n.split && n.c === 'υ' && (c === 'α' || c === 'ε' || c === 'η')) {
      const after = chars[i + 2]?.c;
      s += EL[c] + (after === undefined || VOICELESS.has(after) ? 'f' : 'v');
      i++;
    } else if (c === 'γ' && (n?.c === 'γ' || n?.c === 'ξ' || n?.c === 'χ')) {
      s += 'n';
    } else s += EL[c] ?? c;
  }
  return s;
}

const AR: Record<string, string> = {
  ء: 'ʾ',
  أ: 'ʾ',
  إ: 'ʾ',
  ؤ: 'ʾ',
  ئ: 'ʾ',
  ب: 'b',
  ت: 't',
  ث: 'th',
  ج: 'j',
  ح: 'ḥ',
  خ: 'kh',
  د: 'd',
  ذ: 'dh',
  ر: 'r',
  ز: 'z',
  س: 's',
  ش: 'sh',
  ص: 'ṣ',
  ض: 'ḍ',
  ط: 'ṭ',
  ظ: 'ẓ',
  ع: 'ʿ',
  غ: 'gh',
  ف: 'f',
  ق: 'q',
  ك: 'k',
  ل: 'l',
  م: 'm',
  ن: 'n',
  ه: 'h',
  و: 'w',
  ي: 'y',
  ة: 'a',
  ى: 'ā',
  ا: 'ā',
};
const FATHA = 'َ';
const DAMMA = 'ُ';
const KASRA = 'ِ';
const SHADDA = 'ّ';
const SUKUN = 'ْ';
const TANWIN: Record<string, string> = { 'ً': 'an', 'ٌ': 'un', 'ٍ': 'in' };
const SHORT: Record<string, string> = {
  [FATHA]: 'a',
  [DAMMA]: 'u',
  [KASRA]: 'i',
};

/**
 * A fully vowelled Arabic word in Latin letters. Long vowels come from a letter after its short
 * vowel (ـَا ā, ـِي ī, ـُو ū); a word-initial hamza is left out, as is usual. Returns null when the
 * word isn't vowelled enough to be read unambiguously.
 */
export function romanizeAr(word: string): string | null {
  const w = word.replace(/ـ/g, '').replace(/ٰ/g, 'ا'); // tatweel; dagger alif reads ā
  const units: Array<{ base: string; marks: string }> = [];
  for (const c of w) {
    if (/[ً-ْ]/.test(c)) {
      if (!units.length) return null;
      units[units.length - 1].marks += c;
    } else units.push({ base: c, marks: '' });
  }
  let s = '';
  for (let i = 0; i < units.length; i++) {
    const { base, marks } = units[i];
    const prev = units[i - 1];
    const vowel = [...marks].find((m) => SHORT[m]);
    const tanwin = [...marks].find((m) => TANWIN[m]);
    // Long vowels: alif after a fatha, yāʾ after a kasra, wāw after a damma, with no vowel of their own.
    if (prev && !vowel && !tanwin && !marks.includes(SHADDA)) {
      if (base === 'ا' && prev.marks.includes(FATHA)) {
        s = s.slice(0, -1) + 'ā';
        continue;
      }
      if (base === 'ي' && prev.marks.includes(KASRA)) {
        s = s.slice(0, -1) + 'ī';
        continue;
      }
      if (base === 'و' && prev.marks.includes(DAMMA)) {
        s = s.slice(0, -1) + 'ū';
        continue;
      }
      if (base === 'ى' && prev.marks.includes(FATHA)) {
        s = s.slice(0, -1) + 'ā';
        continue;
      }
      // The alif that only carries -an (كِتَابًا) is silent.
      if (base === 'ا' && prev.marks.includes('ً')) continue;
    }
    if (base === 'آ') {
      s += i === 0 ? 'ā' : 'ʾā';
      continue;
    }
    let consonant = AR[base];
    if (consonant === undefined) return null;
    if (i === 0 && consonant === 'ʾ') consonant = '';
    // A bare alif opening a word (ٱ, hamzat al-waṣl) or a plain one is read from its vowel.
    if (base === 'ا' && (vowel || i === 0)) consonant = '';
    // Tāʾ marbūṭa: the fatha before it already gave the a (madrasa); with tanwin it reads -tun.
    if (base === 'ة') {
      s += tanwin ? 't' + TANWIN[tanwin] : prev?.base === 'ا' ? 'h' : prev?.marks.includes(FATHA) ? '' : 'a';
      continue;
    }
    if (marks.includes(SHADDA)) consonant += consonant;
    s += consonant;
    if (vowel) s += SHORT[vowel];
    else if (tanwin) s += TANWIN[tanwin];
    else if (!marks.includes(SUKUN) && i < units.length - 1 && base !== 'ا' && base !== 'ى') {
      // A consonant inside the word with no mark at all: not fully vowelled.
      const next = units[i + 1];
      if (!(next.base === 'ا' || next.base === 'و' || next.base === 'ي')) return null;
    }
  }
  return s.replace(/^ʾ/, '');
}

const KANA: Record<string, string> = {};
{
  const rows: Array<[string, string, string[]]> = [
    ['あいうえお', 'アイウエオ', ['a', 'i', 'u', 'e', 'o']],
    ['かきくけこ', 'カキクケコ', ['ka', 'ki', 'ku', 'ke', 'ko']],
    ['さしすせそ', 'サシスセソ', ['sa', 'shi', 'su', 'se', 'so']],
    ['たちつてと', 'タチツテト', ['ta', 'chi', 'tsu', 'te', 'to']],
    ['なにぬねの', 'ナニヌネノ', ['na', 'ni', 'nu', 'ne', 'no']],
    ['はひふへほ', 'ハヒフヘホ', ['ha', 'hi', 'fu', 'he', 'ho']],
    ['まみむめも', 'マミムメモ', ['ma', 'mi', 'mu', 'me', 'mo']],
    ['やゆよ', 'ヤユヨ', ['ya', 'yu', 'yo']],
    ['らりるれろ', 'ラリルレロ', ['ra', 'ri', 'ru', 're', 'ro']],
    ['わをん', 'ワヲン', ['wa', 'o', 'n']],
    ['がぎぐげご', 'ガギグゲゴ', ['ga', 'gi', 'gu', 'ge', 'go']],
    ['ざじずぜぞ', 'ザジズゼゾ', ['za', 'ji', 'zu', 'ze', 'zo']],
    ['だぢづでど', 'ダヂヅデド', ['da', 'ji', 'zu', 'de', 'do']],
    ['ばびぶべぼ', 'バビブベボ', ['ba', 'bi', 'bu', 'be', 'bo']],
    ['ぱぴぷぺぽ', 'パピプペポ', ['pa', 'pi', 'pu', 'pe', 'po']],
    ['ぁぃぅぇぉ', 'ァィゥェォ', ['a', 'i', 'u', 'e', 'o']],
    ['ゔ', 'ヴ', ['vu']],
  ];
  for (const [h, k, r] of rows)
    r.forEach((roma, i) => {
      KANA[[...h][i]] = roma;
      KANA[[...k][i]] = roma;
    });
}
const SMALL_Y: Record<string, string> = {
  ゃ: 'a',
  ゅ: 'u',
  ょ: 'o',
  ャ: 'a',
  ュ: 'u',
  ョ: 'o',
};
/** Small vowels after a kana make sounds Japanese borrowed: ファ fa, ティ ti, チェ che, ウォ wo. */
const SMALL_V: Record<string, string> = {
  ぁ: 'a',
  ぃ: 'i',
  ぅ: 'u',
  ぇ: 'e',
  ぉ: 'o',
  ァ: 'a',
  ィ: 'i',
  ゥ: 'u',
  ェ: 'e',
  ォ: 'o',
};
const STEM: Record<string, string> = {
  u: 'w',
  fu: 'f',
  tsu: 'ts',
  vu: 'v',
  te: 't',
  de: 'd',
  to: 't',
  do: 'd',
  shi: 'sh',
  chi: 'ch',
  ji: 'j',
};
const MACRON: Record<string, string> = {
  a: 'ā',
  i: 'ī',
  u: 'ū',
  e: 'ē',
  o: 'ō',
};

/** Kana in modified Hepburn. Null when the word has anything but kana. */
export function romanizeKana(word: string): string | null {
  const chars = [...word];
  let s = '';
  let double = false;
  for (let i = 0; i < chars.length; i++) {
    const c = chars[i];
    if (c === 'っ' || c === 'ッ') {
      double = true;
      continue;
    }
    if (c === 'ー') {
      const last = s.at(-1);
      if (!last || !MACRON[last]) return null;
      s = s.slice(0, -1) + MACRON[last];
      continue;
    }
    let syl = KANA[c];
    if (syl === undefined) return null;
    const small = SMALL_Y[chars[i + 1] ?? ''];
    if (small && syl.endsWith('i') && syl.length > 1) {
      // きゃ kya; しゃ sha, ちゃ cha, じゃ ja (no y after sh, ch, j)
      const stem = syl.slice(0, -1);
      syl = /(sh|ch|j)$/.test(stem) ? stem + small : stem + 'y' + small;
      i++;
    }
    const smallV = SMALL_V[chars[i + 1] ?? ''];
    if (smallV && !small) {
      syl = (STEM[syl] ?? syl.slice(0, -1)) + smallV;
      i++;
    }
    if (double) {
      syl = syl.startsWith('ch') ? 't' + syl : syl[0] + syl;
      double = false;
    }
    if (syl === 'n' && /^[aiueoy]/.test(KANA[chars[i + 1] ?? ''] ?? '')) syl = "n'";
    s += syl;
  }
  return double ? null : s;
}

const KO_INITIAL = ['g', 'kk', 'n', 'd', 'tt', 'r', 'm', 'b', 'pp', 's', 'ss', '', 'j', 'jj', 'ch', 'k', 't', 'p', 'h'];
const KO_VOWEL = ['a', 'ae', 'ya', 'yae', 'eo', 'e', 'yeo', 'ye', 'o', 'wa', 'wae', 'oe', 'yo', 'u', 'wo', 'we', 'wi', 'yu', 'eu', 'ui', 'i'];
/** Final consonants as said at the end of a word; the clusters (ㄳ, ㄺ…) are left out (null). */
const KO_FINAL: Array<string | null> = ['', 'k', 'k', null, 'n', null, null, 't', 'l', null, null, null, null, null, null, null, 'm', 'p', null, 't', 't', 'ng', 't', 't', 'k', 't', 'p', 't'];

/** Hangul syllables split into their initial, vowel and final indices. */
export function hangulParts(syllable: string): [number, number, number] | null {
  const code = syllable.codePointAt(0)! - 0xac00;
  if (code < 0 || code > 11171) return null;
  return [Math.floor(code / 588), Math.floor((code % 588) / 28), code % 28];
}

/**
 * Revised Romanization for a word whose syllables, but the last, have no final consonant. Null for
 * any other word, where sound changes between syllables would make a letter-by-letter reading wrong.
 */
export function romanizeKo(word: string): string | null {
  const syllables = [...word];
  let s = '';
  for (let i = 0; i < syllables.length; i++) {
    const parts = hangulParts(syllables[i]);
    if (!parts) return null;
    const [ini, vow, fin] = parts;
    if (fin && i < syllables.length - 1) return null;
    const final = KO_FINAL[fin];
    if (final === null) return null;
    // ㄹ starting a word reads r (RR writes 라디오 radio); between vowels it is r too.
    s += KO_INITIAL[ini] + KO_VOWEL[vow] + final;
  }
  return s;
}

// Georgian: the national system of 2002, letter for letter; the apostrophe marks the ejectives.
const KA: Record<string, string> = {
  ა: 'a',
  ბ: 'b',
  გ: 'g',
  დ: 'd',
  ე: 'e',
  ვ: 'v',
  ზ: 'z',
  თ: 't',
  ი: 'i',
  კ: "k'",
  ლ: 'l',
  მ: 'm',
  ნ: 'n',
  ო: 'o',
  პ: "p'",
  ჟ: 'zh',
  რ: 'r',
  ს: 's',
  ტ: "t'",
  უ: 'u',
  ფ: 'p',
  ქ: 'k',
  ღ: 'gh',
  ყ: "q'",
  შ: 'sh',
  ჩ: 'ch',
  ც: 'ts',
  ძ: 'dz',
  წ: "ts'",
  ჭ: "ch'",
  ხ: 'kh',
  ჯ: 'j',
  ჰ: 'h',
};

export function romanizeKa(word: string): string | null {
  let s = '';
  for (const c of word) {
    if (!KA[c]) return null;
    s += KA[c];
  }
  return s;
}

/** Each language's romanizer; Arabic needs the vowelled spelling. */
export const ROMANIZE: Record<string, (word: string) => string | null> = {
  ru: romanizeRu,
  el: romanizeEl,
  ar: romanizeAr,
  ja: romanizeKana,
  ko: romanizeKo,
  ka: romanizeKa,
};
