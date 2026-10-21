// Word forms in their own English (5.1-3a), checked on the real packs: what a reader sees on hover.
import { readFileSync, writeFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { FIXES, VERBS } from './commonGlosses';
import { senseInContext } from './context';
import { englishPlural, englishVerb, formGloss, fromParadigm, parseFormOf, planForm } from './formGloss';
import type { LemmaSense } from './formGloss';

type PackForm = [form: string, lemmas: number[], gloss: string, description: string];
type PackLemma = [lemma: string, ...rest: unknown[]];

/** The meaning a reader gets for each form, as services/translate/gloss works it out. */
function readerGlosses(lang: string) {
  const pack = JSON.parse(gunzipSync(readFileSync(`public/packs/${lang}.v7.json.gz`)).toString()) as {
    freq: string[];
    forms: PackForm[];
    lemmas: PackLemma[];
    paradigms: Array<[lemma: number, pos: string, forms: Array<[string, number]>]>;
    tagSets: string[];
  };
  const tables = new Map(pack.paradigms.map(([l, , forms]) => [pack.lemmas[l][0], forms.map(([form, t]) => [form, pack.tagSets[t]] as const)]));
  const senses = (l: PackLemma): LemmaSense[] => ((l[4] as Array<[string, string[]]>) ?? []).map(([pos, glosses]) => ({ pos, glosses }));
  const byLemma = new Map(pack.lemmas.map((l) => [l[0], senses(l)]));
  const forms = new Map(pack.forms.map((f) => [f[0], f]));
  const gloss = (word: string): string | undefined => {
    const f = forms.get(word);
    if (!f) return undefined;
    const fix = FIXES[lang]?.[word];
    if (fix) return fix;
    const plan = planForm(lang, { form: word, lemmas: f[1].map((i) => pack.lemmas[i][0]), d: f[3] });
    const table = plan && tables.get(plan.lemma);
    if (plan && table) fromParadigm(lang, plan, table.filter(([form]) => form.toLocaleLowerCase(lang) === word).map(([, tags]) => tags));
    const lemmaSenses = plan && byLemma.get(plan.lemma);
    return (lemmaSenses && formGloss(plan.p, lemmaSenses, VERBS[lang]?.[plan.lemma])) || f[2];
  };
  return { gloss, freq: pack.freq };
}

describe('English inflection', () => {
  it('conjugates by person, number and tense', () => {
    expect(englishVerb('have', { lemma: 'tener', person: 1, tense: 'present' })).toBe('I have');
    expect(englishVerb('have', { lemma: 'tener', person: 3, tense: 'present' })).toBe('has');
    expect(englishVerb('be', { lemma: 'ser', person: 1, plural: true, tense: 'present' })).toBe('we are');
    expect(englishVerb('say', { lemma: 'decir', person: 3, tense: 'past' })).toBe('said');
    expect(englishVerb('can', { lemma: 'poder', tense: 'conditional' })).toBe('could');
    expect(englishVerb('go', { lemma: 'ir', person: 1, tense: 'future' })).toBe('I will go');
    expect(englishVerb('look for', { lemma: 'buscar', person: 3, tense: 'present' })).toBe('looks for');
    expect(englishVerb('stop', { lemma: 'parar', participle: 'present' })).toBe('stopping');
  });

  it('makes nouns plural', () => {
    expect(englishPlural('year')).toBe('years');
    expect(englishPlural('child')).toBe('children');
    expect(englishPlural('city')).toBe('cities');
    expect(englishPlural('piece of cake')).toBe('pieces of cake');
  });

  it('reads Wiktionary descriptions', () => {
    expect(parseFormOf('first-person singular present indicative of tener')).toEqual({ lemma: 'tener', person: 1, tense: 'present' });
    expect(parseFormOf('first/third-person singular conditional of poder')).toEqual({ lemma: 'poder', tense: 'conditional' });
    expect(parseFormOf('plural of año')).toEqual({ lemma: 'año', plural: true, nounPlural: true });
    expect(parseFormOf('misspelling of ha')).toBeNull();
  });
});

describe('what a reader sees', () => {
  const cases: Record<string, Record<string, string>> = {
    es: { hermana: 'sister', hija: 'daughter', a: 'to; at', entiende: 'understands', lleva: 'carries', tenía: 'had', necesito: 'I need', años: 'years', podría: 'could', estaba: 'was', personas: 'people' },
    fr: { suis: 'I am; I follow', ai: 'I have', enfants: 'children', avait: 'had', sont: 'they are; are' },
    de: { kann: 'can', habe: 'I have', kinder: 'children', gesagt: 'said', wäre: 'would be', könnte: 'could', steht: 'stands' },
    ru: { знаю: 'I know', хочу: 'I want', сказал: 'said', был: 'was', есть: 'there is; is; to eat' },
  };
  for (const [lang, want] of Object.entries(cases)) {
    it(`gets ${lang}'s common forms right`, () => {
      const { gloss } = readerGlosses(lang);
      for (const [word, meaning] of Object.entries(want)) expect([word, gloss(word)]).toEqual([word, meaning]);
    });
  }

  it('never turns a function word into a rare noun from its context', () => {
    const a = [
      { lemma: 'a', pos: 'prep', glosses: ['to', 'at'] },
      { lemma: 'a', pos: 'intj', glosses: ['huh'] },
      { lemma: 'a', pos: 'noun', glosses: ['bishop'] },
    ];
    expect(senseInContext(a, 'noun')).toBeNull();
    const tarde = [
      { lemma: 'tarde', pos: 'adv', glosses: ['late'] },
      { lemma: 'tarde', pos: 'noun', glosses: ['afternoon', 'evening'] },
    ];
    expect(senseInContext(tarde, 'noun')?.glosses[0]).toBe('afternoon');
  });

  // For review by hand: LINGUA_GLOSS_REVIEW=dir writes the 300 commonest words' meanings there.
  it.skipIf(!process.env.LINGUA_GLOSS_REVIEW)('writes the review lists', () => {
    for (const lang of ['es', 'fr', 'de', 'ru']) {
      const { gloss, freq } = readerGlosses(lang);
      writeFileSync(`${process.env.LINGUA_GLOSS_REVIEW}/${lang}.txt`, freq.slice(0, 300).map((w) => `${w}=${gloss(w) ?? '—'}`).join(' | '));
    }
  });
});
