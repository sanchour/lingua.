// Which of Lingua's languages a text is in: by its alphabet first, then by the little words every
// sentence is full of. Good enough to sort song lyrics and titles; not for a line or two of text.

/** Common function words, most frequent first. Words shared between languages count for each. */
const STOPWORDS: Record<string, string[]> = {
  en: ['the', 'you', 'and', 'i', 'to', 'a', 'it', 'me', 'my', 'is', 'in', 'that', 'of', 'your', 'on', 'be', 'all', 'know', 'what', 'don’t', "don't", 'with', 'for', 'this', 'love', 'just', 'like', 'when', 'oh', 'baby', 'can', 'are', 'we', 'so', 'now', 'never', 'got'],
  es: ['que', 'de', 'la', 'y', 'el', 'me', 'te', 'en', 'no', 'mi', 'tu', 'yo', 'lo', 'se', 'es', 'un', 'una', 'los', 'por', 'con', 'las', 'si', 'más', 'pero', 'como', 'quiero', 'para', 'amor', 'corazón', 'cuando', 'ya', 'nada', 'eres', 'contigo', 'tú', 'qué', 'porque', 'del', 'está', 'sin', 'vida'],
  pt: ['que', 'de', 'e', 'o', 'a', 'eu', 'não', 'você', 'me', 'um', 'é', 'do', 'da', 'em', 'meu', 'minha', 'com', 'se', 'pra', 'mais', 'mas', 'uma', 'te', 'no', 'na', 'tudo', 'quando', 'coração', 'vou', 'amor', 'sem', 'só', 'tô', 'ela', 'nós', 'também', 'agora', 'aqui', 'isso', 'vai'],
  fr: ['je', 'de', 'la', 'le', 'et', 'que', 'tu', 'pas', 'les', 'un', 'à', 'ne', 'est', 'une', 'des', 'il', 'mon', 'moi', 'qui', 'en', 'on', 'dans', 'pour', 'toi', 'ma', 'me', 'elle', 'plus', 'mais', 'nous', 'avec', 'sur', 'ce', 'tout', 'comme', 'c’est', "c'est", 'j’ai', "j'ai", 'suis', 'vous', 'au'],
  de: ['ich', 'die', 'und', 'du', 'der', 'das', 'nicht', 'ist', 'es', 'in', 'mich', 'mir', 'ein', 'zu', 'wir', 'sie', 'den', 'dich', 'mit', 'auf', 'dir', 'eine', 'so', 'noch', 'was', 'auch', 'hab', 'bin', 'nur', 'dem', 'wenn', 'kein', 'wie', 'mein', 'für', 'alles', 'immer', 'doch', 'schon', 'nie'],
  it: ['che', 'e', 'di', 'non', 'il', 'la', 'mi', 'un', 'ti', 'io', 'è', 'a', 'per', 'tu', 'una', 'ma', 'si', 'lo', 'sono', 'me', 'con', 'come', 'più', 'se', 'del', 'te', 'della', 'nel', 'cuore', 'amore', 'sei', 'anche', 'tutto', 'ho', 'gli', 'questo', 'quando', 'ancora', 'perché', 'niente'],
  sv: ['och', 'jag', 'du', 'det', 'att', 'är', 'en', 'som', 'inte', 'på', 'i', 'med', 'mig', 'dig', 'för', 'vi', 'den', 'har', 'så', 'om', 'kan', 'vill', 'när', 'ett', 'min', 'av', 'men', 'bara', 'till', 'ska', 'här', 'aldrig', 'mitt', 'allt', 'var', 'nu', 'hon', 'han', 'hur'],
  hu: ['a', 'az', 'és', 'hogy', 'nem', 'egy', 'én', 'te', 'is', 'de', 'van', 'meg', 'csak', 'már', 'mint', 'még', 'ha', 'mert', 'vagy', 'el', 'ki', 'be', 'fel', 'minden', 'nekem', 'neked', 'engem', 'téged', 'szeretlek', 'ez', 'azt', 'volt', 'lesz', 'így', 'mi', 'most', 'sem', 'nincs', 'itt', 'ott'],
  nl: ['ik', 'je', 'de', 'het', 'een', 'en', 'is', 'niet', 'dat', 'van', 'in', 'op', 'me', 'mij', 'jij', 'we', 'wat', 'zijn', 'maar', 'met', 'voor', 'nog', 'als', 'er', 'ze', 'die', 'dan', 'mijn', 'jou', 'heb', 'ben', 'wil', 'weet', 'nooit', 'alles', 'naar', 'hier', 'gaan', 'liefde', 'hart'],
  nb: ['jeg', 'du', 'og', 'det', 'er', 'en', 'som', 'ikke', 'på', 'i', 'med', 'meg', 'deg', 'for', 'vi', 'den', 'har', 'så', 'om', 'kan', 'vil', 'når', 'et', 'min', 'av', 'men', 'bare', 'til', 'skal', 'her', 'aldri', 'mitt', 'alt', 'var', 'nå', 'hun', 'han', 'hvor', 'hva', 'ikkje'],
  tr: ['bir', 've', 'bu', 'ben', 'sen', 'ne', 'de', 'da', 'ki', 'için', 'gibi', 'çok', 'var', 'yok', 'ama', 'beni', 'seni', 'bana', 'sana', 'her', 'şey', 'daha', 'olan', 'kadar', 'mi', 'mı', 'değil', 'aşk', 'bütün', 'hiç', 'gel', 'benim', 'senin', 'o', 'bizi', 'şimdi', 'artık', 'neden', 'nasıl'],
  id: ['aku', 'kamu', 'yang', 'dan', 'di', 'ini', 'itu', 'tak', 'tidak', 'ku', 'akan', 'dengan', 'untuk', 'ada', 'dia', 'kita', 'cinta', 'hati', 'bisa', 'ke', 'dari', 'saja', 'lagi', 'semua', 'karena', 'sudah', 'mau', 'apa', 'jangan', 'selalu', 'hanya', 'masih', 'pernah', 'kau', 'engkau', 'bukan', 'juga', 'harus', 'sampai', 'kami'],
  sw: ['na', 'ya', 'wa', 'kwa', 'ni', 'za', 'la', 'katika', 'mimi', 'wewe', 'yeye', 'sisi', 'nakupenda', 'pia', 'hii', 'huo', 'lakini', 'kama', 'sana', 'tu', 'hapa', 'leo', 'nini', 'gani', 'bado', 'kila', 'wangu', 'wako', 'moyo', 'mapenzi', 'sasa', 'hakuna', 'hata', 'tena', 'kwenye', 'yangu', 'yako', 'nataka', 'mpenzi', 'kweli'],
  la: ['et', 'in', 'est', 'non', 'ad', 'cum', 'quod', 'ut', 'sed', 'qui', 'quae', 'de', 'ex', 'per', 'enim', 'sunt', 'esse', 'nec', 'atque', 'ac', 'autem', 'quam', 'tamen', 'etiam', 'nos', 'vos', 'tu', 'ego', 'mea', 'tua', 'deus', 'domine', 'nobis', 'pro', 'sicut', 'sub', 'super', 'omnia', 'hic', 'mihi', 'tuum', 'tuus', 'meum', 'meus', 'nomen', 'quia', 'ubi', 'regnum', 'sum', 'es'],
  // Beta languages (3.0-1b), written in Latin letters: a short list each.
  pl: ['i', 'nie', 'się', 'w', 'na', 'to', 'że', 'jest', 'z', 'do', 'ja', 'ty', 'co', 'jak', 'mnie', 'tak', 'ale', 'mi', 'już', 'mój'],
  cs: ['a', 'je', 'se', 'na', 'to', 'že', 'v', 'jsem', 'ne', 's', 'já', 'ty', 'co', 'jak', 'mě', 'tak', 'ale', 'mi', 'už', 'můj'],
  ro: ['și', 'de', 'în', 'nu', 'la', 'că', 'cu', 'mai', 'pe', 'o', 'un', 'eu', 'tu', 'ce', 'mă', 'te', 'am', 'e', 'este', 'dar'],
  vi: ['và', 'là', 'của', 'không', 'có', 'tôi', 'anh', 'em', 'một', 'những', 'cho', 'với', 'này', 'đã', 'được', 'người', 'trong', 'yêu', 'thì', 'mình'],
  tl: ['ang', 'ng', 'sa', 'na', 'ko', 'mo', 'ako', 'ikaw', 'ka', 'at', 'hindi', 'mga', 'siya', 'ay', 'kita', 'lang', 'pa', 'ba', 'naman', 'pag'],
  ms: ['yang', 'dan', 'di', 'ini', 'itu', 'tidak', 'aku', 'kau', 'awak', 'saya', 'akan', 'dengan', 'untuk', 'ada', 'dia', 'kita', 'cinta', 'hati', 'sudah', 'tak'],
  uz: ['va', 'bu', 'men', 'sen', 'u', 'bilan', 'uchun', 'emas', 'bor', 'yoʻq', 'ham', 'edi', 'bir', 'nima', 'qanday', 'meni', 'seni', 'sevgi', 'juda', 'endi'],
  sh: ['i', 'je', 'da', 'se', 'u', 'na', 'ne', 'ja', 'ti', 'to', 'sam', 'si', 'mi', 'me', 'te', 'ali', 'kao', 'što', 'sve', 'moj'],
};

