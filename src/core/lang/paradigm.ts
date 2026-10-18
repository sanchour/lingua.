// Inflection tables for the word drawer: conjugations with pronouns, declensions by case, number
// and gender, and a short list of other forms. Built from a pack paradigm (rows of [form, tags]).

export interface FormTable {
  title: string;
  /** Column headings when there is more than one column. */
  columns?: string[];
  rows: Array<{ label: string; cells: string[] }>;
}

export interface FormTables {
  tables: FormTable[];
  /** Forms outside any table: infinitive, participles, comparative… */
  other: Array<{ label: string; form: string }>;
}

const PERSONS = ['first-person', 'second-person', 'third-person'] as const;
const GENDERS = ['masculine', 'feminine', 'neuter'] as const;
const CASES = [
  'nominative', 'genitive', 'dative', 'accusative', 'instrumental', 'prepositional', 'locative', 'vocative', 'ablative', 'partitive',
  'inessive', 'elative', 'illative', 'adessive', 'allative', 'superessive', 'sublative', 'delative', 'terminative', 'essive',
  'translative', 'causal-final', 'comitative',
] as const;
const CELL_TAGS = new Set<string>([...PERSONS, ...GENDERS, ...CASES, 'singular', 'plural', 'dual']);

/** I, you, he/she, we, you, they: row labels for conjugations (singular then plural). */
const PRONOUNS: Record<string, string[]> = {
  en: ['I', 'you', 'he / she', 'we', 'you', 'they'],
  ru: ['я', 'ты', 'он / она', 'мы', 'вы', 'они'],
  de: ['ich', 'du', 'er / sie / es', 'wir', 'ihr', 'sie'],
  es: ['yo', 'tú', 'él / ella', 'nosotros', 'vosotros', 'ellos'],
  fr: ['je', 'tu', 'il / elle', 'nous', 'vous', 'ils / elles'],
  it: ['io', 'tu', 'lui / lei', 'noi', 'voi', 'loro'],
  pt: ['eu', 'tu', 'ele / ela', 'nós', 'vós', 'eles / elas'],
  el: ['εγώ', 'εσύ', 'αυτός / αυτή', 'εμείς', 'εσείς', 'αυτοί'],
  hu: ['én', 'te', 'ő', 'mi', 'ti', 'ők'],
  sv: ['jag', 'du', 'han / hon', 'vi', 'ni', 'de'],
  nl: ['ik', 'jij', 'hij / zij', 'wij', 'jullie', 'zij'],
  nb: ['jeg', 'du', 'han / hun', 'vi', 'dere', 'de'],
  tr: ['ben', 'sen', 'o', 'biz', 'siz', 'onlar'],
  la: ['ego', 'tū', 'is / ea', 'nōs', 'vōs', 'eī / eae'],
  sw: ['mimi', 'wewe', 'yeye', 'sisi', 'ninyi', 'wao'],
  id: ['aku', 'kamu', 'dia', 'kami', 'kalian', 'mereka'],
  ar: ['أنا', 'أنت', 'هو / هي', 'نحن', 'أنتم', 'هم'],
};
/** Past forms by gender in Russian read most naturally with the pronoun. */
const GENDER_PRONOUNS: Record<string, Record<string, string>> = {
  ru: { masculine: 'он', feminine: 'она', neuter: 'оно', plural: 'они' },
};
const GENDER_LABEL: Record<string, string> = { masculine: 'masc.', feminine: 'fem.', neuter: 'neut.', plural: 'plural' };

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const TENSES = ['present', 'past', 'future', 'imperfect', 'preterite', 'perfect', 'pluperfect'];

/** "past historic indicative" → "Past historic"; "present subjunctive" → "Present subjunctive". */
export function tagTitle(tags: Iterable<string>): string {
  const t = new Set(tags);
  const words: string[] = [];
  for (const tense of TENSES) if (t.has(tense)) words.push(tense);
  if (t.has('historic')) words.push('historic');
  for (const mood of ['conditional', 'subjunctive', 'imperative', 'infinitive', 'participle', 'gerund', 'supine', 'comparative', 'superlative']) if (t.has(mood)) words.push(mood);
  if (t.has('adverbial')) words.unshift('adverbial');
  if (t.has('short-form')) words.push('short form');
  if (t.has('dependent')) words.push(words.length ? '(dependent)' : 'dependent');
  const extra = [t.has('perfective') && 'perfective', t.has('imperfective') && !t.has('imperfect') && 'imperfective', t.has('passive') && 'passive', t.has('definite') && 'definite', t.has('indefinite') && 'indefinite'].filter(Boolean);
  const head = words.length ? cap(words.join(' ')) : 'Forms';
  return extra.length ? `${head} · ${extra.join(', ')}` : head;
}

