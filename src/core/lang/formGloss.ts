// A word form in its own English (5.1-3a). The packs give an inflected form its lemma's meaning
// ("tengo": to have; to possess) and Wiktionary's description of it ("first-person singular present
// indicative of tener"). Read together they say what the form itself means: "I have". Nouns get
// their plural ("años": years), and only the lemma the description names counts, so a rare
// homograph ("somos": summit; "cosas": to sew) no longer creeps in.

import { plainGloss } from './context';

export interface FormOf {
  /** The lemma the description names, as written there (stress marks kept). */
  lemma: string;
  /** 1, 2 or 3; left out when the description says "first/third-person" or none. */
  person?: 1 | 2 | 3;
  plural?: boolean;
  tense?: 'present' | 'past' | 'future' | 'conditional' | 'subjunctive' | 'past-subjunctive' | 'imperative';
  participle?: 'past' | 'present';
  /** "plural of …" with no person or tense: a noun's (or an adjective's) plural. */
  nounPlural?: boolean;
}

const PERSON: Record<string, 1 | 2 | 3> = { first: 1, second: 2, third: 3 };

/** Reads a form-of description; null when it isn't one. */
export function parseFormOf(description: string): FormOf | null {
  const clause = description.split(';')[0].trim();
  const at = clause.toLowerCase().lastIndexOf(' of ');
  if (at < 0) return null;
  const lemma = clause.slice(at + 4).split(':')[0].replace(/["“”]/g, '').trim().split(/\s+/)[0];
  const d = clause.slice(0, at).toLowerCase();
  if (!lemma || /^(misspelling|alternative|obsolete|archaic|abbreviation|initialism|synonym|clipping|diminutive|augmentative|contraction)\b/.test(d) || /\b(comparative|superlative)\b/.test(d)) return null;
  const out: FormOf = { lemma };
  const person = /\b(first|second|third)(\/(first|second|third))?-person\b/.exec(d);
  if (person && !person[2]) out.person = PERSON[person[1]];
  if (/\bplural\b/.test(d)) out.plural = true;
  // Paradigm tags come in any order ("masculine participle past singular").
  if (/\bparticiple\b/.test(d)) out.participle = /\bpresent\b/.test(d) ? 'present' : 'past';
  else if (/\bgerund\b/.test(d)) out.participle = 'present';
  else if (/\bimperative\b/.test(d)) out.tense = 'imperative';
  // German's subjunctive II is English "would": "wäre" would be, "könnte" could.
  else if (/\bconditional\b|\bsubjunctive ii\b/.test(d)) out.tense = 'conditional';
  else if (/\bfuture\b/.test(d)) out.tense = d.includes('subjunctive') ? 'subjunctive' : 'future';
  else if (/\bsubjunctive\b/.test(d)) out.tense = /\b(imperfect|past|pluperfect|preterite)\b/.test(d) ? 'past-subjunctive' : 'subjunctive';
  else if (/\b(preterite|past historic|simple past|past|imperfect|aorist)\b/.test(d)) out.tense = 'past';
  else if (/\bpresent\b/.test(d)) out.tense = 'present';
  if (!out.tense && !out.participle && out.plural && !person) out.nounPlural = true;
  if (!out.tense && !out.participle && !out.nounPlural) return out.person ? null : { lemma };
  return out;
}

// ── English ───────────────────────────────────────────────────────────────

/** Irregular verbs: past, past participle. */
const IRREGULAR: Record<string, [string, string]> = {
  have: ['had', 'had'], do: ['did', 'done'], go: ['went', 'gone'], say: ['said', 'said'], get: ['got', 'got'], make: ['made', 'made'],
  know: ['knew', 'known'], think: ['thought', 'thought'], take: ['took', 'taken'], see: ['saw', 'seen'], come: ['came', 'come'],
  give: ['gave', 'given'], find: ['found', 'found'], tell: ['told', 'told'], become: ['became', 'become'], leave: ['left', 'left'],
  feel: ['felt', 'felt'], bring: ['brought', 'brought'], begin: ['began', 'begun'], keep: ['kept', 'kept'], hold: ['held', 'held'],
  write: ['wrote', 'written'], stand: ['stood', 'stood'], hear: ['heard', 'heard'], let: ['let', 'let'], mean: ['meant', 'meant'],
  set: ['set', 'set'], meet: ['met', 'met'], run: ['ran', 'run'], pay: ['paid', 'paid'], sit: ['sat', 'sat'], speak: ['spoke', 'spoken'],
  lie: ['lay', 'lain'], lead: ['led', 'led'], read: ['read', 'read'], grow: ['grew', 'grown'], lose: ['lost', 'lost'], fall: ['fell', 'fallen'],
  send: ['sent', 'sent'], build: ['built', 'built'], understand: ['understood', 'understood'], draw: ['drew', 'drawn'], break: ['broke', 'broken'],
  spend: ['spent', 'spent'], cut: ['cut', 'cut'], rise: ['rose', 'risen'], drive: ['drove', 'driven'], buy: ['bought', 'bought'],
  wear: ['wore', 'worn'], choose: ['chose', 'chosen'], seek: ['sought', 'sought'], throw: ['threw', 'thrown'], catch: ['caught', 'caught'],
  win: ['won', 'won'], forget: ['forgot', 'forgotten'], lay: ['laid', 'laid'], sell: ['sold', 'sold'], fight: ['fought', 'fought'],
  eat: ['ate', 'eaten'], teach: ['taught', 'taught'], sleep: ['slept', 'slept'], hit: ['hit', 'hit'], drink: ['drank', 'drunk'],
  sing: ['sang', 'sung'], swim: ['swam', 'swum'], fly: ['flew', 'flown'], ride: ['rode', 'ridden'], wake: ['woke', 'woken'],
  steal: ['stole', 'stolen'], hide: ['hid', 'hidden'], feed: ['fed', 'fed'], shoot: ['shot', 'shot'], shut: ['shut', 'shut'],
  put: ['put', 'put'], hurt: ['hurt', 'hurt'], cost: ['cost', 'cost'], beat: ['beat', 'beaten'], blow: ['blew', 'blown'],
  forgive: ['forgave', 'forgiven'], freeze: ['froze', 'frozen'], hang: ['hung', 'hung'], shake: ['shook', 'shaken'], sink: ['sank', 'sunk'],
  spread: ['spread', 'spread'], stick: ['stuck', 'stuck'], strike: ['struck', 'struck'], swear: ['swore', 'sworn'], tear: ['tore', 'torn'],
  bite: ['bit', 'bitten'], dig: ['dug', 'dug'], ring: ['rang', 'rung'], shine: ['shone', 'shone'], bend: ['bent', 'bent'], lend: ['lent', 'lent'],
  flee: ['fled', 'fled'], arise: ['arose', 'arisen'], awake: ['awoke', 'awoken'], bear: ['bore', 'borne'], light: ['lit', 'lit'],
  prove: ['proved', 'proven'], quit: ['quit', 'quit'], split: ['split', 'split'], weep: ['wept', 'wept'], dream: ['dreamt', 'dreamt'],
  overcome: ['overcame', 'overcome'], undergo: ['underwent', 'undergone'], withdraw: ['withdrew', 'withdrawn'], forbid: ['forbade', 'forbidden'],
};

/** Verbs that double their last consonant before -ed and -ing. */
const DOUBLE = new Set(['stop', 'plan', 'drop', 'prefer', 'admit', 'occur', 'refer', 'permit', 'regret', 'shop', 'chat', 'beg', 'hug', 'rob', 'nod', 'step', 'ship', 'slip', 'trip', 'grab', 'hop', 'stir', 'travel', 'control', 'commit', 'submit', 'omit', 'fit', 'jog', 'skip', 'rub', 'tap', 'wrap', 'knit', 'nap', 'pat', 'pin', 'dip', 'drag', 'trim']);

const MODAL_PAST: Record<string, string> = { can: 'could', may: 'might', must: 'had to', shall: 'should', will: 'would' };

function third(v: string): string {
  if (v === 'be') return 'is';
  if (v === 'have') return 'has';
  if (v in MODAL_PAST || v === 'should' || v === 'could' || v === 'might' || v === 'would') return v;
  if (/(s|x|z|ch|sh|o)$/.test(v)) return `${v}es`;
  if (/[^aeiou]y$/.test(v)) return `${v.slice(0, -1)}ies`;
  return `${v}s`;
}

function regularPast(v: string): string {
  if (DOUBLE.has(v)) return `${v}${v.at(-1)}ed`;
  if (v.endsWith('e')) return `${v}d`;
  if (/[^aeiou]y$/.test(v)) return `${v.slice(0, -1)}ied`;
  return `${v}ed`;
}

const past = (v: string) => IRREGULAR[v]?.[0] ?? MODAL_PAST[v] ?? regularPast(v);
const participle = (v: string) => (v === 'be' ? 'been' : (IRREGULAR[v]?.[1] ?? regularPast(v)));

function ing(v: string): string {
  if (v === 'be') return 'being';
  if (v.endsWith('ie')) return `${v.slice(0, -2)}ying`;
  if (/(ee|ye|oe)$/.test(v)) return `${v}ing`;
  if (DOUBLE.has(v)) return `${v}${v.at(-1)}ing`;
  if (v.endsWith('e') && v.length > 2) return `${v.slice(0, -1)}ing`;
  return `${v}ing`;
}

const PRONOUN: Record<string, string> = { '1': 'I', '2': 'you', '1p': 'we', '2p': 'you', '3p': 'they' };

/** "have" (or "be able to", "look for") as the form says: "I have", "has", "said", "will go". */
export function englishVerb(base: string, f: FormOf): string {
  const [verb, ...rest] = base.split(' ');
  const tail = rest.length ? ` ${rest.join(' ')}` : '';
  const modal = verb in MODAL_PAST;
  const key = f.person ? `${f.person}${f.plural ? 'p' : ''}` : f.plural ? '3p' : '';
  const who = PRONOUN[key] ? `${PRONOUN[key]} ` : '';
  if (f.participle) return `${f.participle === 'past' ? participle(verb) : ing(verb)}${tail}`;
  switch (f.tense) {
    case 'imperative':
      return `${verb}${tail}!`;
    case 'future':
      return `${who}${modal ? `will be able to` : `will ${verb}`}${tail}`;
    case 'conditional':
      return `${who}${modal ? (verb === 'can' ? 'could' : verb === 'must' ? 'should' : `would ${verb}`) : `would ${verb}`}${tail}`;
    case 'subjunctive':
      return `${who}${verb}${tail}`;
    case 'past-subjunctive':
    case 'past': {
      if (verb === 'be') return `${who}${f.plural || f.person === 2 ? 'were' : 'was'}${tail}`;
      return `${who}${past(verb)}${tail}`;
    }
    default: {
      if (verb === 'be') return f.plural || f.person === 2 ? `${who}are${tail}` : f.person === 1 ? `I am${tail}` : `is${tail}`;
      const singular3 = !f.plural && f.person !== 1 && f.person !== 2;
      return `${who}${singular3 ? third(verb) : verb}${tail}`;
    }
  }
}

const PLURAL: Record<string, string> = {
  man: 'men', woman: 'women', child: 'children', person: 'people', foot: 'feet', tooth: 'teeth', mouse: 'mice', life: 'lives',
  wife: 'wives', knife: 'knives', wolf: 'wolves', half: 'halves', leaf: 'leaves', shelf: 'shelves', thief: 'thieves', sheep: 'sheep',
  fish: 'fish', deer: 'deer', goose: 'geese', people: 'people', hero: 'heroes', potato: 'potatoes', tomato: 'tomatoes', echo: 'echoes',
  gentleman: 'gentlemen', policeman: 'policemen', businessman: 'businessmen', news: 'news', money: 'money', information: 'information',
};

/** One English noun (or noun phrase) in the plural: "police officer" → "police officers", "piece of cake" → "pieces of cake". */
export function englishPlural(noun: string): string {
  const of = noun.indexOf(' of ');
  if (of > 0) return `${englishPlural(noun.slice(0, of))}${noun.slice(of)}`;
  const words = noun.split(' ');
  const last = words.pop()!;
  const lower = last.toLowerCase();
  let plural: string;
  if (PLURAL[lower]) plural = PLURAL[lower];
  else if (/(s|x|z|ch|sh)$/.test(lower)) plural = `${last}es`;
  else if (/[^aeiou]y$/.test(lower)) plural = `${last.slice(0, -1)}ies`;
  else plural = `${last}s`;
  return [...words, plural].join(' ');
}

/** A lemma as descriptions and the pack write it: lower case, Russian without stress marks. */
const lemmaKey = (s: string, lang: string) => (/[\u0370-\u04ff]/.test(s) ? s.normalize('NFD').replace(/[\u0300\u0301]/g, '').normalize('NFC') : s).toLocaleLowerCase(lang);

/**
 * Which of a form's lemmas its description names, and what it says of the form; null when it says
 * nothing usable. A form that is a dictionary word itself keeps the pack's meaning: its description
 * names the rarer reading ("casa": of casar, "nuit": of nuire, "puis": of pouvoir).
 */
export function planForm(lang: string, f: { form: string; lemmas: string[]; d?: string }): { p: FormOf; lemma: string } | null {
  if (!f.d || f.lemmas.some((l) => lemmaKey(l, lang) === lemmaKey(f.form, lang))) return null;
  const p = parseFormOf(f.d);
  if (!p) return null;
  const want = lemmaKey(p.lemma, lang);
  const lemma = f.lemmas.find((l) => lemmaKey(l, lang) === want) ?? (f.lemmas.length === 1 ? f.lemmas[0] : undefined);
  if (!lemma) return null;
  return { p: settle(lang, p), lemma };
}

/** German says "first-person singular preterite" where the third is the same word ("war"). */
function settle(lang: string, p: FormOf): FormOf {
  if (lang === 'de' && !p.plural && p.person !== 2 && p.tense === 'past') p.person = undefined;
  return p;
}

/** Whether a plan still lacks what the form is ("inflection of entender" says only the lemma). */
export const needsParadigm = (plan: { p: FormOf }) => !plan.p.tense && !plan.p.participle && !plan.p.nounPlural;

/**
 * For "inflection of X": the form's tags in X's paradigm (the Forms tab's table), preferring the
 * indicative to an imperative or subjunctive spelt the same ("entiende": understands, not "understand!").
 */
export function fromParadigm(lang: string, plan: { p: FormOf; lemma: string }, tags: string[]): void {
  if (!needsParadigm(plan) || !tags.length) return;
  // The indicative over an imperative or subjunctive spelt the same, and "he" over "you all" ("steht").
  const plain = tags.filter((t) => !/\b(imperative|subjunctive)\b/.test(t));
  const best = plain.find((t) => /\bthird-person\b/.test(t) && /\bsingular\b/.test(t)) ?? plain.find((t) => /\bthird-person\b/.test(t)) ?? plain[0] ?? tags[0];
  const p = parseFormOf(`${best} of ${plan.lemma}`);
  if (p && !needsParadigm({ p })) plan.p = settle(lang, p);
}

export interface LemmaSense {
  pos: string;
  glosses: string[];
}

/** A sense's first meaning, as short plain items ("to desire, to want" → ["to desire", "to want"]). */
const itemsOf = (glosses: string[]) => [
  ...new Set(
    plainGloss(glosses[0] ?? '')
      .split(/[;,]\s*/)
      .map((g) => g.trim())
      .filter((g) => g && g.length <= 40),
  ),
];

/**
 * The form's own meaning, from its description and its lemma's senses (dictionary order), or null
 * when nothing better than the pack's gloss can be said. `verb` is a hand-chosen English verb for
 * the lemma ("querer" → "want"), when there is one.
 */
export function formGloss(f: FormOf, senses: LemmaSense[], verb?: string): string | null {
  if (f.tense || f.participle) {
    let base = verb;
    if (!base) {
      const first = senses.find((s) => s.pos === 'verb');
      const item = first && itemsOf(first.glosses).find((g) => g.startsWith('to '));
      if (!item) return null;
      base = item.slice(3);
    }
    return englishVerb(base, f);
  }
  const main = senses[0];
  if (!main) return null;
  const items = itemsOf(main.glosses).slice(0, 2);
  if (!items.length) return null;
  if (f.nounPlural) {
    if (main.pos === 'noun') return [...new Set(items.map(englishPlural))].join(', ');
    // Determiners and pronouns change in English too ("estos": these): the pack's word stands.
    if (main.pos !== 'adj') return null;
  }
  // An adjective's other forms, a noun's case: the lemma's own meaning, without other lemmas' noise.
  return items.join(', ');
}
