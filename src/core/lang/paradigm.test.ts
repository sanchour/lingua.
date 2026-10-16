import { describe, expect, it } from 'vitest';
import { formTables, tagTitle } from './paradigm';

// Rows as the v6 language packs store them (from Wiktionary via kaikki.org).
const ЧИТАТЬ: Array<[string, string]> = [
  ['чита́ть', 'imperfective infinitive'],
  ['чита́ющий', 'participle present'],
  ['чита́я', 'adverbial participle present'],
  ['чита́ю', 'first-person present singular'],
  ['бу́ду чита́ть', 'first-person future singular'],
  ['чита́ешь', 'present second-person singular'],
  ['чита́ет', 'present singular third-person'],
  ['чита́ем', 'first-person plural present'],
  ['чита́ете', 'plural present second-person'],
  ['чита́ют', 'plural present third-person'],
  ['бу́дешь чита́ть', 'future second-person singular'],
  ['чита́й', 'imperative second-person singular'],
  ['чита́йте', 'imperative plural second-person'],
  ['чита́л', 'masculine past singular'],
  ['чита́ли', 'masculine past plural'],
  ['чита́ла', 'feminine past singular'],
  ['чита́ло', 'neuter past singular'],
];

describe('form tables', () => {
  it('conjugates with pronouns, present first, and lists the rest', () => {
    const { tables, other } = formTables('ru', ЧИТАТЬ);
    expect(tables[0]).toEqual({
      title: 'Present',
      rows: [
        { label: 'я', cells: ['чита́ю'] },
        { label: 'ты', cells: ['чита́ешь'] },
        { label: 'он / она', cells: ['чита́ет'] },
        { label: 'мы', cells: ['чита́ем'] },
        { label: 'вы', cells: ['чита́ете'] },
        { label: 'они', cells: ['чита́ют'] },
      ],
    });
    const past = tables.find((t) => t.title === 'Past');
    expect(past?.rows).toEqual([
      { label: 'он', cells: ['чита́л'] },
      { label: 'она', cells: ['чита́ла'] },
      { label: 'оно', cells: ['чита́ло'] },
      { label: 'они', cells: ['чита́ли'] },
    ]);
    expect(tables.map((t) => t.title)).toContain('Future');
    expect(tables.map((t) => t.title)).toContain('Imperative');
    expect(other.map((o) => o.form)).toEqual(['чита́ть', 'чита́ющий', 'чита́я']);
    expect(other[0].label).toBe('Infinitive · imperfective');
  });

  it('declines nouns by case and number', () => {
    const { tables } = formTables('ru', [
      ['до́м', 'nominative singular'],
      ['дома́', 'nominative plural'],
      ['до́ма', 'genitive singular'],
      ['домо́в', 'genitive plural'],
      ['до́ме', 'prepositional singular'],
      ['дома́х', 'plural prepositional'],
    ]);
    expect(tables).toEqual([
      {
        title: 'By case',
        columns: ['Singular', 'Plural'],
        rows: [
          { label: 'Nominative', cells: ['до́м', 'дома́'] },
          { label: 'Genitive', cells: ['до́ма', 'домо́в'] },
          { label: 'Prepositional', cells: ['до́ме', 'дома́х'] },
        ],
      },
    ]);
  });

  it('declines adjectives by case and gender', () => {
    const { tables } = formTables('ru', [
      ['но́вый', 'masculine nominative'],
      ['но́вое', 'neuter nominative'],
      ['но́вая', 'feminine nominative'],
      ['но́вые', 'nominative plural'],
      ['но́вого', 'genitive masculine neuter'],
      ['но́вой', 'feminine genitive'],
      ['но́вых', 'genitive plural'],
    ]);
    expect(tables[0].columns).toEqual(['masc.', 'neut.', 'fem.', 'plural']);
    expect(tables[0].rows[1]).toEqual({ label: 'Genitive', cells: ['но́вого', 'но́вого', 'но́вой', 'но́вых'] });
  });

  it('gives Romance nouns their singular and plural, Swedish its definite forms', () => {
    expect(formTables('es', [['casa', 'singular'], ['casas', 'plural']]).tables).toEqual([
      { title: 'Singular and plural', columns: ['Singular', 'Plural'], rows: [{ label: '', cells: ['casa', 'casas'] }] },
    ]);
    const sv = formTables('sv', [
      ['hus', 'indefinite nominative singular'],
      ['huset', 'definite nominative singular'],
      ['hus', 'indefinite nominative plural'],
      ['husen', 'definite nominative plural'],
    ]);
    expect(sv.tables).toEqual([
      {
        title: 'Singular and plural',
        columns: ['Singular', 'Plural'],
        rows: [
          { label: 'Indefinite', cells: ['hus', 'hus'] },
          { label: 'Definite', cells: ['huset', 'husen'] },
        ],
      },
    ]);
  });

  it('leaves pronoun-attached verb forms out of verb tables', () => {
    const { tables } = formTables(
      'es',
      [
        ['hablarme', 'accusative infinitive'],
        ['hablo', 'first-person indicative present singular'],
        ['hablas', 'indicative present second-person singular'],
        ['habla', 'indicative present singular third-person'],
      ],
      'verb',
    );
    expect(tables.map((t) => t.title)).toEqual(['Present']);
    expect(tables[0].rows[0]).toEqual({ label: 'yo', cells: ['hablo'] });
  });

  it('names tables plainly', () => {
    expect(tagTitle(['present', 'subjunctive'])).toBe('Present subjunctive');
    expect(tagTitle(['historic', 'indicative', 'past'])).toBe('Past historic');
    expect(tagTitle(['passive', 'perfective', 'past', 'indicative'])).toBe('Past · perfective, passive');
  });
});
