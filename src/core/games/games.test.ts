import { describe, expect, it } from 'vitest';
import { seededRandom } from '@/core/srs/ludus';
import { afterRound, clock } from './bests';
import { GAMES } from './defs';
import { guess, hideIn, hint, isShown, MAX_HINTS, MAX_MISTAKES, startHangman, starsOf } from './hangman';
import { alphabetFor, graphemes, hasLetters, letterKey, letterWord } from './letters';
import { dailySeed, isoWeek, weekKey, weekSeed } from './seeds';
import { canPlay, usable } from './source';

const hangman = GAMES[0];
const item = (term: string, meaning: string | undefined = 'x') => ({ term, meaning, synonyms: [], antonyms: [] });

describe('seeds', () => {
  it('the same language and day give the same puzzle, others do not', () => {
    expect(dailySeed('es', '2026-10-30')).toBe(dailySeed('es', '2026-10-30'));
    expect(dailySeed('es', '2026-10-30')).not.toBe(dailySeed('es', '2026-10-31'));
    expect(dailySeed('es', '2026-10-30')).not.toBe(dailySeed('fr', '2026-10-30'));
    expect(seededRandom(dailySeed('es', '2026-10-30'))()).toBe(seededRandom(dailySeed('es', '2026-10-30'))());
  });
  it('a week is the ISO week, the same all week and across a year end', () => {
    expect(isoWeek('2026-10-30')).toEqual({ year: 2026, week: 44 });
    expect(weekKey('2026-10-26')).toBe(weekKey('2026-11-01'));
    expect(weekKey('2026-11-02')).not.toBe(weekKey('2026-11-01'));
    expect(weekKey('2021-01-03')).toBe('2020-W53');
    expect(weekKey('2024-12-30')).toBe('2025-W01');
    expect(weekSeed('de', '2026-10-27')).toBe(weekSeed('de', '2026-11-01'));
  });
});

describe('letters', () => {
  it('knows which scripts have letters', () => {
    for (const l of ['es', 'ru', 'el', 'ar']) expect(hasLetters(l)).toBe(true);
    for (const l of ['ja', 'zh', 'th']) expect(hasLetters(l)).toBe(false);
  });
  it('keeps a letter with its accent as one mark', () => {
    expect(graphemes('cañón', 'es')).toEqual(['c', 'a', 'ñ', 'ó', 'n']);
    expect(graphemes('éa', 'fr')).toEqual(['é', 'a']);
  });
  it('folds case, and accents only when they may be plain', () => {
    expect(letterKey('É', { lang: 'fr' })).toBe('e');
    expect(letterKey('É', { lang: 'fr', exact: true })).toBe('é');
    expect(letterKey('Й', { lang: 'ru' })).toBe('й');
    expect(letterKey('İ', { lang: 'tr', exact: true })).toBe('i');
    expect(letterKey('ς', { lang: 'el' })).toBe('σ');
    expect(letterKey('-', { lang: 'es' })).toBeNull();
  });
  it('plays words of 3 to 14 letters, with joiners free, and nothing with digits', () => {
    expect(letterWord('ab', { lang: 'es' })).toBeNull();
    expect(letterWord('abcdefghijklmno', { lang: 'es' })).toBeNull();
    expect(letterWord('año 2', { lang: 'es' })).toBeNull();
    expect(letterWord('sacacorchos', { lang: 'es' })?.keys.filter((k) => k !== null)).toHaveLength(11);
    const w = letterWord("aujourd'hui", { lang: 'fr' })!;
    expect(w.keys[w.marks.indexOf("'")]).toBeNull();
  });
  it('gives a keyboard that can solve every word', () => {
    const w = letterWord('niño', { lang: 'es', exact: true })!;
    const keys = alphabetFor('es', w.keys);
    expect(keys.slice(0, 26).join('')).toBe('abcdefghijklmnopqrstuvwxyz');
    expect(keys).toContain('ñ');
    expect(alphabetFor('ru', []).length).toBe(33);
    expect(alphabetFor('el', [])).toHaveLength(24);
  });
});

