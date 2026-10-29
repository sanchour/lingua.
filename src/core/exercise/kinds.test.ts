import { describe, expect, it } from 'vitest';
import { seededRandom } from '@/core/srs/ludus';
import type { ExerciseSpec } from '@/core/contracts/exercise';
import type { Item } from '@/core/grammar/types';
import { attachRetries, completeDialogue, correctMistake, dragSentence, judge, matchAffixes, matchAntonyms, matchDefinitions, matchPartsOfSpeech, matchPictures, matchSentences, matchSounds, matchSynonyms, predictForms, rewriteFix, sentenceTask, solutionOf, tenseTransforms } from './index';
import type { FormGrid, WordFacts } from './index';

const R = seededRandom(5);
const TRAINS = { skill: 'grammar', item: { type: 'grammar', topicId: 't' } } as const;
const WORDS: WordFacts[] = [
  { word: 'casa', gloss: 'house', synonyms: ['hogar'], antonyms: ['calle'], pos: 'noun', sentence: 'Mi casa es grande.', image: 'blob:1' },
  { word: 'grande', gloss: 'big', synonyms: ['enorme'], antonyms: ['pequeño'], pos: 'adj', sentence: 'Es una casa grande.' },
  { word: 'comer', gloss: 'to eat', synonyms: ['alimentarse'], antonyms: ['ayunar'], pos: 'verb', sentence: 'Quiero comer pan.' },
  { word: 'rápido', gloss: 'fast', synonyms: ['veloz'], antonyms: ['lento'], pos: 'adj', sentence: 'El tren es rápido.' },
  { word: 'bien', gloss: 'well', synonyms: ['correctamente'], antonyms: ['mal'], pos: 'adv', sentence: 'Habla muy bien.' },
];

describe('matching games', () => {
  it('make a pair for each word that has the fact, each side once, at most five', () => {
    const def = matchDefinitions(WORDS, 'es', seededRandom(1), 'k')!;
    expect(def.kind).toBe('match-definition');
    expect(def.body.pairs).toHaveLength(5);
    for (const p of def.body.pairs) expect(WORDS.find((w) => w.word === p.left)?.gloss).toBe(p.right);
    expect(matchSynonyms(WORDS, 'es', R, 'k')!.body.pairs.map((p) => p.right).sort()).toEqual(['alimentarse', 'correctamente', 'enorme', 'hogar', 'veloz']);
    expect(matchAntonyms(WORDS, 'es', R, 'k')!.kind).toBe('match-antonym');
    expect(matchSounds(WORDS, 'es', R, 'k')!.body.pairs.every((p) => p.say === p.left)).toBe(true);
  });

  it('leave out a word without the fact, and make no game of fewer than three pairs', () => {
    expect(matchDefinitions([{ word: 'a', gloss: 'x' }, { word: 'b' }, { word: 'c', gloss: 'z' }], 'es', R, 'k')).toBeNull();
    expect(matchPictures(WORDS, 'es', R, 'k')).toBeNull();
    expect(matchPictures([...WORDS.slice(0, 3).map((w, i) => ({ ...w, image: `blob:${i}` }))], 'es', R, 'k')!.body.pairs).toHaveLength(3);
  });

  it('never offers two words the same answer: parts of speech only where they differ', () => {
    const pos = matchPartsOfSpeech(WORDS, 'es', seededRandom(2), 'k')!;
    // casa noun, grande and rápido both adjectives: one of them, comer verb, bien adverb.
    expect(new Set(pos.body.pairs.map((p) => p.right)).size).toBe(pos.body.pairs.length);
    expect(pos.body.pairs.length).toBe(4);
  });

  it('puts a word into a sentence with the word missing', () => {
    const s = matchSentences(WORDS, 'es', seededRandom(3), 'k')!;
    expect(s.body.pairs.every((p) => p.right.includes('____') && !p.right.toLowerCase().includes(p.left))).toBe(true);
  });

  it('matches beginnings and endings with what they do', () => {
    const a = matchAffixes([{ affix: 'des-', meaning: 'undoing' }, { affix: '-mente', meaning: 'in a way' }, { affix: 're-', meaning: 'again' }], 'es', R, 'k')!;
    expect(a.body.pairs).toHaveLength(3);
  });
});

const ITEM: Item = { s: 'Ayer [comí] paella.', en: 'Yesterday I ate paella.', wrong: ['como', 'comeré', 'comía'] };