/** Letters that belong to one script each: the alphabet says the language before any word does. */
const SCRIPTS: Array<[RegExp, string]> = [
  [/\p{Script=Cyrillic}/u, 'ru'],
  [/\p{Script=Greek}/u, 'el'],
  [/\p{Script=Arabic}/u, 'ar'],
  [/\p{Script=Hangul}/u, 'ko'],
  // Kana means Japanese; Han characters alone mean Mandarin (see below).
  [/[\p{Script=Hiragana}\p{Script=Katakana}]/u, 'ja'],
  [/\p{Script=Han}/u, 'zh'],
  [/\p{Script=Devanagari}/u, 'hi'],
  [/\p{Script=Thai}/u, 'th'],
  [/\p{Script=Tamil}/u, 'ta'],
  [/\p{Script=Georgian}/u, 'ka'],
];

/** Within a shared script, letters or characters only one of its languages uses. */
const SCRIPT_SPLITS: Array<[from: string, re: RegExp, to: string]> = [
  ['ar', /[پچژگکی]/, 'fa'],
  ['ru', /[өүӨҮ]/, 'mn'],
  ['ru', /[ђјљњћџЂЈЉЊЋЏ]/, 'sh'],
  // Written Cantonese: 嘅 咗 喺 佢 冇 嘢 唔 哋 啲.
  ['zh', /[嘅咗喺佢冇嘢唔哋啲]/, 'yue'],
];

