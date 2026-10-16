// Builds the themed starter word lists for all ten languages from English Wiktionary's
// translation tables (one pass over the English Kaikki dump). build.ts puts them into each pack.
//   node scripts/lang-data/themes.ts   → scripts/.cache/themes.json
//
// Each concept is "word", "word|pos" or "word|pos|sense hint"; "shown=looked-up|pos" looks up a
// different headword (Wiktionary keeps the translations of "doctor" under "physician"). For every
// concept the translation table of its main meaning is used (the one covering the most languages, or
// the one whose sense matches the hint). Per language the translations keep Wiktionary's order (the
// usual word first), minus archaic/rare/slang ones, with regional words last (Brazilian first for
// Portuguese). build.ts then takes the first candidate its dictionary knows.
import { createReadStream, writeFileSync } from 'node:fs';
import { createGunzip } from 'node:zlib';
import { STARTER_THEMES } from '../../src/core/lang/starter.ts';
import { CACHE_DIR, kaikkiFile, PACK_SOURCES } from './sources.ts';

/** [candidates as [word, gender tag, 0 · 1 regional · -1 hand-picked], meaning, part of speech] */
export type ThemeCandidates = [Array<[string, string, number]>, string, string];

const CONCEPTS: Record<string, string[]> = {
  basics: [
    'hello', 'goodbye', 'please', 'thank you', 'yes', 'no|particle', 'sorry|intj', 'excuse me', 'good morning', 'good evening',
    'good night', 'welcome|intj', 'how are you', 'what|pron', 'who|pron', 'where|adv', 'when|adv', 'why|adv', 'how|adv', 'which|det',
    'I|pron', 'you|pron', 'he|pron', 'she|pron', 'we|pron', 'they|pron', 'this|pron', 'that|pron', 'here|adv', 'there|adv',
    'now|adv', 'today|adv', 'tomorrow|adv', 'yesterday|adv', 'very|adv', 'not|adv', 'name|noun', 'friend|noun', 'everything|pron', 'nothing|pron',
  ],
  verbs: [
    'be|verb', 'have|verb', 'do|verb', 'go|verb', 'come|verb', 'say|verb', 'speak|verb', 'see|verb', 'look|verb', 'hear|verb',
    'listen|verb', 'know|verb', 'think|verb', 'want|verb', 'make|verb', 'give|verb', 'take|verb', 'eat|verb', 'drink|verb', 'sleep|verb',
    'live|verb', 'love|verb', 'like|verb', 'need|verb', 'work|verb', 'read|verb', 'write|verb', 'learn|verb', 'understand|verb', 'play|verb',
    'buy|verb', 'sell|verb', 'pay|verb', 'open|verb', 'close|verb', 'begin|verb', 'finish|verb', 'wait|verb', 'help|verb', 'find|verb',
    'lose|verb', 'put|verb', 'bring|verb', 'sit|verb', 'stand|verb', 'walk|verb', 'run|verb', 'swim|verb', 'drive|verb', 'travel|verb',
    'call|verb', 'ask|verb', 'answer|verb', 'remember|verb', 'forget|verb', 'try|verb', 'use|verb', 'leave|verb', 'arrive|verb', 'cook|verb',
  ],
  connectors: [
    'and|conj', 'or|conj', 'but|conj', 'because|conj', 'so|conj', 'if|conj', 'then|adv', 'also|adv', 'although|conj', 'however|adv',
    'while|conj', 'when|conj', 'before|prep', 'after|prep', 'until|prep', 'since|prep', 'therefore|adv', 'besides|adv', 'instead|adv', 'unless|conj',
    'maybe|adv', 'really|adv', 'still|adv', 'already|adv', 'only|adv', 'even|adv', 'almost|adv', 'again|adv', 'especially|adv', 'actually|adv',
    'finally|adv', 'of course', 'for example', 'at least', 'with|prep', 'without|prep', 'about|prep', 'between|prep', 'during|prep', 'against|prep',
  ],
  animals: [
    'animal|noun', 'dog|noun', 'cat|noun', 'bird|noun', 'fish|noun', 'horse|noun', 'cow|noun', 'pig|noun', 'sheep|noun', 'goat|noun',
    'chicken|noun', 'duck|noun', 'mouse|noun', 'rabbit|noun', 'bear|noun', 'wolf|noun', 'fox|noun', 'lion|noun', 'tiger|noun', 'elephant|noun',
    'monkey|noun', 'snake|noun', 'frog|noun', 'turtle|noun', 'bee|noun', 'butterfly|noun', 'ant|noun', 'spider|noun', 'owl|noun', 'eagle|noun',
    'whale|noun', 'dolphin|noun', 'shark|noun', 'deer|noun', 'squirrel|noun', 'insect|noun', 'donkey|noun', 'camel|noun', 'giraffe|noun', 'hedgehog|noun',
  ],
  food: [
    'food|noun', 'water|noun', 'bread|noun', 'milk|noun', 'coffee|noun', 'tea|noun', 'wine|noun', 'beer|noun', 'juice|noun', 'egg|noun',
    'cheese|noun', 'butter|noun', 'meat|noun', 'rice|noun', 'soup|noun', 'salt|noun', 'sugar|noun', 'apple|noun', 'orange|noun|fruit', 'banana|noun',
    'strawberry|noun', 'grape|noun', 'lemon|noun', 'potato|noun', 'tomato|noun', 'onion|noun', 'carrot|noun', 'vegetable|noun', 'fruit|noun', 'cake|noun',
    'chocolate|noun', 'ice cream|noun', 'breakfast|noun', 'lunch|noun', 'dinner|noun', 'restaurant|noun', 'knife|noun', 'fork|noun', 'spoon|noun', 'plate|noun',
    'cup|noun', 'bottle|noun', 'hungry|adj', 'thirsty|adj', 'delicious|adj', 'sweet|adj', 'salad|noun', 'oil|noun', 'honey|noun', 'pepper|noun',
  ],
  people: [
    'family|noun', 'mother|noun', 'father|noun', 'parent|noun', 'son|noun', 'daughter|noun', 'brother|noun', 'sister|noun', 'grandmother|noun', 'grandfather|noun',
    'child|noun', 'baby|noun', 'husband|noun', 'wife|noun', 'uncle|noun', 'aunt|noun', 'cousin|noun', 'man|noun', 'woman|noun', 'boy|noun',
    'girl|noun', 'person|noun', 'people|noun', 'neighbor=neighbour|noun', 'guest|noun', 'boyfriend|noun', 'girlfriend|noun', 'grandson|noun', 'granddaughter|noun', 'wedding|noun',
    'birthday|noun', 'age|noun', 'adult|noun', 'twin|noun', 'stranger|noun',
  ],
  home: [
    'house|noun', 'home|noun', 'room|noun', 'kitchen|noun', 'bedroom|noun', 'bathroom|noun', 'door|noun', 'window|noun', 'wall|noun', 'floor|noun',
    'stairs|noun', 'table|noun', 'chair|noun', 'bed|noun', 'sofa|noun', 'lamp|noun', 'key|noun', 'clock|noun', 'mirror|noun', 'television|noun',
    'telephone|noun', 'computer|noun', 'book|noun', 'pen|noun', 'paper|noun', 'bag|noun', 'box|noun', 'towel|noun', 'soap|noun', 'umbrella|noun',
    'wallet|noun', 'money|noun', 'shower|noun', 'garden|noun', 'refrigerator|noun', 'blanket|noun', 'pillow|noun', 'clothes|noun', 'shirt|noun', 'trousers',
    'shoe|noun', 'dress|noun', 'coat|noun', 'hat|noun', 'sock|noun', 'glasses', 'toothbrush|noun', 'roof|noun', 'picture|noun', 'candle|noun',
  ],
  time: [
    'zero|num', 'one|num', 'two|num', 'three|num', 'four|num', 'five|num', 'six|num', 'seven|num', 'eight|num', 'nine|num',
    'ten|num', 'eleven|num', 'twelve|num', 'fifteen|num', 'twenty|num', 'thirty|num', 'fifty|num', 'hundred|num', 'thousand|num', 'million|num',
    'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday', 'January', 'February', 'March|name',
    'April', 'May|name', 'June', 'July', 'August|name', 'September', 'October', 'November', 'December', 'day|noun',
    'week|noun', 'month|noun', 'year|noun', 'hour|noun', 'minute|noun', 'second|noun|unit', 'morning|noun', 'afternoon|noun', 'evening|noun', 'night|noun',
    'time|noun', 'weekend|noun', 'spring|noun|season', 'summer|noun', 'autumn|noun', 'winter|noun', 'early|adv', 'late|adv', 'always|adv', 'never|adv',
  ],
  describe: [
    'red|adj', 'blue|adj', 'green|adj', 'yellow|adj', 'black|adj', 'white|adj', 'grey=gray|adj', 'brown|adj', 'pink|adj', 'purple|adj',
    'orange|noun|colour', 'big|adj', 'small|adj', 'long|adj', 'short|adj', 'tall|adj', 'new|adj', 'old|adj', 'young|adj', 'good|adj',
    'bad|adj', 'beautiful|adj', 'ugly|adj', 'hot|adj', 'cold|adj', 'warm|adj', 'easy|adj', 'difficult|adj', 'cheap|adj', 'expensive|adj',
    'fast|adj', 'slow|adj', 'rich|adj', 'poor|adj', 'clean|adj', 'dirty|adj', 'full|adj', 'empty|adj', 'heavy|adj', 'strong|adj',
    'weak|adj', 'high|adj', 'low|adj', 'wrong|adj', 'important|adj', 'interesting|adj', 'quiet|adj', 'loud|adj', 'dark|adj', 'bright|adj',
  ],
  body: [
    'body|noun', 'head|noun', 'face|noun', 'eye|noun', 'ear|noun', 'nose|noun', 'mouth|noun', 'tooth|noun', 'hair|noun', 'neck|noun',
    'shoulder|noun', 'arm|noun', 'hand|noun', 'finger|noun', 'leg|noun', 'knee|noun', 'foot|noun', 'back|noun', 'stomach|noun', 'heart|noun',
    'blood|noun', 'skin|noun', 'bone|noun', 'doctor=physician|noun', 'hospital|noun', 'medicine|noun', 'pain|noun', 'ill|adj', 'healthy|adj', 'fever|noun',
    'headache|noun', 'pharmacy|noun', 'nurse|noun', 'health|noun', 'tired|adj', 'hurt|verb', 'breathe|verb', 'tongue|noun', 'lip|noun', 'brain|noun',
  ],
  travel: [
    'city|noun', 'town|noun', 'village|noun', 'country|noun', 'street|noun', 'road|noun', 'bridge|noun', 'station|noun', 'airport|noun', 'train|noun',
    'bus|noun', 'car|noun', 'airplane|noun', 'bicycle|noun', 'boat|noun', 'ship|noun', 'ticket|noun', 'passport|noun', 'hotel|noun', 'map|noun',
    'left|adj', 'right|adj|direction', 'north|noun', 'south|noun', 'east|noun', 'west|noun', 'beach|noun', 'mountain|noun', 'river|noun', 'sea|noun',
    'lake|noun', 'island|noun', 'shop|noun', 'market|noun', 'church|noun', 'museum|noun', 'park|noun', 'police|noun', 'suitcase|noun', 'trip|noun',
    'vacation|noun', 'border|noun', 'tourist|noun', 'square|noun|open space', 'corner|noun',
  ],
  nature: [
    'weather|noun', 'sun|noun', 'moon|noun', 'star|noun', 'sky|noun', 'cloud|noun', 'rain|noun', 'snow|noun', 'wind|noun', 'storm|noun',
    'fog|noun', 'ice|noun', 'fire|noun', 'air|noun', 'tree|noun', 'flower|noun', 'grass|noun', 'leaf|noun', 'forest|noun', 'stone|noun',
    'sand|noun', 'temperature|noun', 'rainbow|noun', 'thunder|noun', 'lightning|noun', 'nature|noun', 'plant|noun', 'season|noun', 'field|noun', 'hill|noun',
    'desert|noun', 'earth|noun', 'sunset|noun', 'wave|noun', 'shadow|noun', 'heat|noun', 'world|noun', 'ocean|noun', 'valley|noun', 'mud|noun',
  ],
  feelings: [
    'happy|adj', 'sad|adj', 'angry|adj', 'afraid|adj', 'bored|adj', 'surprised|adj', 'worried|adj', 'calm|adj', 'nervous|adj', 'proud|adj',
    'jealous|adj', 'lonely|adj', 'love|noun', 'hope|noun', 'fear|noun', 'joy|noun', 'anger|noun', 'sadness|noun', 'laugh|verb', 'cry|verb',
    'smile|noun', 'kiss|noun', 'hug|noun', 'feeling|noun', 'mood|noun', 'shame|noun', 'trust|noun', 'miss|verb', 'hate|verb', 'enjoy|verb',
    'grateful|adj', 'excited|adj', 'embarrassed|adj', 'curious|adj', 'shy|adj',
  ],
  work: [
    'school|noun', 'university|noun', 'student|noun', 'teacher|noun', 'lesson|noun', 'homework|noun', 'exam=examination|noun', 'question|noun', 'answer|noun', 'word|noun',
    'sentence|noun', 'language|noun', 'dictionary|noun', 'notebook|noun', 'pencil|noun', 'desk|noun', 'work|noun', 'job|noun', 'office|noun', 'company|noun',
    'boss|noun', 'colleague|noun', 'meeting|noun', 'salary|noun', 'email|noun', 'project|noun', 'idea|noun', 'problem|noun', 'example|noun', 'study|verb',
    'teach|verb', 'mistake|noun', 'library|noun', 'class|noun', 'grammar|noun', 'subject|noun', 'knowledge|noun', 'skill|noun', 'interview|noun', 'customer|noun',
  ],
};

