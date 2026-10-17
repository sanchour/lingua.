// Likely base forms of a word the dictionary doesn't list as written: a Hungarian case form
// ("könyvtárban" → könyvtár), a Swedish definite form ("bilarna" → bil), a Spanish verb with its
// pronouns attached ("dímelo" → di, "hacerlo" → hacer), a Portuguese one with a hyphen ("disse-me"
// → disse). Only a guess: the dictionary decides which candidate is a word.

import { deinflect } from './japanese.ts';

/** Endings to try, longest first per language; each maps to what the base form ends in instead. */
type Rule = [ending: string, ...replacements: string[]];

const HU_CASE: Rule[] = [
  ['ból', ''], ['ből', ''], ['ban', ''], ['ben', ''], ['nak', ''], ['nek', ''], ['hoz', ''], ['hez', ''], ['höz', ''],
  ['tól', ''], ['től', ''], ['ról', ''], ['ről', ''], ['nál', ''], ['nél', ''], ['val', ''], ['vel', ''], ['ért', ''],
  ['ként', ''], ['kor', ''], ['ig', ''], ['ba', ''], ['be', ''], ['ra', ''], ['re', ''], ['on', ''], ['en', ''], ['ön', ''],
  ['ot', ''], ['et', ''], ['öt', ''], ['at', ''], ['n', ''], ['t', ''],
];
const HU_NUMBER: Rule[] = [
  // possessives and plurals
  ['jaink', ''], ['jeink', ''], ['aink', ''], ['eink', ''], ['jaim', ''], ['jeim', ''], ['aim', ''], ['eim', ''],
  ['jaid', ''], ['jeid', ''], ['jai', ''], ['jei', ''], ['ai', ''], ['ei', ''], ['juk', ''], ['jük', ''], ['unk', ''], ['ünk', ''],
  ['uk', ''], ['ük', ''], ['ja', ''], ['je', ''], ['om', ''], ['em', ''], ['öm', ''], ['am', ''], ['od', ''], ['ed', ''], ['öd', ''],
  ['ok', ''], ['ek', ''], ['ök', ''], ['ak', ''], ['m', ''], ['d', ''], ['k', ''], ['a', ''], ['e', ''], ['i', ''],
];
const HU_VERB: Rule[] = [
  ['játok', ''], ['itek', ''], ['tatok', ''], ['tetek', ''], ['ottam', ''], ['ettem', ''], ['öttem', ''],
  ['tunk', ''], ['tünk', ''], ['tam', ''], ['tem', ''], ['tál', ''], ['tél', ''], ['ták', ''], ['ték', ''], ['tak', ''], ['tek', ''],
  ['ott', ''], ['ett', ''], ['ött', ''], ['nék', ''], ['nánk', ''], ['nénk', ''], ['na', ''], ['ne', ''], ['ják', ''], ['ik', ''],
  ['ni', ''], ['unk', ''], ['ünk', ''], ['tok', ''], ['tek', ''], ['tök', ''], ['sz', ''], ['ol', ''], ['el', ''], ['öl', ''],
  ['om', ''], ['em', ''], ['öm', ''], ['ok', ''], ['ek', ''], ['ök', ''], ['od', ''], ['ed', ''], ['öd', ''], ['ja', ''], ['i', ''],
];