describe('hangman', () => {
  const start = (term: string) => startHangman(term, { lang: 'es' })!;

  it('shows what is guessed and the joiners, and wins when nothing is hidden', () => {
    let s = start('so-so');
    expect(s.marks.map((_, i) => isShown(s, i))).toEqual([false, false, true, false, false]);
    s = guess(guess(s, 's'), 'o');
    expect(s.status).toBe('won');
    expect(starsOf(s)).toBe(3);
  });
  it('counts a wrong letter once, ignores repeats, and loses after the sixth', () => {
    let s = start('gato');
    s = guess(guess(s, 'z'), 'z');
    expect(s.wrong).toEqual(['z']);
    for (const k of ['q', 'w', 'x', 'y', 'v']) s = guess(s, k);
    expect(s.status).toBe('lost');
    expect(s.wrong).toHaveLength(MAX_MISTAKES);
    expect(guess(s, 'g')).toBe(s);
    expect(starsOf(s)).toBe(0);
    expect(s.marks.every((_, i) => isShown(s, i))).toBe(true);
  });
  it('plain letters fill accented ones unless accents count', () => {
    expect(guess(start('canción'), 'o').guessed).toEqual(['o']);
    const exact = startHangman('canción', { lang: 'es', exact: true })!;
    expect(guess(exact, 'o').wrong).toEqual(['o']);
    expect(guess(exact, 'ó').guessed).toEqual(['ó']);
  });
  it('a hint shows a hidden letter, costs a star, and runs out', () => {
    const random = seededRandom(1);
    let s = start('gato');
    s = hint(s, random);
    expect(s.guessed).toHaveLength(1);
    expect(s.hints).toBe(1);
    s = hint(s, random);
    expect(hint(s, random)).toBe(s);
    expect(s.hints).toBe(MAX_HINTS);
    s = guess(guess(s, 'g'), 'a');
    s = guess(guess(s, 't'), 'o');
    expect(s.status).toBe('won');
    expect(starsOf(s)).toBe(1);
  });
  it('hinting the last letters can win the word', () => {
    let s = guess(guess(start('gato'), 'g'), 'a');
    s = guess(s, 't');
    s = hint(s, seededRandom(2));
    expect(s.status).toBe('won');
  });
  it('hides the word in its sentence', () => {
    expect(hideIn('Me gusta el Gato negro.', 'gato', 'es')).toBe('Me gusta el ____ negro.');
    expect(hideIn('Me gusta el perro.', 'gato', 'es')).toBeNull();
  });
});

describe('what a game is dealt', () => {
  const five = ['gato', 'perro', 'casa', 'libro', 'mesa'].map((t) => item(t));
  it('needs enough words with a meaning, and says what is missing', () => {
    expect(canPlay(hangman, five, 'es')).toEqual({ ok: true });
    const few = canPlay(hangman, [...five.slice(0, 3), { ...item('sol'), meaning: undefined }, item('ab')], 'es');
    expect(few.ok).toBe(false);
    expect(few.ok === false && few.reason).toMatch(/Needs 5 .*you have 3/);
    expect(usable(hangman, five, 'es')).toHaveLength(5);
  });
  it('is not offered where there are no letters', () => {
    const r = canPlay(hangman, five, 'ja');
    expect(r.ok === false && r.reason).toMatch(/letters/);
  });
});

describe('bests', () => {
  const round = (stars: number, ms: number) => ({ stars, of: 15, ms, at: 1 });
  it('the first round is the best, but not a beaten one', () => {
    const first = afterRound(undefined, round(10, 60_000));
    expect(first.beat).toBe(false);
    expect(first.best).toMatchObject({ plays: 1, stars: 10, ms: 60_000 });
  });
  it('more stars, or the same stars faster, beats it; slower or fewer does not', () => {
    const old = afterRound(undefined, round(10, 60_000)).best;
    expect(afterRound(old, round(12, 90_000)).beat).toBe(true);
    expect(afterRound(old, round(10, 50_000)).beat).toBe(true);
    const slower = afterRound(old, round(10, 70_000));
    expect(slower.beat).toBe(false);
    expect(slower.best).toMatchObject({ plays: 2, stars: 10, ms: 60_000 });
    expect(afterRound(old, round(8, 10_000)).beat).toBe(false);
  });
  it('a round of no stars is never a best to beat', () => {
    const old = afterRound(undefined, round(0, 10_000)).best;
    expect(afterRound(old, round(0, 5_000)).beat).toBe(false);
  });
  it('writes a clock', () => {
    expect(clock(65_400)).toBe('1:05');
    expect(clock(42_000)).toBe('0:42');
  });
});