interface Concept {
  theme: string;
  /** Shown to the learner. */
  word: string;
  /** Looked up in Wiktionary. */
  lookup: string;
  pos?: string;
  hint?: string;
}
interface Translation {
  word?: string;
  sense?: string;
  tags?: string[];
  lang_code?: string;
  code?: string;
}
interface Entry {
  word: string;
  pos: string;
  translations?: Translation[];
  senses?: { glosses?: string[]; translations?: Translation[] }[];
}

const AVOID = new Set(['obsolete', 'archaic', 'dated', 'rare', 'poetic', 'dialectal', 'slang', 'vulgar', 'derogatory', 'offensive', 'literary', 'regional', 'Ancient', 'Katharevousa', 'historical', 'humorous', 'childish', 'euphemistic', 'figuratively']);
const AVOID_NOTE = /\((?:disused|archaic|obsolete|dated|rare|slang|dialectal)\)/i;
const TARGETS = PACK_SOURCES.map((s) => s.code).filter((c) => c !== 'en');
const MAX_CANDIDATES = 4;

const concepts: Concept[] = Object.entries(CONCEPTS).flatMap(([theme, list]) =>
  list.map((spec) => {
    const [names, pos, hint] = spec.split('|');
    const [word, lookup = word] = names.split('=');
    return { theme, word, lookup, pos, hint };
  }),
);
const byWord = new Map<string, Concept[]>();
for (const c of concepts) byWord.set(c.lookup, [...(byWord.get(c.lookup) ?? []), c]);
for (const theme of Object.keys(CONCEPTS)) if (!STARTER_THEMES.some((t) => t.id === theme)) throw new Error(`Unknown theme ${theme}`);