const RULES: Record<string, Rule[]> = {
  sv: [
    ['arnas', ''], ['ornas', ''], ['ernas', ''], ['arna', ''], ['orna', ''], ['erna', ''], ['ande', ''], ['ende', ''], ['aste', ''],
    ['dde', ''], ['are', ''], ['ast', ''], ['ens', ''], ['ets', ''], ['na', ''], ['ar', '', 'a'], ['or', 'a'], ['er', '', 'e'],
    ['en', '', 'e'], ['et', '', 'e'], ['de', '', 'a'], ['te', '', 'a'], ['ts', ''], ['ns', ''], ['s', ''], ['n', ''], ['t', ''],
    ['r', ''], ['a', ''],
  ],
  es: [
    ['mente', ''], ['ísimos', 'o'], ['ísimas', 'a'], ['ísimo', 'o'], ['ísima', 'a'], ['itos', 'o'], ['itas', 'a'], ['ito', 'o'], ['ita', 'a'],
    ['ces', 'z'], ['es', ''], ['s', ''],
  ],
  pt: [
    ['mente', ''], ['ões', 'ão'], ['ães', 'ão'], ['inhos', 'o'], ['inhas', 'a'], ['inho', 'o'], ['inha', 'a'], ['ns', 'm'], ['is', 'l'],
    ['es', ''], ['s', ''],
  ],
  it: [['mente', 'o', 'e'], ['issimi', 'o'], ['issime', 'a'], ['issimo', 'o'], ['issima', 'a'], ['i', 'o', 'e'], ['e', 'a']],
  fr: [['ment', ''], ['aux', 'al'], ['eux', 'eu'], ['es', 'e', ''], ['s', ''], ['x', '']],
  en: [['ies', 'y'], ['ied', 'y'], ['ing', '', 'e'], ['ed', '', 'e'], ['es', ''], ['s', ''], ['ly', ''], ["'s", '']],
  de: [['innen', 'in'], ['ern', ''], ['em', ''], ['en', '', 'e'], ['er', ''], ['es', ''], ['e', ''], ['n', ''], ['s', '']],
  // Dutch: plurals (boeken, auto's), little ones (huisje, boompje), adjectives (grote), verbs (werkt, werkte).
  nl: [
    ['etjes', ''], ['tjes', ''], ['pjes', ''], ['jes', ''], ['etje', ''], ['tje', ''], ['pje', ''], ['je', ''], ["'s", ''], ['eren', ''],
    ['den', '', 'en'], ['ten', '', 'en'], ['de', 'en', ''], ['te', 'en', ''], ['en', '', 'e'], ['er', ''], ['st', ''], ['e', '', 'en'],
    ['s', ''], ['t', '', 'en'], ['d', 'en'],
  ],
  // Norwegian: definite and plural nouns (bilen, bilene, huset), adjectives (store), verbs (snakker, snakket).
  nb: [
    ['ene', '', 'e'], ['ane', ''], ['ene', ''], ['en', '', 'e'], ['et', '', 'e'], ['er', '', 'e'], ['te', '', 'e'], ['de', '', 'e'], ['a', '', 'e'],
    ['e', ''], ['t', ''], ['r', ''], ['s', ''],
  ],
  // Latin: -que, -ne and -ve are written onto the word before them (populusque, estne).
  la: [['que', ''], ['ne', ''], ['ve', '']],
};

// ── Korean ──────────────────────────────────────────────────────────────────

/** Particles written onto a Korean word, longest first (학교에서 → 학교, 친구한테 → 친구). */
const KO_PARTICLES = [
  '에서부터', '에서는', '에서도', '에게서', '한테서', '으로는', '으로도', '으로서', '으로써', '에게는', '한테는', '까지는', '부터는', '이라고', '라고',
  '에서', '에게', '한테', '께서', '으로', '부터', '까지', '처럼', '보다', '하고', '이랑', '마저', '조차', '밖에', '이나', '이든', '마다', '께',
  '랑', '나', '은', '는', '이', '가', '을', '를', '의', '에', '도', '만', '로', '와', '과', '요', '든',
];
/** The copula after a noun: 학생이에요, 의사예요, 학생입니다, 친구야. */
const KO_COPULA = ['이었습니다', '였습니다', '이었어요', '였어요', '이에요', '예요', '입니다', '이었다', '였다', '이야', '이다', '이고', '이지만', '야'];
/** Verb and adjective endings after the stem: 먹고, 먹지만, 먹는데, 먹으면, 먹습니다 → 먹다. */
const KO_ENDINGS = [
  '습니다', '습니까', '으세요', '으시다', '는데요', '지만', '는데', '은데', '으면', '으니까', '니까', '어서', '아서', '어도', '아도', '어요', '아요', '어야',
  '아야', '세요', '시다', '고', '면', '지', '게', '기', '는', '은', '던', '자', '죠', '네',
];
const SYLLABLE_BASE = 0xac00;
const isSyllable = (c: string) => c >= '가' && c <= '힣';
/** The final consonant (batchim) of a Hangul syllable: 0 none, 4 ㄴ, 8 ㄹ, 17 ㅂ, 20 ㅆ. */
const finalOf = (c: string) => (c.charCodeAt(0) - SYLLABLE_BASE) % 28;
const withoutFinal = (c: string) => String.fromCharCode(c.charCodeAt(0) - finalOf(c));

