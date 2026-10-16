import { describe, expect, it } from 'vitest';
import { createEmptyCard } from 'ts-fsrs';
import type { Card } from '@/data/types';
import { checkAnswer, normalizeAnswer } from './answer';
import { gradeFor, planLesson, retryOf, seededRandom, sentenceTiles } from './ludus';
import type { LudusItem } from './ludus';
import { buildQueue, requeue } from './queue';
import { dayEnd, formatInterval, maturityOf, previewIntervals, rate } from './scheduler';

const NOW = new Date(2026, 9, 15, 12).getTime();
const MIN = 60_000;
const DAY = 86_400_000;

function card(id: string, patch: Partial<Card> = {}): Card {
  const e = createEmptyCard(new Date(NOW - DAY));
  return {
    id,
    noteId: `n-${id}`,
    deckId: 'd',
    direction: 'recognition',
    due: e.due.getTime(),
    stability: e.stability,
    difficulty: e.difficulty,
    elapsedDays: e.elapsed_days,
    scheduledDays: e.scheduled_days,
    learningSteps: e.learning_steps,
    reps: e.reps,
    lapses: e.lapses,
    state: 0,
    suspended: 0,
    createdAt: NOW - DAY,
    updatedAt: NOW - DAY,
    ...patch,
  };
}

describe('scheduler', () => {
  it('moves a new card into learning on Good and grows the interval as it is remembered', () => {
    const first = rate(card('a'), 3, NOW);
    expect(first.next.state).toBe(1);
    expect(first.next.due - NOW).toBeLessThan(DAY);

    let c: Card = { ...card('a'), ...first.next };
    let at = c.due;
    for (let i = 0; i < 4; i++) {
      c = { ...c, ...rate(c, 3, at).next };
      at = c.due;
    }
    expect(c.state).toBe(2);
    expect(c.scheduledDays).toBeGreaterThan(5);
  });

  it('previews Again < Hard < Good < Easy and formats them', () => {
    const review = card('r', { state: 2, stability: 10, difficulty: 5, scheduledDays: 10, lastReview: NOW - 10 * DAY, due: NOW, reps: 5 });
    const p = previewIntervals(review, NOW);
    expect(p[1]).toBeLessThan(p[2]);
    expect(p[2]).toBeLessThan(p[3]);
    expect(p[3]).toBeLessThan(p[4]);
    expect(formatInterval(30_000)).toBe('<1m');
    expect(formatInterval(10 * MIN)).toBe('10m');
    expect(formatInterval(4 * DAY)).toBe('4d');
    expect(formatInterval(400 * DAY)).toBe('1.1y');
  });

  it('labels maturity and uses 4 am as the day boundary', () => {
    expect(maturityOf({ state: 0, scheduledDays: 0 })).toBe('new');
    expect(maturityOf({ state: 3, scheduledDays: 0 })).toBe('learning');
    expect(maturityOf({ state: 2, scheduledDays: 5 })).toBe('young');
    expect(maturityOf({ state: 2, scheduledDays: 30 })).toBe('mature');
    expect(new Date(dayEnd(NOW)).getHours()).toBe(4);
    expect(dayEnd(NOW)).toBeGreaterThan(NOW);
    expect(dayEnd(new Date(2026, 9, 15, 2).getTime())).toBe(new Date(2026, 9, 15, 4).getTime());
  });
});

describe('queue', () => {
  it('puts due learning first, then reviews with new cards interleaved, within limits', () => {
    const cards = [
      card('new1', { createdAt: 1 }),
      card('new2', { createdAt: 2 }),
      card('new3', { createdAt: 3 }),
      card('rev-late', { state: 2, due: NOW - 5 * DAY }),
      card('rev', { state: 2, due: NOW - DAY }),
      card('rev-future', { state: 2, due: NOW + 3 * DAY }),
      card('learn', { state: 1, due: NOW + 5 * MIN }),
      card('learn-later', { state: 1, due: NOW + 2 * 60 * MIN }),
      card('sus', { state: 2, due: NOW - DAY, suspended: 1 }),
    ];
    const ids = buildQueue(cards, { newLeft: 2, reviewsLeft: 10 }, NOW).map((c) => c.id);
    expect(ids).toEqual(['learn', 'rev-late', 'rev', 'new1', 'new2']);
  });

  it('brings a missed card back a few cards later', () => {
    const queue = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map((id) => card(id, { state: 2 }));
    const missed = card('a', { state: 3, due: NOW + MIN });
    const next = requeue(queue, missed, NOW).map((c) => c.id);
    expect(next.indexOf('a')).toBe(6);
    const learnt = card('b', { state: 2, due: NOW + 3 * DAY });
    expect(requeue(queue, learnt, NOW).map((c) => c.id)).not.toContain('b');
  });
});