/** Hand-checked picks where Wiktionary's first translation is regional, rare or another sense. */
const OVERRIDES: Record<string, string> = {
  'es:banana': 'plátano', 'es:lunch': 'almuerzo', 'es:cake': 'pastel', 'es:poor': 'pobre', 'es:potato': 'patata', 'es:food': 'comida',
  'ru:goodbye': 'до свида́ния', 'ru:chicken': 'ку́рица', 'ru:fruit': 'фрукт',
  'el:bored': 'βαριεστημένος', 'el:food': 'φαγητό', 'el:fruit': 'φρούτο',
  'pt:thank you': 'obrigado', 'pt:lemon': 'limão', 'pt:butterfly': 'borboleta',
  'hu:fruit': 'gyümölcs',
};

/** "до свида́ния or до свида́нья" → first; "but see X" → X; "humor m ánimo" → humor; "(…)" dropped. */
const clean = (w: string) =>
  w
    .replace(/\s*\([^)]*\)/g, '')
    .replace(/^but see\s+/i, '')
    .replace(/\s+or\s+.*$/, '')
    .replace(/^(\S+)\s[mfn]\s.*$/, '$1')
    .replace(/\s+/g, ' ')
    .trim();
const isRegional = (lang: string, tags: string[] = []) => {
  const regions = tags.filter((t) => /^[A-Z]/.test(t));
  return regions.length > 0 && !(lang === 'pt' && regions.includes('Brazil'));
};