function korean(word: string): string[] {
  const out: string[] = [];
  for (const p of KO_PARTICLES) if (word.endsWith(p) && word.length > p.length) out.push(word.slice(0, -p.length));
  for (const c of KO_COPULA) if (word.endsWith(c) && word.length > c.length) out.push(word.slice(0, -c.length));
  for (const e of KO_ENDINGS) if (word.endsWith(e) && word.length > e.length) out.push(`${word.slice(0, -e.length)}다`);
  // A final consonant that is an ending: 갑니다 (ㅂ니다), 간 and 갈 (ㄴ, ㄹ), 갔어 (past ㅆ) → 가다; 했어 → 하다.
  for (let i = word.length - 1; i >= 0; i--) {
    const c = word[i];
    if (!isSyllable(c)) break;
    const fin = finalOf(c);
    if ([4, 8, 17, 20].includes(fin)) {
      const stem = word.slice(0, i) + withoutFinal(c);
      out.push(`${stem}다`);
      if (withoutFinal(c) === '해') out.push(`${word.slice(0, i)}하다`);
    }
    if (word.length - i >= 3) break;
  }
  // 해요, 해서, 했어: 하다 verbs.
  const ha = /^(.+?)(?:해요|해서|해도|했어요|했어|했다|했습니다|해)$/.exec(word);
  if (ha) out.push(`${ha[1]}하다`, ha[1]);
  return out;
}

// ── Turkish ─────────────────────────────────────────────────────────────────

/** Case, plural and possessive endings in all their vowel-harmony shapes, longest first. */
const TR_NOUN = [
  'lerinden', 'larından', 'lerinde', 'larında', 'lerine', 'larına', 'lerini', 'larını', 'lerin', 'ların', 'leri', 'ları', 'ler', 'lar',
  'ımızda', 'imizde', 'umuzda', 'ümüzde', 'ımız', 'imiz', 'umuz', 'ümüz', 'ınız', 'iniz', 'unuz', 'ünüz',
  'ndan', 'nden', 'nda', 'nde', 'nın', 'nin', 'nun', 'nün', 'yla', 'yle', 'dan', 'den', 'tan', 'ten', 'da', 'de', 'ta', 'te',
  'na', 'ne', 'nı', 'ni', 'nu', 'nü', 'ya', 'ye', 'yı', 'yi', 'yu', 'yü', 'ın', 'in', 'un', 'ün', 'la', 'le', 'sı', 'si', 'su', 'sü',
  'ım', 'im', 'um', 'üm', 'ca', 'ce', 'a', 'e', 'ı', 'i', 'u', 'ü', 'm', 'n',
];
/** Tense (with its negative) and person endings of verbs: geliyorum, gelmedi, gelecek → gelmek. */
const TR_TENSE = [
  'mıyor', 'miyor', 'muyor', 'müyor', 'ıyor', 'iyor', 'uyor', 'üyor', 'yor', 'madı', 'medi', 'mamış', 'memiş', 'mayacak', 'meyecek', 'maz', 'mez',
  'acak', 'ecek', 'yacak', 'yecek', 'mış', 'miş', 'muş', 'müş', 'malı', 'meli', 'dı', 'di', 'du', 'dü', 'tı', 'ti', 'tu', 'tü', 'sa', 'se',
  'ır', 'ir', 'ur', 'ür', 'ar', 'er', 'ma', 'me', 'r',
];
const TR_PERSON = ['sunuz', 'sünüz', 'sınız', 'siniz', 'lar', 'ler', 'sun', 'sün', 'sın', 'sin', 'nız', 'niz', 'nuz', 'nüz', 'um', 'üm', 'ım', 'im', 'uz', 'üz', 'ız', 'iz', 'm', 'n', 'k', ''];

