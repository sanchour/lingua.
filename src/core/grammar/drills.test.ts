import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';
import { bare, checkForm, DRILL_KINDS, drillableTables, fits, itemDrill, joinTiles, planLightning, planReview, planTopicLesson, resolveKind, retryDrill, seededRandom, sentenceTiles, tilesMatch } from './drills';
import type { Drill } from './drills';
import { topicForTags } from './progress';
import { plain, splitFocus, topicsOf } from './types';
import type { Grammar, Item } from './types';

const TOPICS = join(process.cwd(), 'src', 'core', 'grammar', 'topics');
const GRAMMARS: Grammar[] = [];
for (const file of readdirSync(TOPICS).filter((f) => f.endsWith('.ts'))) {
  GRAMMARS.push(((await import(/* @vite-ignore */ pathToFileURL(join(TOPICS, file)).href)) as { default: Grammar }).default);
}

const item = (s: string, wrong: [string, string, string], en = 'x'): Item => ({ s, en, wrong });

describe('grammar drills, by hand', () => {
  it('keeps the form one tile and finds where it is', () => {
    expect(sentenceTiles(item('Ayer [he comido] paella.', ['comí', 'como', 'comeré']), 'es')).toEqual({ tokens: ['Ayer', 'he comido', 'paella'], at: 1 });
    expect(sentenceTiles(item('¿[Tienes] hambre?', ['Tengo', 'Tiene', 'Tenemos']), 'es')?.tokens).toEqual(['Tienes', 'hambre']);
  });

  it('refuses a form glued to its neighbour', () => {
    expect(sentenceTiles(item("C'est l’[homme].", ['a', 'b', 'c']), 'fr')).toBeNull();
  });

  it('segments Mandarin into words', () => {
    const t = sentenceTiles(item('这[是]什么？', ['在', '很', '吗']), 'zh');
    expect(t?.tokens[t.at]).toBe('是');
    expect(joinTiles(t!.tokens, 'zh')).toBe('这是什么');
  });

  it('takes Russian stress marks off forms only', () => {
    expect(bare('моя́', 'ru')).toBe('моя');
    expect(bare('está', 'es')).toBe('está');
    const t = sentenceTiles(item('Я Том, а э́то [моя́] ма́ма.', ['мой', 'моё', 'мою']), 'ru')!;
    expect(t.tokens[t.at]).toBe('моя');
    expect(t.tokens).toContain('э́то');
  });

  it('forgives missing accents unless they make another form', () => {
    expect(checkForm('comio', item('Ayer [comió] paella.', ['come', 'comía', 'comerá']), 'es')).toMatchObject({ verdict: 'close', note: 'accent' });
    expect(checkForm('hablo', item('Ayer [habló] mucho.', ['hablo', 'hablaba', 'hablará']), 'es').verdict).toBe('wrong');
    expect(checkForm('  Comió! ', item('Ayer [comió] paella.', ['come', 'comía', 'comerá']), 'es').verdict).toBe('exact');
    expect(checkForm('моя', item('Это [моя́] ма́ма.', ['мой', 'моё', 'мою']), 'ru').verdict).toBe('exact');
    // A hamza left off (انا) is how many write it day to day: marks are folded away, letters are not.
    expect(checkForm('انا', item('[أَنَا] هنا.', ['أَنْتَ', 'هُوَ', 'نَحْنُ']), 'ar').verdict).toBe('exact');
    expect(checkForm('هو', item('[أَنَا] هنا.', ['أَنْتَ', 'هُوَ', 'نَحْنُ']), 'ar').verdict).toBe('wrong');
    expect(checkForm('أنا', item('[أَنَا] هنا.', ['أَنْتَ', 'هُوَ', 'نَحْنُ']), 'ar').verdict).toBe('exact');
  });

  it('compares tiles without case', () => {
    expect(tilesMatch(['die', 'Katze', 'spielt'], ['Die', 'Katze', 'spielt'], 'de')).toBe(true);
    expect(tilesMatch(['Katze', 'die', 'spielt'], ['Die', 'Katze', 'spielt'], 'de')).toBe(false);
  });

  it('falls back when a kind is off or impossible', () => {
    const it2 = item('Hola [es] hoy.', ['a', 'b', 'c']);
    expect(resolveKind('build', it2, 'es', { random: Math.random, typing: false })).toBe('pick');
    expect(resolveKind('hear', it2, 'es', { random: Math.random, canHear: false })).toBe('recognise');
    expect(resolveKind('pick', it2, 'es', { random: Math.random, off: new Set(['pick', 'recognise']) })).toBe('pick');
  });
});