/** All translation groups of the matching entries: sense → translations. */
const found = new Map<Concept, Map<string, Translation[]>>();
const englishSense = new Map<Concept, string>();

async function* lines(): AsyncGenerator<string> {
  const stream = createReadStream(kaikkiFile(PACK_SOURCES[0])).pipe(createGunzip());
  stream.setEncoding('utf8');
  let buffer = '';
  for await (const chunk of stream as AsyncIterable<string>) {
    buffer += chunk;
    let at: number;
    while ((at = buffer.indexOf('\n')) >= 0) {
      yield buffer.slice(0, at);
      buffer = buffer.slice(at + 1);
    }
  }
}

const started = Date.now();
let count = 0;
const quick = new RegExp(`"word": "(${[...byWord.keys()].map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})"`);
for await (const line of lines()) {
  if (++count % 250_000 === 0) console.log(`  en: ${count.toLocaleString()} entries…`);
  if (!quick.test(line)) continue;
  let entry: Entry;
  try {
    entry = JSON.parse(line) as Entry;
  } catch {
    continue;
  }
  for (const concept of byWord.get(entry.word) ?? []) {
    if (concept.pos && concept.pos !== entry.pos) continue;
    const groups = found.get(concept) ?? new Map<string, Translation[]>();
    for (const t of [...(entry.translations ?? []), ...(entry.senses ?? []).flatMap((s) => s.translations ?? [])]) {
      const sense = t.sense ?? '';
      groups.set(sense, [...(groups.get(sense) ?? []), t]);
    }
    found.set(concept, groups);
    if (!englishSense.has(concept) && entry.senses?.[0]?.glosses?.[0]) englishSense.set(concept, entry.senses[0].glosses[0]);
  }
}