/** Letters only some languages use, each a gentle hint. */
const LETTER_HINTS: Array<[RegExp, string[]]> = [
  [/[őű]/, ['hu']],
  [/ñ/, ['es']],
  [/[ãõ]/, ['pt']],
  [/ç/, ['pt', 'fr']],
  [/å/, ['sv']],
  [/ß/, ['de']],
  [/[ìò]/, ['it']],
  [/[êœ]/, ['fr', 'pt']],
  [/[ąęłńśźż]/, ['pl']],
  [/[ěřů]/, ['cs']],
  [/[șțăî]/, ['ro']],
  [/[ơưạảậắằặẹẻẽếềểễệịọỏốồổỗộớờởỡợụủứừửữự]/, ['vi']],
  [/[og]ʻ/, ['uz']],
  [/[ćđ]/, ['sh']],
];

const WORD = /[\p{L}’']+/gu;
const sets = Object.fromEntries(Object.entries(STOPWORDS).map(([l, words]) => [l, new Set(words)]));

export interface Detected {
  lang: string;
  /** 0–1: how clearly the text belongs to it. */
  confidence: number;
}

/** The language of a text, or null when it's too short or unclear. */
export function detectLanguage(text: string): Detected | null {
  const letters = text.match(/\p{L}/gu) ?? [];
  if (letters.length < 12) return null;
  const share: Record<string, number> = {};
  for (const c of letters) {
    const hit = SCRIPTS.find(([re]) => re.test(c));
    if (hit) share[hit[1]] = (share[hit[1]] ?? 0) + 1 / letters.length;
  }
  // Japanese mixes kana with Han characters: a fair share of kana is enough.
  if ((share.ja ?? 0) > 0.15 && (share.ja ?? 0) + (share.zh ?? 0) > 0.5) return { lang: 'ja', confidence: Math.min(1, (share.ja ?? 0) + (share.zh ?? 0)) };
  for (const lang of ['ru', 'el', 'ar', 'ko', 'zh', 'hi', 'th', 'ta', 'ka']) {
    if ((share[lang] ?? 0) <= 0.5) continue;
    const split = SCRIPT_SPLITS.find(([from, re]) => from === lang && re.test(text));
    return { lang: split?.[2] ?? lang, confidence: Math.min(1, share[lang]) };
  }

  const words = (text.toLocaleLowerCase().match(WORD) ?? []).map((w) => w.replace(/'/g, '’').replace(/^’|’$/g, ''));
  if (words.length < 4) return null;
  const score: Record<string, number> = {};
  for (const [lang, set] of Object.entries(sets)) {
    let hits = 0;
    for (const w of words) if (set.has(w) || set.has(w.replace(/’/g, "'"))) hits++;
    score[lang] = hits / words.length;
  }
  const lower = text.toLocaleLowerCase();
  for (const [re, langs] of LETTER_HINTS) if (re.test(lower)) for (const l of langs) score[l] += 0.04;

  const ranked = Object.entries(score).sort((a, b) => b[1] - a[1]);
  const [[best, top], [, second]] = ranked;
  if (top < 0.12) return null;
  return { lang: best, confidence: Math.min(1, (top - second) / top) };
}

/** True when the text is clearly in `lang` (or can't be told apart from it). */
export function looksLike(text: string, lang: string): boolean {
  const found = detectLanguage(text);
  return found?.lang === lang;
}