function turkish(word: string): string[] {
  const out: string[] = [];
  // Up to two layers of noun endings (evlerimizde → evlerimiz → evler → ev).
  let layer = [word];
  for (let depth = 0; depth < 3; depth++) {
    const next: string[] = [];
    for (const w of layer) for (const e of TR_NOUN) if (w.endsWith(e) && w.length - e.length >= 2) next.push(w.slice(0, -e.length));
    out.push(...next);
    layer = next.slice(0, 12);
  }
  for (const p of TR_PERSON) {
    if (!word.endsWith(p)) continue;
    const rest = word.slice(0, word.length - p.length);
    for (const t of TR_TENSE) {
      if (!rest.endsWith(t) || rest.length - t.length < 2) continue;
      const stem = rest.slice(0, -t.length);
      out.push(`${stem}mek`, `${stem}mak`);
    }
  }
  if (/m[ae]k$/.test(word)) return out;
  // The stem itself is the command form: gel → gelmek.
  out.push(`${word}mek`, `${word}mak`);
  return out;
}

// ── Arabic ──────────────────────────────────────────────────────────────────

/** Words written onto the front: و and, ف so, ب with, ل for, ك like, ال the, س will. */
const AR_PREFIXES = ['وبال', 'وال', 'فال', 'بال', 'كال', 'ولل', 'لل', 'ال', 'وس', 'و', 'ف', 'ب', 'ل', 'ك', 'س'];
/** Pronouns written onto the end (كتابه his book, كتابها, كتابهم) and plural or dual endings. */
const AR_SUFFIXES = ['هما', 'كما', 'تهم', 'هم', 'هن', 'كم', 'كن', 'نا', 'ها', 'ني', 'ه', 'ك', 'ي', 'ات', 'ون', 'ين', 'ان', 'وا'];

function arabic(word: string): string[] {
  const out: string[] = [];
  const stems = [word];
  for (const p of AR_PREFIXES) if (word.startsWith(p) && word.length - p.length >= 2) stems.push(word.slice(p.length));
  for (const s of stems) {
    if (s !== word) out.push(s);
    for (const x of AR_SUFFIXES) {
      if (!s.endsWith(x) || s.length - x.length < 2) continue;
      const base = s.slice(0, -x.length);
      out.push(base);
      // ة becomes ت before an ending: سيارتي is سيارة; feminine plurals end in ات: مدرسات → مدرسة.
      if (base.endsWith('ت')) out.push(`${base.slice(0, -1)}ة`);
      if (x === 'ات') out.push(`${base}ة`);
    }
  }
  return out;
}

// ── Indonesian ──────────────────────────────────────────────────────────────

const ID_PARTICLES = ['nya', 'lah', 'kah', 'pun', 'ku', 'mu'];
const ID_SUFFIXES = ['kan', 'an', 'i', ''];
/** Prefixes with the first sound of the root they swallow: membaca, memukul (pukul), menulis (tulis), mengambil, menyapu (sapu). */
const ID_PREFIXES: Array<[string, string[]]> = [
  ['meny', ['s']], ['meng', ['', 'k']], ['mem', ['', 'p']], ['men', ['', 't']], ['me', ['']], ['peny', ['s']], ['peng', ['', 'k']], ['pem', ['', 'p']],
  ['pen', ['', 't']], ['per', ['']], ['pe', ['']], ['ber', ['']], ['be', ['']], ['ter', ['']], ['di', ['']], ['ke', ['']], ['se', ['']],
];

function indonesian(word: string): string[] {
  const out: string[] = [];
  const bare = [word];
  for (const p of ID_PARTICLES) if (word.endsWith(p) && word.length - p.length >= 3) bare.push(word.slice(0, -p.length));
  for (const w of bare) {
    for (const s of ID_SUFFIXES) {
      if (!w.endsWith(s) || w.length - s.length < 3) continue;
      const stem = s ? w.slice(0, -s.length) : w;
      if (stem !== word) out.push(stem);
      for (const [p, sounds] of ID_PREFIXES) {
        if (!stem.startsWith(p) || stem.length - p.length < 3) continue;
        for (const sound of sounds) out.push(sound + stem.slice(p.length));
      }
    }
  }
  // Doubled words: anak-anak (children) → anak.
  const reduplicated = /^([^-]+)-\1/.exec(word);
  if (reduplicated) out.unshift(reduplicated[1]);
  return out;
}

// ── Swahili ─────────────────────────────────────────────────────────────────