const out: Record<string, Record<string, ThemeCandidates[]>> = { en: {} };
for (const lang of TARGETS) out[lang] = {};
const warnings: string[] = [];

for (const concept of concepts) {
  const groups = [...(found.get(concept) ?? new Map<string, Translation[]>()).entries()];
  const languagesIn = (list: Translation[]) => new Set(list.map((t) => t.lang_code ?? t.code)).size;
  let group = concept.hint ? groups.find(([sense]) => sense.toLowerCase().includes(concept.hint!.toLowerCase())) : undefined;
  if (concept.hint && !group) warnings.push(`hint "${concept.hint}" not found for ${concept.word} (${groups.map(([s]) => s).join(' / ')})`);
  group ??= groups.sort((a, b) => languagesIn(b[1]) - languagesIn(a[1]))[0];
  if (!group) {
    warnings.push(`no translations for ${concept.lookup}${concept.pos ? ` (${concept.pos})` : ''}`);
    continue;
  }
  const [sense, translations] = group;
  const pos = concept.pos ?? '';
  const meaning = pos === 'verb' ? `to ${concept.word}` : concept.word;

  // English learners get the word itself with the sense as its meaning.
  const englishMeaning = (sense || englishSense.get(concept) || concept.word).replace(/\s+—.*$/, '').replace(/\s*\(.*?\)\s*$/, '');
  (out.en[concept.theme] ??= []).push([[[concept.word, '', 0]], englishMeaning, pos]);

  for (const lang of TARGETS) {
    const gender = (tags: string[] = []) => (pos === 'noun' ? (tags.find((t) => ['masculine', 'feminine', 'neuter', 'common'].includes(t))?.[0] ?? '') : '');
    const candidates: Array<[string, string, number]> = translations
      .map((t, i) => ({ t, i, word: clean(t.word ?? ''), regional: isRegional(lang, t.tags) ? 1 : 0 }))
      .filter(({ t, word }) => (t.lang_code ?? t.code) === lang && word && /\p{L}/u.test(word) && !AVOID_NOTE.test(t.word ?? '') && !t.tags?.some((tag) => AVOID.has(tag)))
      .sort((a, b) => a.regional - b.regional || a.i - b.i)
      .filter((c, i, list) => list.findIndex((o) => o.word === c.word) === i)
      .slice(0, MAX_CANDIDATES)
      .map((c) => [c.word, gender(c.t.tags), c.regional]);
    const override = OVERRIDES[`${lang}:${concept.word}`];
    if (override) candidates.unshift([override, candidates.find((c) => c[0] === override)?.[1] ?? '', -1]);
    if (!candidates.length) {
      warnings.push(`${lang}: nothing for ${concept.word}`);
      continue;
    }
    (out[lang][concept.theme] ??= []).push([candidates, meaning, pos]);
  }
}

writeFileSync(new URL('themes.json', CACHE_DIR), JSON.stringify(out));
for (const lang of Object.keys(out)) {
  const total = Object.values(out[lang]).reduce((n, list) => n + list.length, 0);
  console.log(`✓ ${lang}: ${total} themed words`);
}
console.log(`${warnings.length} notes:\n  ${warnings.slice(0, 120).join('\n  ')}`);
console.log(`Done in ${((Date.now() - started) / 1000).toFixed(0)} s`);
