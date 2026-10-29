import { describe, expect, it } from 'vitest';
import { OUTLINE } from '@/core/course/outline';
import { planCourseLesson } from '@/core/course/lessons';
import { loadCourse } from '@/core/course/load';
import { planTopicLesson } from '@/core/grammar/drills';
import { loadGrammar } from '@/core/grammar/load';
import { topicsOf } from '@/core/grammar/types';
import { planLesson, seededRandom } from '@/core/srs/ludus';
import type { LudusItem } from '@/core/srs/ludus';
import { formTables } from '@/core/lang/paradigm';
import { gridOfFormTable, gridOfGrammarTable, judge, pairsOfGrid, planTransforms, solutionOf, transformSpec } from './index';
import type { FormGrid } from './index';

const PRESENT: FormGrid = {
  title: 'Presente',
  columns: [],
  rows: [
    { label: 'yo', cells: ['hablo'] },
    { label: 'tú', cells: ['hablas'] },
    { label: 'él / ella', cells: ['habla'] },
    { label: 'nosotros', cells: ['hablamos'] },
  ],
};

const NOUNS = gridOfGrammarTable({
  title: 'Articles',
  columns: ['', 'singular', 'plural'],
  rows: [
    ['masculine', 'el', 'los'],
    ['feminine', 'la', 'las'],
  ],
});

const TRAINS = { skill: 'grammar', item: { type: 'grammar', topicId: 't' } } as const;

describe('the form tables transformations are made from', () => {
  it('reads Grammatica tables: the first heading belongs to the row labels', () => {
    expect(NOUNS.columns).toEqual(['singular', 'plural']);
    expect(NOUNS.rows[0]).toEqual({ label: 'masculine', cells: ['el', 'los'] });
  });

  it('reads dictionary tables', () => {
    const grid = gridOfFormTable({ title: 'Present', rows: [{ label: 'I', cells: ['eat'] }] });
    expect(grid).toEqual({ title: 'Present', columns: [], rows: [{ label: 'I', cells: ['eat'] }] });
  });

  it('pairs forms across a row (named by the columns) and down a column (named by the rows)', () => {
    const pairs = pairsOfGrid(NOUNS);
    const across = pairs.find((p) => p.from.form === 'el');
    expect(across).toMatchObject({ title: 'Articles · masculine', from: { label: 'singular' }, to: { form: 'los', label: 'plural' } });
    const down = pairsOfGrid(PRESENT).find((p) => p.from.form === 'hablo' && p.to.form === 'hablamos');
    expect(down).toMatchObject({ title: 'Presente', from: { label: 'yo' }, to: { label: 'nosotros' } });
    // Nothing is asked between forms that are not alike in either row or column.
    expect(pairs.some((p) => p.from.form === 'el' && p.to.form === 'las')).toBe(false);
  });

  it('leaves out cells with notes, alternatives or nothing in them', () => {
    const grid: FormGrid = { title: 't', columns: ['a', 'b', 'c'], rows: [{ label: 'x', cells: ['aa', '—', 'a / b'] }] };
    expect(pairsOfGrid(grid)).toEqual([]);
  });
});

describe('judging a transformation', () => {
  const spec = transformSpec(pairsOfGrid(PRESENT).find((p) => p.from.form === 'hablo' && p.to.form === 'hablamos')!, 'es', 'k', TRAINS, 'hablar');

  it('accepts the form, ignoring case and spaces', () => {
    expect(judge(spec.check, '  Hablamos ', 'es')).toMatchObject({ verdict: 'exact', outcome: 'right' });
  });

  it('says a slip is nearly right', () => {
    expect(judge(spec.check, 'hablamo', 'es')).toMatchObject({ verdict: 'close', note: 'typo', message: 'Nearly: one letter is off.' });
  });

  it('never calls another real form of the word a slip', () => {
    // hablamos → habláis would be a typo-distance trap; hablas is a different form in the table.
    expect(judge(spec.check, 'hablas', 'es')).toMatchObject({ verdict: 'wrong', outcome: 'wrong' });
    expect(judge(spec.check, 'habla', 'es').verdict).toBe('wrong');
  });

  it('names the right stem when only the ending is wrong', () => {
    expect(judge(spec.check, 'hablaron', 'es')).toMatchObject({ verdict: 'wrong', message: 'Right stem, wrong ending.' });
    expect(judge(spec.check, 'xyz', 'es').message).toBeUndefined();
  });

  it('forgives a missing accent unless that makes another form', () => {
    const accents: FormGrid = { title: 'Pretérito', columns: [], rows: [{ label: 'yo', cells: ['hablé'] }, { label: 'él', cells: ['habló'] }, { label: 'ellos', cells: ['hablaron'] }] };
    const s = transformSpec(pairsOfGrid(accents).find((p) => p.to.form === 'habló' && p.from.form === 'hablé')!, 'es', 'k', TRAINS);
    expect(judge(s.check, 'hablo', 'es').verdict).toBe('close');
    const present: FormGrid = { title: 'x', columns: [], rows: [{ label: 'yo', cells: ['hablo'] }, { label: 'él', cells: ['habló'] }] };
    const s2 = transformSpec(pairsOfGrid(present).find((p) => p.to.form === 'habló')!, 'es', 'k', TRAINS);
    expect(judge(s2.check, 'hablo', 'es').verdict).toBe('wrong');
  });

  it('has hints that grow and a solution to show', () => {
    expect(spec.hints?.map((h) => h.strength)).toEqual([0, 1, 2]);
    expect(spec.hints?.[0].text).toBe('It is the nosotros form.');
    expect(spec.hints?.[2].text).toBe('habl…');
    expect(solutionOf(spec)).toBe('hablamos');
  });
});

