// Which of a script's letters a word uses: the reading exercises only offer words made of letters
// already learned. Pure and self-contained (no `@/` imports) so the word-mining script can use it.

const GREEK_PAIRS = ['αι', 'ει', 'οι', 'ου', 'αυ', 'ευ', 'μπ', 'ντ', 'γκ', 'γγ'];

/** Greek letters without accents, a diaeresis keeping the letter apart (marked by a leading '|'). */
function greekChars(word: string): string[] {
  const out: string[] = [];
  for (const c of word.toLowerCase().normalize('NFD')) {
    if (c === '̈') out[out.length - 1] = '|' + out[out.length - 1];
    else if (!/\p{M}/u.test(c)) out.push(c === 'ς' ? 'σ' : c);
  }
  return out;
}

const AR_SEATS: Record<string, string[]> = {
  أ: ['ا', 'ء'],
  إ: ['ا', 'ء'],
  آ: ['ا', 'ء'],
  ؤ: ['و', 'ء'],
  ئ: ['ي', 'ء'],
};
const AR_MARKS: Record<string, string> = {
  'َ': 'بَ',
  'ِ': 'بِ',
  'ُ': 'بُ',
  'ْ': 'بْ',
  'ّ': 'بّ',
};

/** Small kana read as their big forms for this purpose (ゃ as や); っ as つ. */
const SMALL: Record<string, string> = {};
for (const [s, b] of [
  ['ぁぃぅぇぉゃゅょっゎ', 'あいうえおやゆよつわ'],
  ['ァィゥェォャュョッヮ', 'アイウエオヤユヨツワ'],
])
  [...s].forEach((c, i) => (SMALL[c] = [...b][i]));

const KO_INITIAL = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ';
const KO_VOWEL = 'ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ';
const KO_FINAL = [
  '',
  'ㄱ',
  'ㄲ',
  'ㄱㅅ',
  'ㄴ',
  'ㄴㅈ',
  'ㄴㅎ',
  'ㄷ',
  'ㄹ',
  'ㄹㄱ',
  'ㄹㅁ',
  'ㄹㅂ',
  'ㄹㅅ',
  'ㄹㅌ',
  'ㄹㅍ',
  'ㄹㅎ',
  'ㅁ',
  'ㅂ',
  'ㅂㅅ',
  'ㅅ',
  'ㅆ',
  'ㅇ',
  'ㅈ',
  'ㅊ',
  'ㅋ',
  'ㅌ',
  'ㅍ',
  'ㅎ',
];

const TONE_MARKS: Record<string, [string, number]> = {};
for (const [base, marks] of [
  ['a', 'āáǎà'],
  ['e', 'ēéěè'],
  ['i', 'īíǐì'],
  ['o', 'ōóǒò'],
  ['u', 'ūúǔù'],
  ['ü', 'ǖǘǚǜ'],
] as const)
  [...marks].forEach((m, i) => (TONE_MARKS[m] = [base, i + 1]));

const INITIALS = ['zh', 'ch', 'sh', 'b', 'p', 'm', 'f', 'd', 't', 'n', 'l', 'g', 'k', 'h', 'j', 'q', 'x', 'r', 'z', 'c', 's'];
const Y_W: Record<string, string> = {
  yi: 'i',
  ya: 'ia',
  ye: 'ie',
  yao: 'iao',
  you: 'iu',
  yan: 'ian',
  yin: 'in',
  yang: 'iang',
  ying: 'ing',
  yong: 'iong',
  yu: 'ü',
  yue: 'üe',
  yuan: 'üan',
  yun: 'ün',
  wu: 'u',
  wa: 'ua',
  wo: 'uo',
  wai: 'uai',
  wei: 'ui',
  wan: 'uan',
  wen: 'un',
  wang: 'uang',
};

/** A pinyin syllable's initial, final and tone (0 neutral); null when it isn't one. */
export function pinyinParts(syllable: string): { initial: string; final: string; tone: number } | null {
  let tone = 0;
  let plain = '';
  for (const c of syllable.toLowerCase().normalize('NFC')) {
    const hit = TONE_MARKS[c];
    if (hit) {
      plain += hit[0];
      tone = hit[1];
    } else plain += c === 'v' ? 'ü' : c;
  }
  if (!/^[a-zü]+$/.test(plain)) return null;
  const initial = INITIALS.find((i) => plain.startsWith(i) && plain.length > i.length) ?? '';
  let final = plain.slice(initial.length);
  if (!initial) final = Y_W[final] ?? final;
  else if ('jqx'.includes(initial) && final.startsWith('u')) final = 'ü' + final.slice(1);
  return { initial, final, tone };
}

/** Pinyin as written in a dictionary ("nǐ hǎo", "nǐhǎo") split into syllables. */
export function pinyinSyllables(pinyin: string): string[] {
  const out: string[] = [];
  for (const part of pinyin.split(/[\s'’-]+/).filter(Boolean)) {
    // Split run-together syllables greedily: an initial starts a new syllable after a vowel or n/ng.
    const m = part.match(/(?:zh|ch|sh|[bpmfdtnlgkhjqxrzcsyw])?[aeiouüvāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]+(?:ng|n(?![aeiouüāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ])|r(?![aeiouü]))?/gi);
    if (!m || m.join('') !== part) return [];
    out.push(...m);
  }
  return out;
}

/**
 * The ids of the letters a word uses, by the language's own way of spelling. `latin` is needed for
 * Mandarin, whose units are read from the word's pinyin.
 */
export function lettersInWord(lang: string, word: string, latin = ''): string[] {
  const out = new Set<string>();
  if (lang === 'ru') {
    for (const c of word.normalize('NFD').replace(/[̀́]/g, '').normalize('NFC').toLowerCase()) out.add(c);
  } else if (lang === 'el') {
    const chars = greekChars(word);
    chars.forEach((c, i) => {
      out.add(c.replace('|', ''));
      const next = chars[i + 1];
      if (next && !next.startsWith('|') && GREEK_PAIRS.includes(c + next)) out.add(c + next);
    });
  } else if (lang === 'ar') {
    for (const c of word.replace(/ـ/g, '')) {
      if (AR_MARKS[c]) out.add(AR_MARKS[c]);
      else if (AR_SEATS[c]) AR_SEATS[c].forEach((x) => out.add(x));
      else if (!/[ً-ٰٟ]/.test(c)) out.add(c);
    }
  } else if (lang === 'ja') {
    for (const c of word) if (c !== 'ー') out.add(SMALL[c] ?? c);
  } else if (lang === 'ko') {
    for (const s of word) {
      const code = s.codePointAt(0)! - 0xac00;
      if (code < 0 || code > 11171) {
        out.add(s);
        continue;
      }
      out.add(KO_INITIAL[Math.floor(code / 588)]);
      out.add(KO_VOWEL[Math.floor((code % 588) / 28)]);
      for (const f of KO_FINAL[code % 28]) out.add(f);
    }
  } else if (lang === 'zh') {
    for (const c of word) out.add(c);
    for (const syl of pinyinSyllables(latin)) {
      const p = pinyinParts(syl);
      if (!p) continue;
      if (p.initial) out.add(p.initial);
      out.add(p.final);
      out.add(`tone${p.tone}`);
    }
  } else for (const c of word.toLowerCase()) out.add(c);
  return [...out];
}