/** subject (or negative) + tense + object + root: ninakupenda, tulisoma, hawataki → penda, soma, taka. */
const SW_VERB = /^(?:ha|si|hu)?(?:ni|u|a|tu|m|mu|wa|ki|vi|li|ya|i|zi|ku|pa|yu|tu)?(?:na|li|ta|me|ki|nge|ngali|ka|sha|ja)?(?:ni|ku|m|mw|tu|wa|ki|vi|li|ya|i|zi|u|ji)?([a-z]{3,})$/;
/** Noun class plurals and their singulars: watu → mtu, vitabu → kitabu, magari → gari, miti → mti. */
const SW_PLURALS: Rule[] = [['wa', 'm', 'mw'], ['vi', 'ki', 'ch'], ['vy', 'ch'], ['mi', 'm', 'mw'], ['ma', '', 'ji']];

function swahili(word: string): string[] {
  const out: string[] = [];
  if (word.startsWith('ku') && word.length > 4) out.push(word.slice(2));
  const m = SW_VERB.exec(word);
  if (m) {
    const root = m[1];
    out.push(root);
    // Negatives end in -i: sipendi, hawataki → penda, taka.
    if (root.endsWith('i')) out.push(`${root.slice(0, -1)}a`);
  }
  // Every way the prefixes can be cut, shortest root last (the regex takes one).
  for (let i = 2; i <= Math.min(7, word.length - 3); i++) out.push(word.slice(i));
  for (const [plural, ...singulars] of SW_PLURALS) {
    if (!word.startsWith(plural) || word.length - plural.length < 2) continue;
    for (const s of singulars) out.push(s + word.slice(plural.length));
  }
  // The locative -ni: nyumbani → nyumba, shuleni → shule.
  if (word.endsWith('ni') && word.length > 4) out.push(word.slice(0, -2), `${word.slice(0, -2)}a`, `${word.slice(0, -3)}a`);
  return out;
}

/** Dutch open syllables lose their doubled vowel: bomen → boom, jaren → jaar, katten → kat. */
function dutch(word: string): string[] {
  const out = bySuffix(word, RULES.nl);
  for (const stem of [...out]) {
    const doubled = /([bdfgklmnprstvz])\1$/.exec(stem);
    if (doubled) out.push(stem.slice(0, -1));
    const open = /^(.*[^aeiou])([aeou])([bdfgklmnprstvz])$/.exec(stem);
    if (open) out.push(`${open[1]}${open[2]}${open[2]}${open[3]}`);
    if (stem.endsWith('v')) out.push(`${stem.slice(0, -1)}f`);
    if (stem.endsWith('z')) out.push(`${stem.slice(0, -1)}s`);
  }
  // Past participles: gemaakt → maken, gewerkt → werken, gegeven → geven.
  const pp = /^ge(.{2,})(?:t|d|en)$/.exec(word);
  if (pp) out.push(`${pp[1]}en`, `${pp[1]}${pp[1].slice(-1)}en`, ...dutch(`${pp[1]}en`).slice(0, 3));
  return out;
}

/** Spanish and Italian object pronouns written onto a verb, longest first. */
const ES_CLITICS = ['selos', 'selas', 'selo', 'sela', 'melo', 'mela', 'telo', 'tela', 'noslo', 'nosla', 'los', 'las', 'les', 'nos', 'lo', 'la', 'le', 'me', 'te', 'se', 'os'];
const IT_CLITICS = ['glielo', 'gliela', 'glieli', 'gliele', 'melo', 'mela', 'telo', 'tela', 'celo', 'sene', 'gli', 'lo', 'la', 'li', 'le', 'mi', 'ti', 'ci', 'vi', 'si', 'ne'];
const STRESSED: Record<string, string> = { á: 'a', é: 'e', í: 'i', ó: 'o', ú: 'u' };
const unstress = (s: string) => s.replace(/[áéíóú]/g, (c) => STRESSED[c]);

const MIN_BASE = 2;

function bySuffix(word: string, rules: Rule[]): string[] {
  const out: string[] = [];
  for (const [ending, ...replacements] of rules) {
    if (!word.endsWith(ending) || word.length - ending.length < MIN_BASE) continue;
    const stem = word.slice(0, word.length - ending.length);
    for (const r of replacements) out.push(stem + r);
  }
  return out;
}

/** Hungarian lengthens a final vowel before a suffix: "almát" is alma, "kefében" is kefe. */
const huShort = (stem: string) => (stem.endsWith('á') ? `${stem.slice(0, -1)}a` : stem.endsWith('é') ? `${stem.slice(0, -1)}e` : stem);