/** Earlier tables are the ones learners need first. */
function tableRank(tags: Set<string>): number {
  let r = 50;
  if (t(tags, 'present') && !t(tags, 'subjunctive') && !t(tags, 'conditional')) r = 0;
  else if (t(tags, 'past') || t(tags, 'preterite') || t(tags, 'perfect')) r = 1;
  else if (t(tags, 'imperfect') && !t(tags, 'subjunctive')) r = 2;
  else if (t(tags, 'future') && !t(tags, 'subjunctive')) r = 3;
  else if (t(tags, 'conditional')) r = 4;
  else if (t(tags, 'subjunctive')) r = 5;
  else if (t(tags, 'imperative')) r = 6;
  if (t(tags, 'passive')) r += 10;
  if (t(tags, 'dependent') || t(tags, 'historic')) r += 3;
  if (t(tags, 'perfective')) r += 0.5;
  if (t(tags, 'definite')) r += 0.25;
  return r;
}
const t = (set: Set<string>, tag: string) => set.has(tag);

const OTHER_ORDER = ['infinitive', 'gerund', 'supine', 'participle', 'comparative', 'superlative', 'short-form'];

export function formTables(lang: string, rows: ReadonlyArray<readonly [string, string]>, pos = ''): FormTables {
  const items = rows.map(([form, key]) => ({ form, tags: new Set(key.split(' ').filter(Boolean)) }));
  const used = new Set<number>();
  const tables: Array<FormTable & { rank: number }> = [];
  const restOf = (tags: Set<string>) => [...tags].filter((x) => !CELL_TAGS.has(x)).sort();

  // 1 · Conjugations: person × number, one table per tense/mood.
  const byTense = new Map<string, Map<number, string>>();
  items.forEach((it, i) => {
    const person = PERSONS.findIndex((p) => it.tags.has(p));
    if (person < 0 || it.tags.has('infinitive')) return;
    const slot = person + (it.tags.has('plural') ? 3 : 0);
    const key = restOf(it.tags).join(' ');
    let cells = byTense.get(key);
    if (!cells) byTense.set(key, (cells = new Map()));
    if (!cells.has(slot)) cells.set(slot, it.form);
    used.add(i);
  });
  const pronouns = PRONOUNS[lang] ?? PRONOUNS.en;
  for (const [key, cells] of byTense) {
    if (cells.size < 2) continue;
    const tags = new Set(key.split(' ').filter(Boolean));
    tables.push({
      title: tagTitle(tags),
      rank: tableRank(tags),
      rows: [...cells].sort((a, b) => a[0] - b[0]).map(([slot, form]) => ({ label: pronouns[slot], cells: [form] })),
    });
  }

  // 2 · Declensions: case × number (nouns) or case × gender (adjectives, pronouns). Verbs with case
  // tags are pronoun-attached forms (hablarme), and Swedish-style nouns (hus, huset) only add a
  // genitive -s: neither gets a case table.
  let withCase = items.map((it, i) => ({ ...it, i })).filter((it) => CASES.some((c) => it.tags.has(c)) && !used.has(it.i));
  const definiteNouns = withCase.some((it) => it.tags.has('definite')) && withCase.every((it) => it.tags.has('nominative') || it.tags.has('genitive'));
  if (pos === 'verb') {
    withCase.forEach((it) => used.add(it.i));
    withCase = [];
  } else if (definiteNouns) {
    withCase.filter((it) => it.tags.has('genitive')).forEach((it) => used.add(it.i));
    withCase = [];
  }
  if (withCase.length >= 2) {
    const byGender = withCase.some((it) => GENDERS.some((g) => it.tags.has(g)));
    const columns = byGender ? ['masculine', 'neuter', 'feminine', 'plural'] : withCase.some((it) => it.tags.has('plural')) ? ['singular', 'plural'] : ['singular'];
    const fits = (tags: Set<string>, col: string) => {
      if (col === 'plural') return tags.has('plural');
      if (byGender) return tags.has(col) && !tags.has('plural');
      return !tags.has('plural');
    };
    const tableRows: FormTable['rows'] = [];
    for (const c of CASES) {
      const inCase = withCase.filter((it) => it.tags.has(c));
      if (!inCase.length) continue;
      const cells = columns.map((col) => inCase.find((it) => fits(it.tags, col))?.form ?? '');
      if (cells.every((x) => !x)) continue;
      inCase.forEach((it) => used.add(it.i));
      tableRows.push({ label: cap(c.replace('-', ' ')), cells });
    }
    if (tableRows.length) {
      const visible = columns.filter((_, k) => tableRows.some((r) => r.cells[k]));
      const keep = columns.map((col) => visible.includes(col));
      tables.push({
        title: byGender ? 'By case and gender' : 'By case',
        rank: -1,
        columns: visible.length > 1 ? visible.map((c) => (byGender ? GENDER_LABEL[c] : cap(c))) : undefined,
        rows: tableRows.map((r) => ({ label: r.label, cells: r.cells.filter((_, k) => keep[k]) })),
      });
    }
  }

  // 3 · By gender and number without person or case (Russian past, participles): он/она/оно/они.
  const byGenderGroup = new Map<string, Map<string, string>>();
  items.forEach((it, i) => {
    if (used.has(i) || !(GENDERS.some((g) => it.tags.has(g)) || it.tags.has('plural'))) return;
    const key = restOf(it.tags).join(' ');
    const slot = it.tags.has('plural') ? 'plural' : (GENDERS.find((g) => it.tags.has(g)) ?? '');
    if (!slot) return;
    let cells = byGenderGroup.get(key);
    if (!cells) byGenderGroup.set(key, (cells = new Map()));
    if (!cells.has(slot)) cells.set(slot, it.form);
  });
  for (const [key, cells] of byGenderGroup) {
    if (cells.size < 3) continue;
    const tags = new Set(key.split(' ').filter(Boolean));
    const names = GENDER_PRONOUNS[lang];
    items.forEach((it, i) => {
      if (!used.has(i) && restOf(it.tags).join(' ') === key && (GENDERS.some((g) => it.tags.has(g)) || it.tags.has('plural'))) used.add(i);
    });
    tables.push({
      title: tagTitle(tags),
      rank: tableRank(tags) + 0.1,
      rows: ['masculine', 'feminine', 'neuter', 'plural'].filter((s) => cells.has(s)).map((s) => ({ label: names?.[s] ?? GENDER_LABEL[s], cells: [cells.get(s)!] })),
    });
  }

  // 4 · Number (and definiteness) for nouns without cases: singular / plural, Swedish en/ett forms.
  const numbered = items.map((it, i) => ({ ...it, i })).filter((it) => !used.has(it.i) && (it.tags.has('singular') || it.tags.has('plural')) && restOf(it.tags).every((x) => x === 'definite' || x === 'indefinite'));
  if (numbered.length >= 2) {
    const definiteness = numbered.some((it) => it.tags.has('definite'));
    const rowsFor = definiteness ? ['indefinite', 'definite'] : [''];
    const tableRows = rowsFor
      .map((d) => ({
        label: d ? cap(d) : '',
        cells: ['singular', 'plural'].map((n) => numbered.find((it) => it.tags.has(n) && (!d || it.tags.has(d) || (d === 'indefinite' && !it.tags.has('definite'))))?.form ?? ''),
      }))
      .filter((r) => r.cells.some(Boolean));
    numbered.forEach((it) => used.add(it.i));
    tables.push({ title: 'Singular and plural', rank: -1, columns: ['Singular', 'Plural'], rows: tableRows });
  }

  // 5 · Everything else as a short labelled list.
  const other = items
    .filter((_, i) => !used.has(i))
    .map((it) => ({ label: tagTitle(it.tags), form: it.form, order: OTHER_ORDER.findIndex((o) => it.tags.has(o)) }))
    .sort((a, b) => (a.order < 0 ? 99 : a.order) - (b.order < 0 ? 99 : b.order))
    .map(({ label, form }) => ({ label, form }));

  return { tables: tables.sort((a, b) => a.rank - b.rank).map(({ rank: _rank, ...table }) => table), other };
}