describe('the other rules', () => {
  it('judges choices, tiles and the free answers it cannot judge', () => {
    expect(judge({ rule: 'choice', answer: 2 }, 2, 'es').verdict).toBe('exact');
    expect(judge({ rule: 'choice', answer: 2 }, 1, 'es').verdict).toBe('wrong');
    expect(judge({ rule: 'order', answer: ['El', 'perro'] }, ['el', 'perro'], 'es').verdict).toBe('exact');
    expect(judge({ rule: 'accepted', accepted: ['colour', 'color'] }, 'Color', 'en').verdict).toBe('exact');
    expect(judge({ rule: 'self', modelAnswer: 'x' }, 'anything', 'en')).toMatchObject({ verdict: 'ungraded', outcome: 'ungraded', expected: 'x' });
    expect(judge({ rule: 'ai', modelAnswer: 'y' }, 'anything', 'en').outcome).toBe('ungraded');
  });
});

describe('planning transformations', () => {
  it('asks for each form once, the same way for the same seed', () => {
    const a = planTransforms([PRESENT, NOUNS], 'es', seededRandom(4), 5, { trains: TRAINS });
    const b = planTransforms([PRESENT, NOUNS], 'es', seededRandom(4), 5, { trains: TRAINS });
    expect(a.map((s) => s.body.from.form + '>' + s.check.rule)).toEqual(b.map((s) => s.body.from.form + '>' + s.check.rule));
    expect(a).toHaveLength(5);
    const asked = a.map((s) => `${s.body.title}|${solutionOf(s)}`);
    expect(new Set(asked).size).toBe(asked.length);
    expect(new Set(a.map((s) => s.key)).size).toBe(5);
  });

  it('plans nothing from a table with one form', () => {
    expect(planTransforms([{ title: 't', columns: [], rows: [{ label: 'a', cells: ['x'] }] }], 'es', seededRandom(1), 3, { trains: TRAINS })).toEqual([]);
  });

  it('works on a real dictionary paradigm', () => {
    const forms: Array<[string, string]> = [
      ['como', 'first-person singular present indicative'],
      ['comes', 'second-person singular present indicative'],
      ['come', 'third-person singular present indicative'],
      ['comemos', 'first-person plural present indicative'],
      ['coméis', 'second-person plural present indicative'],
      ['comen', 'third-person plural present indicative'],
    ];
    const built = formTables('es', forms, 'verb');
    const plan = planTransforms(built.tables.map(gridOfFormTable), 'es', seededRandom(2), 3, { trains: TRAINS, lemma: 'comer' });
    expect(plan.length).toBeGreaterThan(0);
    for (const s of plan) expect(judge(s.check, solutionOf(s), 'es').verdict).toBe('exact');
  });
});

// ── One kind, three rooms: no room-specific code makes the transformations ──

describe('the same exercise in Ludus, Grammatica and the course', () => {
  it('Ludus: a card with a form to change may get a transformation, and the others never', () => {
    const items: LudusItem[] = ['hablar', 'comer', 'vivir', 'amar', 'beber'].map((term, i) => ({ id: String(i), term, meaning: `to ${term}`, pos: 'verb', isNew: false }));
    const spec = planTransforms([PRESENT], 'es', seededRandom(1), 1, { trains: TRAINS })[0];
    const transforms = new Map([['0', spec]]);
    const kinds = new Set<string>();
    for (let seed = 1; seed < 60; seed++) {
      for (const ex of planLesson(items, items, { random: seededRandom(seed), match: false, transforms })) {
        if (ex.kind === 'transform') {
          expect(ex.item.id).toBe('0');
          expect(ex.spec).toBe(spec);
        }
        kinds.add(ex.kind);
      }
    }
    expect(kinds.has('transform')).toBe(true);
    // Without a source, or with the kind switched off or typing off, none is planned.
    for (const opts of [{}, { transforms, off: new Set(['transform'] as const) }, { transforms, typing: false }]) {
      for (let seed = 1; seed < 30; seed++) expect(planLesson(items, items, { random: seededRandom(seed), match: false, ...opts }).map((e) => e.kind)).not.toContain('transform');
    }
  });

  it('Grammatica and the course draw them from a topic’s tables, and the learner can switch them off', async () => {
    const grammar = (await loadGrammar('es'))!;
    const topic = topicsOf(grammar).find((t) => (t.tables ?? []).length && t.items.length >= 6)!;
    const lesson = planTopicLesson(topic, 'es', 2, { random: seededRandom(3), size: 8 });
    expect(lesson.filter((d) => d.kind === 'transform').length).toBeGreaterThan(0);
    expect(planTopicLesson(topic, 'es', 2, { random: seededRandom(3), size: 8, off: new Set(['transform']) }).map((d) => d.kind)).not.toContain('transform');

    const course = (await loadCourse('es'))!;
    const withTables = Object.entries(course.units).filter(([, u]) => u.grammar.some((id) => (topicsOf(grammar).find((t) => t.id === id)?.tables ?? []).length));
    expect(withTables.length).toBeGreaterThan(0);
    const [id, content] = withTables[0];
    const plan = planCourseLesson('grammar', OUTLINE.find((u) => u.id === id)!, content, grammar, 'es', { random: seededRandom(5), size: 10 })!;
    expect(plan.drills.some((d) => d.kind === 'transform')).toBe(true);
  });
});