const check = (d: Drill, lang: string) => {
  if ('options' in d) {
    expect(new Set(d.options).size, d.key).toBe(d.options.length);
    expect(d.answer).toBeGreaterThanOrEqual(0);
  }
  if (d.kind === 'recognise') expect(d.options[d.answer]).toBe(plain(d.item.s.replace(/\[([^\]]*)\]/, (_, f: string) => bare(f, lang))));
  if (d.kind === 'pick' || d.kind === 'hear') expect(d.options[d.answer]).toBe(bare(splitFocus(d.item.s).focus, lang));
  if (d.kind === 'order') expect([...d.tiles].sort()).toEqual([...d.answer].sort());
  if (d.kind === 'say') expect(d.tiles.length).toBeGreaterThan(d.answer.length);
  if (d.kind === 'spot') expect(d.tokens[d.wrongAt]).not.toBe(bare(splitFocus(d.item.s).focus, lang));
  if (d.kind === 'pairs') expect(d.pairs.length).toBeGreaterThanOrEqual(3);
};

describe('grammar drills over every module', () => {
  for (const g of GRAMMARS) {
    describe(g.lang, () => {
      const topics = topicsOf(g);

      it('never accepts a wrong form as the right one', () => {
        for (const t of topics)
          for (const i of t.items) {
            expect(checkForm(splitFocus(i.s).focus, i, g.lang).verdict, i.s).toBe('exact');
            for (const w of i.wrong) expect(checkForm(w, i, g.lang).verdict, `${i.s} ← ${w}`).toBe('wrong');
          }
      });

      it('makes every kind of exercise that fits each item', () => {
        const random = seededRandom(7);
        for (const t of topics)
          for (const i of t.items)
            for (const kind of DRILL_KINDS) {
              if (!fits(kind, i, g.lang)) continue;
              check(itemDrill(kind, i, t.id, g.lang, random, 'k'), g.lang);
            }
      });

      it('plans a lesson of every step for every topic', () => {
        for (const t of topics)
          for (const step of [1, 2, 3, 4, 5, 'mix'] as const) {
            const plan = planTopicLesson(t, g.lang, step, { random: seededRandom(3), canHear: true });
            expect(plan.length, `${t.id} ${step}`).toBeGreaterThanOrEqual(Math.min(8, t.items.length));
            for (const d of plan) check(d, g.lang);
            for (const d of plan) check(retryDrill(d, seededRandom(1), 1), g.lang);
          }
      });

      it('plans reviews and lightning rounds', () => {
        const entries = topics.slice(0, 4).flatMap((t) => t.items.slice(0, 2).map((i) => ({ topic: t, item: i, passed: 4 })));
        for (const d of planReview(entries, g.lang, { random: seededRandom(5) })) check(d, g.lang);
        const round = planLightning(topics, g.lang, seededRandom(9), 30);
        expect(round).toHaveLength(30);
        for (const d of round) check(d, g.lang);
      });

      it('has tables to drill', () => {
        expect(topics.filter((t) => drillableTables(t).length > 0).length).toBeGreaterThan(0);
      });
    });
  }
});

describe('grammar lessons, part 3', () => {
  const g = GRAMMARS.find((x) => x.lang === 'es')!;
  const [a, b, c] = topicsOf(g);

  it('mixes in at most three items due from other topics, never its own', () => {
    const due = [b, c, a, b].flatMap((t) => t.items.slice(0, 2).map((item) => ({ topic: t, item, passed: 2 })));
    const plan = planTopicLesson(a, 'es', 2, { random: seededRandom(1), due });
    const extra = plan.filter((d) => d.key.includes('-due-'));
    expect(extra).toHaveLength(3);
    expect(extra.every((d) => d.topic !== a.id)).toBe(true);
  });

  it('asks for a sentence of the learner’s own only with an AI key, at step 5 and in practice', () => {
    const has = (step: 1 | 5 | 'mix', canWrite: boolean) => planTopicLesson(a, 'es', step, { random: seededRandom(2), canWrite }).some((d) => d.kind === 'own');
    expect(has(5, true)).toBe(true);
    expect(has('mix', true)).toBe(true);
    expect(has(5, false)).toBe(false);
    expect(has(1, true)).toBe(false);
  });
});

describe('why this form', () => {
  const find = (lang: string) => GRAMMARS.find((x) => x.lang === lang)!;
  const why = (lang: string, d: string) => topicForTags(find(lang), d.toLowerCase().replace(/[,;()]/g, ' '))?.id;

  it('finds the topic from a form’s description in the pack', () => {
    expect(why('es', 'third-person singular present indicative of ser')).toBeDefined();
    expect(why('es', 'first-person singular preterite indicative of comer')).toBe(topicForTags(find('es'), 'preterite indicative')?.id);
    expect(why('es', 'masculine singular past participle of hablar')).toBe(topicForTags(find('es'), 'participle past')?.id);
    expect(why('es', 'third-person singular imperfect subjunctive of ser')).toBe(topicForTags(find('es'), 'imperfect subjunctive')?.id);
    expect(why('es', 'accusative of ella, ello, and usted; her, it, you')).toBeUndefined();
  });
});