describe('sentences with a mistake', () => {
  it('"correct the mistake" shows the sentence with a wrong form and takes the right one; another wrong form is never close', () => {
    const spec = correctMistake(ITEM, 'preterite', 'es', seededRandom(4), 'k');
    expect(spec.body.shown).toMatch(/^Ayer (como|comeré|comía) paella\.$/);
    expect(judge(spec.check, 'comí', 'es').verdict).toBe('exact');
    expect(judge(spec.check, 'comi', 'es').verdict).toBe('close');
    for (const w of ITEM.wrong) expect(judge(spec.check, w, 'es').verdict).toBe('wrong');
    expect(spec.hints?.[0].text).toContain(spec.body.wrong);
  });

  it('"rewrite the sentence" will not take the sentence with its mistake as nearly right', () => {
    const spec = rewriteFix(ITEM, 'preterite', 'es', seededRandom(4), 'k');
    expect(judge(spec.check, 'Ayer comí paella.', 'es').verdict).toBe('exact');
    expect(judge(spec.check, spec.body.given[0], 'es').verdict).toBe('wrong');
    expect(solutionOf(spec)).toBe('Ayer comí paella.');
  });
});

describe('forms in order', () => {
  const grid: FormGrid = { title: 'Presente', columns: [], rows: [{ label: 'yo', cells: ['hablo'] }, { label: 'tú', cells: ['hablas'] }, { label: 'él', cells: ['habla'] }, { label: 'nosotros', cells: ['hablamos'] }] };

  it('asks for the next form after a few, and nothing else counts', () => {
    const [spec] = predictForms(grid, 't', 'es', seededRandom(7), 1);
    expect(spec.body.given.length).toBeGreaterThanOrEqual(2);
    const next = grid.rows.find((r) => r.label === spec.body.ask.label)!.cells[0];
    expect(judge(spec.check, next, 'es').verdict).toBe('exact');
    for (const g of spec.body.given) expect(judge(spec.check, g.form, 'es').verdict).toBe('wrong');
    expect(predictForms({ title: 't', columns: [], rows: grid.rows.slice(0, 2) }, 't', 'es', R, 3)).toEqual([]);
  });

  it('changes a form from one tense into the same person’s form in another', () => {
    const present: FormGrid = { title: 'Present', columns: [], rows: [{ label: 'yo', cells: ['hablo'] }, { label: 'tú', cells: ['hablas'] }] };
    const past: FormGrid = { title: 'Preterite', columns: [], rows: [{ label: 'yo', cells: ['hablé'] }, { label: 'tú', cells: ['hablaste'] }] };
    const specs = tenseTransforms([present, past], 'es', seededRandom(1), 4, TRAINS);
    expect(specs.length).toBe(2);
    const toPast = specs.find((s) => s.body.from.label === 'Present' && s.body.from.form === 'hablo')!;
    expect(toPast.body.to.label).toBe('Preterite');
    expect(judge(toPast.check, 'hablé', 'es').verdict).toBe('exact');
    expect(judge(toPast.check, 'hablaste', 'es').verdict).toBe('wrong');
  });

  it('is only into the plain past: never the subjunctive, never backwards', () => {
    const row = (form: string) => [{ label: 'yo', cells: [form] }];
    const grids: FormGrid[] = [
      { title: 'Present', columns: [], rows: row('hablo') },
      { title: 'Preterite', columns: [], rows: row('hablé') },
      { title: 'Imperfect subjunctive', columns: [], rows: row('hablara') },
      { title: 'Present subjunctive', columns: [], rows: row('hable') },
      { title: 'Future', columns: [], rows: row('hablaré') },
    ];
    const specs = tenseTransforms(grids, 'es', seededRandom(1), 10, TRAINS);
    expect(specs.map((s) => `${s.body.from.label}>${s.body.to.label}`)).toEqual(['Present>Preterite']);
  });
});