describe('answers', () => {
  it('ignores case, punctuation, stress marks and articles', () => {
    expect(normalizeAnswer('¡El Perro!', 'es')).toBe('perro');
    expect(checkAnswer('собака', 'соба́ка', 'ru').verdict).toBe('exact');
    expect(checkAnswer('der Hund', 'Hund', 'de').verdict).toBe('exact');
    expect(checkAnswer("l'eau", 'eau', 'fr').verdict).toBe('exact');
    expect(checkAnswer('to eat', 'eat', 'en').verdict).toBe('exact');
  });

  it('accepts a missing accent or a small typo as close, nothing more', () => {
    expect(checkAnswer('cafe', 'café', 'fr')).toMatchObject({ verdict: 'close', note: 'accent' });
    expect(checkAnswer('ευχαριστω', 'ευχαριστώ', 'el')).toMatchObject({ verdict: 'close', note: 'accent' });
    expect(checkAnswer('scmetterling', 'Schmetterling', 'de')).toMatchObject({ verdict: 'close', note: 'typo' });
    expect(checkAnswer('kat', 'Katze', 'de').verdict).toBe('wrong');
    expect(checkAnswer('', 'Katze', 'de').verdict).toBe('wrong');
    expect(checkAnswer('кот', 'ко́шка / кот', 'ru')).toMatchObject({ verdict: 'exact', expected: 'кот' });
  });
});

describe('ludus', () => {
  const items: LudusItem[] = [
    { id: '1', term: 'perro', meaning: 'dog', pos: 'noun', isNew: false, example: { text: 'El perro duerme en casa.', translation: 'The dog sleeps at home.', cloze: [3, 8] } },
    { id: '2', term: 'gato', meaning: 'cat', pos: 'noun', isNew: true },
    { id: '3', term: 'comer', meaning: 'to eat', pos: 'verb', isNew: false },
    { id: '4', term: 'rojo', meaning: 'red', pos: 'adj', isNew: false },
    { id: '5', term: 'casa', meaning: 'house', pos: 'noun', isNew: false },
  ];

  it('plans a lesson: a match round, an exercise per card, and a second one for new cards', () => {
    const plan = planLesson(items, items, { random: seededRandom(7), canListen: false });
    expect(plan[0].kind).toBe('match');
    const perCard = new Map<string, number>();
    for (const ex of plan.slice(1)) if ('item' in ex) perCard.set(ex.item.id, (perCard.get(ex.item.id) ?? 0) + 1);
    expect(perCard.get('2')).toBe(2);
    expect([...perCard.values()].reduce((a, b) => a + b, 0)).toBe(items.length + 1);
    for (const ex of plan) {
      if ('options' in ex) {
        expect(new Set(ex.options).size).toBe(ex.options.length);
        expect(ex.options[ex.answer]).toBeDefined();
      }
      expect(ex.kind).not.toBe('listen');
    }
    // Same seed, same lesson.
    expect(planLesson(items, items, { random: seededRandom(7), canListen: false }).map((e) => e.kind)).toEqual(plan.map((e) => e.kind));
  });

  it('makes gaps and word banks from examples', () => {
    for (let seed = 1; seed < 40; seed++) {
      const plan = planLesson([items[0]], items, { random: seededRandom(seed), canListen: true, match: false });
      const ex = plan[0];
      if (ex.kind === 'cloze') {
        expect(ex.before + ex.gap + ex.after).toBe(items[0].example!.text);
        expect(ex.options[ex.answer]).toBe('perro');
      }
      if (ex.kind === 'build') {
        expect(ex.answer).toEqual(['El', 'perro', 'duerme', 'en', 'casa']);
        expect(ex.tiles.length).toBeGreaterThanOrEqual(ex.answer.length);
      }
    }
    expect(sentenceTiles('¿Dónde está, Ana?')).toEqual(['Dónde', 'está', 'Ana']);
  });

  it('adds translations, listening sentences, articles and speaking when they can be made', () => {
    const kinds = new Set<string>();
    const gendered = { ...items[0], gender: 'm' };
    for (let seed = 1; seed < 120; seed++) {
      const [ex] = planLesson([gendered], items, {
        random: seededRandom(seed),
        canListen: true,
        match: false,
        canSpeak: true,
        articleOf: (i) => (i.gender === 'm' ? 'el' : null),
        articles: ['el', 'la'],
      });
      kinds.add(ex.kind);
      if (ex.kind === 'translate') {
        expect(ex.answer).toEqual(['The', 'dog', 'sleeps', 'at', 'home']);
        expect(ex.tiles.length).toBeGreaterThan(ex.answer.length);
      }
      if (ex.kind === 'listen-build') expect(ex.answer.join(' ')).toBe('El perro duerme en casa');
      if (ex.kind === 'article') expect(ex.options[ex.answer]).toBe('el');
    }
    for (const k of ['translate', 'listen-build', 'article', 'speak']) expect(kinds).toContain(k);
    // Without a microphone or an article, those never appear.
    const plain = planLesson(items, items, { random: seededRandom(5), canListen: false });
    expect(plain.some((e) => e.kind === 'speak' || e.kind === 'article')).toBe(false);
  });

  it('retries keep the right answer and grades follow mistakes', () => {
    const plan = planLesson([items[1]], items, { random: seededRandom(3), canListen: false, match: false });
    const first = plan[0];
    const again = retryOf(first, seededRandom(9), 1);
    if ('options' in first && 'options' in again) expect(again.options[again.answer]).toBe(first.options[first.answer]);
    expect(gradeFor(0, false)).toBe(3);
    expect(gradeFor(1, false)).toBe(2);
    expect(gradeFor(2, true)).toBe(1);
  });
});
