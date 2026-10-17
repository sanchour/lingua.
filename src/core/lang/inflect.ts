// Likely base forms of a word the dictionary doesn't list as written: a Hungarian case form
// ("könyvtárban" → könyvtár), a Swedish definite form ("bilarna" → bil), a Spanish verb with its
// pronouns attached ("dímelo" → di, "hacerlo" → hacer), a Portuguese one with a hyphen ("disse-me"
// → disse). Only a guess: the dictionary decides which candidate is a word.

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
};

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
  else if (RULES[lang]) out.push(...bySuffix(w, RULES[lang]));
  out = out.filter((c) => c && c !== w && c.length >= MIN_BASE);
  return [...new Set(out)].slice(0, 24);
}

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