describe('dialogue, sentence tasks and dragging', () => {
  const lines = [{ speaker: 'A', text: '¿Cómo te llamas?' }, { speaker: 'B', text: 'Me llamo Ana.' }, { speaker: 'A', text: 'Mucho gusto.' }];

  it('completes a dialogue by typing the missing line', () => {
    const spec = completeDialogue(lines, 1, 'es', 'k', TRAINS)!;
    expect(spec.body.lines.map((l) => l.missing)).toEqual([false, true, false]);
    expect(judge(spec.check, 'me llamo ana', 'es').verdict).toBe('exact');
    expect(completeDialogue(lines.slice(0, 2), 1, 'es', 'k', TRAINS)).toBeNull();
  });

  it('a sentence task is judged by Max when there is a key, and rated by the learner when there is not', () => {
    const ai = sentenceTask('passive', ['El perro come la carne.'], 'La carne es comida por el perro.', 'es', 'k', TRAINS, true);
    const own = sentenceTask('combine', ['Tengo un gato.', 'Es negro.'], 'Tengo un gato que es negro.', 'es', 'k', TRAINS, false);
    expect(ai.kind).toBe('rewrite');
    expect(judge(ai.check, 'anything', 'es').outcome).toBe('ungraded');
    expect(own.kind).toBe('combine');
    expect(own.check.rule).toBe('self');
    expect(solutionOf(own)).toBe('Tengo un gato que es negro.');
  });

  it('drags a sentence’s words into order, never already in order, with a short sentence only', () => {
    const spec = dragSentence('El perro duerme en casa.', 'The dog sleeps at home.', 'es', seededRandom(2), 'k', TRAINS)!;
    expect(spec.body.tiles.join(' ')).not.toBe('El perro duerme en casa.');
    expect(judge(spec.check, ['El', 'perro', 'duerme', 'en', 'casa.'], 'es').verdict).toBe('exact');
    expect(judge(spec.check, spec.body.tiles, 'es').verdict).toBe('wrong');
    expect(dragSentence('Sí.', 'Yes.', 'es', R, 'k', TRAINS)).toBeNull();
  });

  it('gives each spec a spare of its own kind to try again with', () => {
    const a = correctMistake(ITEM, 't', 'es', R, 'a');
    const b = correctMistake({ ...ITEM, s: 'Hoy [bebí] agua.', wrong: ['bebo', 'beberé', 'bebía'] }, 't', 'es', R, 'b');
    const [withRetry] = attachRetries([a], [b]);
    expect(withRetry.retry?.key).toBe('b');
    expect(attachRetries<ExerciseSpec>([a], [dragSentence('uno dos tres cuatro', 'x', 'es', R, 'd', TRAINS)!])[0].retry).toBeUndefined();
  });
});

describe('use it in a sentence', () => {
  it('is rated by the learner, with an example to compare, and needs a sentence to show', async () => {
    const { useInSentence } = await import('./kinds');
    const spec = useInSentence({ word: 'perro', gloss: 'dog', sentence: 'El [perro] come mucho hoy.' }, 'es', 'use-0');
    expect(spec).toMatchObject({ kind: 'expand', check: { rule: 'self', modelAnswer: 'El perro come mucho hoy.' }, body: { given: ['perro: dog'] }, trains: { skill: 'writing', item: { wordId: 'es:perro' } } });
    expect(useInSentence({ word: 'gato' }, 'es', 'k')).toBeNull();
    expect(useInSentence({ word: 'agua', sentence: 'agua destilada' }, 'es', 'k')).toBeNull();
  });
});

describe('exercises from a line that was heard', () => {
  const line = { text: 'Mi perro come pan todos los días.', mediaId: 'm1', startMs: 4000, endMs: 7000 };
  it('dictation: the clip to play, and the line as the answer (a missing accent is only close)', async () => {
    const { listenType } = await import('./kinds');
    const { judge } = await import('./judge');
    const spec = listenType(line, 'es', 'k');
    expect(spec).toMatchObject({ kind: 'listen-type', listen: { text: line.text, clip: { mediaId: 'm1', startMs: 4000, endMs: 7000 } }, trains: { skill: 'listening', item: { type: 'text', textId: 'm1' } } });
    expect(judge(spec.check, 'mi perro come pan todos los dias', 'es').outcome).toBe('close');
    expect(judge(spec.check, 'Mi perro come pan todos los días', 'es').outcome).toBe('right');
    expect(judge(spec.check, 'mi gato come', 'es').outcome).toBe('wrong');
  });
  it('the missing word: never the first, a word of size, and the line is what is shown with a gap', async () => {
    const { listenGap } = await import('./kinds');
    for (let r = 0; r < 6; r++) {
      const spec = listenGap(line, 'es', () => r / 6, `g${r}`)!;
      const given = (spec.body as { given: string[] }).given[0];
      expect(given.split(' ')[0]).toBe('Mi');
      expect(given).toContain('_____');
      expect(spec.check).toMatchObject({ rule: 'accent-blind' });
      expect(given.replace('_____', (spec.check as { expected: string }).expected)).toBe(line.text.replace('días.', 'días.'));
    }
    expect(listenGap({ text: 'Hola, qué tal' }, 'es', () => 0, 'k')).toBeNull();
  });
  it('putting the words in order: the same words, in another order, and no spoken-only line outside 3 to 10 words', async () => {
    const { listenOrder } = await import('./kinds');
    const spec = listenOrder({ text: 'Mi perro come pan' }, 'es', () => 0.3, 'o')!;
    expect([...(spec.body as { tiles: string[] }).tiles].sort()).toEqual(['Mi', 'come', 'pan', 'perro'].sort());
    expect(listenOrder({ text: 'Hola' }, 'es', () => 0, 'o')).toBeNull();
    expect(spec.listen).toMatchObject({ text: 'Mi perro come pan' });
  });
});