function hungarian(word: string): string[] {
  const out: string[] = [];
  const add = (s: string) => {
    if (s.length >= MIN_BASE) out.push(s, huShort(s));
  };
  for (const stem of bySuffix(word, HU_CASE)) {
    add(stem);
    // "házaimban": a case after a possessive or plural ending.
    for (const inner of bySuffix(stem, HU_NUMBER)) add(inner);
  }
  // "kézzel", "busszal", "várossá": -val/-vel and -vá/-vé take the sound of the consonant before them.
  const doubled = /([^aáeéiíoóöőuúüű])\1([ae]l|[áé])$/.exec(word);
  if (doubled) add(word.slice(0, doubled.index + 1));
  const digraph = /([csz])\1([szy])([ae]l|[áé])$/.exec(word);
  if (digraph) add(word.slice(0, digraph.index + 1) + digraph[2]);
  for (const stem of bySuffix(word, HU_NUMBER)) add(stem);
  for (const stem of bySuffix(word, HU_VERB)) add(stem);
  return out;
}

function withClitics(word: string, clitics: string[], lang: 'es' | 'it'): string[] {
  const out: string[] = [];
  for (const c of clitics) {
    if (!word.endsWith(c) || word.length - c.length < MIN_BASE) continue;
    const verb = word.slice(0, -c.length);
    if (lang === 'es') {
      // "dímelo" → di, "cómpralo" → compra, "diciéndome" → diciendo, "hacerlo" → hacer
      out.push(unstress(verb), verb);
    } else {
      // "farlo" → fare, "dirmi" → dire, "facendolo" → facendo
      out.push(verb.endsWith('r') ? `${verb}e` : verb, verb);
    }
  }
  return out;
}

/**
 * Candidate base forms for a word missing from the dictionary, most likely first, without the word
 * itself. Empty for languages whose dictionaries list their inflections in full.
 */
export function baseCandidates(word: string, lang: string): string[] {
  const w = word.toLocaleLowerCase(lang);
  let out: string[] = [];
  if (lang === 'pt' && w.includes('-')) {
    // "disse-me", "chama-se", "fazê-lo" (fazer), "dá-lo" (dar), "pô-lo" (pôr)
    const verb = w.slice(0, w.indexOf('-'));
    const r = verb.replace(/[êé]$/, 'er').replace(/á$/, 'ar').replace(/í$/, 'ir').replace(/ô$/, 'or');
    out.push(verb, r);
    if (verb.endsWith('ô')) out.push(`${verb.slice(0, -1)}ôr`);
  }
  if (lang === 'es') out.push(...withClitics(w, ES_CLITICS, 'es'));
  if (lang === 'it') out.push(...withClitics(w, IT_CLITICS, 'it'));
  if (lang === 'hu') out.push(...hungarian(w));
  else if (lang === 'ja') out.push(...deinflect(w));
  else if (lang === 'ko') out.push(...korean(w));
  else if (lang === 'tr') out.push(...turkish(w));
  else if (lang === 'ar') out.push(...arabic(w));
  else if (lang === 'id') out.push(...indonesian(w));
  else if (lang === 'sw') out.push(...swahili(w));
  else if (lang === 'nl') out.push(...dutch(w));
  else if (RULES[lang]) out.push(...bySuffix(w, RULES[lang]));
  // Japanese, Korean and Arabic words can be one or two characters long.
  const min = lang === 'ja' || lang === 'ko' || lang === 'zh' ? 1 : MIN_BASE;
  out = out.filter((c) => c && c !== w && c.length >= min);
  return [...new Set(out)].slice(0, AGGLUTINATIVE.has(lang) ? 48 : 24);
}

/** Languages that pile endings onto a word: more candidates are worth looking up. */
const AGGLUTINATIVE = new Set(['tr', 'ko', 'ja', 'sw', 'id', 'ar', 'hu']);

/**
 * The head of a German or Swedish compound the dictionary doesn't list ("Kinderzimmerlampe" →
 * lampe), longest head first, at least four letters, with the linking s dropped.
 */
export function compoundHeads(word: string, lang: string): string[] {
  if (lang !== 'de' && lang !== 'sv') return [];
  const w = word.toLocaleLowerCase(lang);
  const out: string[] = [];
  for (let i = 3; i <= w.length - 4; i++) out.push(w.slice(i));
  return out;
}
