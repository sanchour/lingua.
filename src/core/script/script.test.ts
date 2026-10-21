import { describe, expect, it } from 'vitest';
import { seededRandom } from '@/core/srs/ludus';
import { planGroupLesson, planPractice, retryScriptDrill } from './drills';
import type { ScriptDrill } from './drills';
import { dilate, normalize, scoreInk } from './ink';
import type { Mask } from './ink';
import { lettersInWord, pinyinParts } from './letters';
import { romanizeAr, romanizeEl, romanizeKa, romanizeKana, romanizeKo, romanizeRu, ROMANIZE } from './romanize';
import { joinedForm, lettersOf } from './types';
import type { Script } from './types';
import ar from './alphabets/ar';
import el from './alphabets/el';
import ja from './alphabets/ja';
import ka from './alphabets/ka';
import ko from './alphabets/ko';
import ru from './alphabets/ru';
import zh from './alphabets/zh';

const SCRIPTS: Script[] = [ru, el, ar, ja, ko, zh, ka];

describe('romanization', () => {
  it('reads each script by its scheme', () => {
    expect(romanizeRu('здравствуйте')).toBe('zdravstvuyte');
    expect(romanizeRu('объём')).toBe('ob"yom');
    expect(romanizeEl('ευχαριστώ')).toBe('efcharisto');
    expect(romanizeEl('αύριο')).toBe('avrio');
    expect(romanizeEl('φεγγάρι')).toBe('fengari');
    expect(romanizeAr('كِتَاب')).toBe('kitāb');
    expect(romanizeAr('سَيَّارَة')).toBe('sayyāra');
    expect(romanizeAr('حَيَاة')).toBe('ḥayāh');
    expect(romanizeAr('عَلَى')).toBe('ʿalā');
    expect(romanizeKana('がっこう')).toBe('gakkou');
    expect(romanizeKana('しゃしん')).toBe('shashin');
    expect(romanizeKana('コーヒー')).toBe('kōhī');
    expect(romanizeKana('パーティー')).toBe('pātī');
    expect(romanizeKana('ほんや')).toBe("hon'ya");
    expect(romanizeKo('사랑')).toBe('sarang');
    expect(romanizeKo('도시')).toBe('dosi');
    expect(romanizeKa('წყალი')).toBe("ts'q'ali");
    expect(romanizeKa('ქალაქი')).toBe('kalaki');
  });

  it('refuses what it can’t read letter by letter', () => {
    expect(romanizeKo('김치')).toBeNull(); // a final consonant before another syllable
    expect(romanizeAr('كتاب')).toBeNull(); // no vowel marks
    expect(romanizeKana('猫')).toBeNull();
  });

  it('splits pinyin into its parts', () => {
    expect(pinyinParts('zhōng')).toEqual({
      initial: 'zh',
      final: 'ong',
      tone: 1,
    });
    expect(pinyinParts('xué')).toEqual({ initial: 'x', final: 'üe', tone: 2 });
    expect(pinyinParts('yǒu')).toEqual({ initial: '', final: 'iu', tone: 3 });
    expect(pinyinParts('ma')).toEqual({ initial: 'm', final: 'a', tone: 0 });
  });

  it('joins Arabic letters with zero-width joiners, and not after the ones that never join', () => {
    expect(joinedForm('ب', 'initial')).toBe('ب‍');
    expect(joinedForm('د', 'initial')).toBe('د');
    expect(joinedForm('د', 'medial')).toBe('‍د');
  });
});

describe('alphabets', () => {
  for (const script of SCRIPTS) {
    describe(script.lang, () => {
      const letters = lettersOf(script);
      const ids = new Set(letters.map((l) => l.id));

      it('has unique letters, each with a sound', () => {
        expect(ids.size).toBe(letters.length);
        for (const l of letters) {
          expect(l.latin, l.id).toBeTruthy();
          expect(l.sound.length, l.id).toBeGreaterThan(2);
        }
        expect(new Set(script.groups.map((g) => g.id)).size).toBe(script.groups.length);
      });

      it('shows words that really contain their letter, read as the scheme reads them', () => {
        for (const l of letters)
          for (const w of l.words) {
            expect(lettersInWord(script.lang, w.w, w.latin), `${l.id} in ${w.w}`).toContain(l.id);
            if (script.lang !== 'zh') expect(ROMANIZE[script.lang](w.w), w.w).toBe(w.latin);
            expect(w.en.trim(), w.w).toBeTruthy();
          }
        // Nearly every letter has a word (Japanese を and the rare ぢ, づ don't).
        expect(letters.filter((l) => l.words.length).length / letters.length).toBeGreaterThan(0.9);
      });

      it('reads only words made of letters learned by then', () => {
        if (script.lang === 'zh') return;
        const learned = new Set<string>();
        for (const g of script.groups) {
          for (const l of g.letters) learned.add(l.id);
          for (const w of g.reading ?? []) for (const x of lettersInWord(script.lang, w.w, w.latin)) expect(learned.has(x), `${g.id}: ${w.w} uses ${x}`).toBe(true);
        }
      });

      it('plans a lesson for every group, and practice', () => {
        for (const g of script.groups) {
          for (const writing of [true, false]) {
            const plan = planGroupLesson(script, g, {
              random: seededRandom(3),
              canHear: true,
              writing,
            });
            expect(plan.filter((d) => d.kind === 'meet')).toHaveLength(g.letters.length);
            expect(new Set(plan.map((d) => d.key)).size).toBe(plan.length);
            expect(plan.some((d) => d.kind === 'trace' || d.kind === 'write')).toBe(Boolean(g.writable && writing));
            for (const d of plan) {
              check(d);
              check(retryScriptDrill(d, seededRandom(2), 1));
            }
          }
        }
        const practice = planPractice(script, letters.slice(0, 12), {
          random: seededRandom(5),
        });
        expect(practice.length).toBeGreaterThanOrEqual(10);
        practice.forEach(check);
      });
    });
  }
});

function check(d: ScriptDrill) {
  if ('options' in d) {
    expect(d.answer, d.key).toBeGreaterThanOrEqual(0);
    expect(new Set(d.options).size, `${d.key}: ${d.options.join(' / ')}`).toBe(d.options.length);
    expect(d.options.length, d.key).toBeGreaterThanOrEqual(2);
  }
  if (d.kind === 'pairs') {
    expect(d.pairs.length).toBeGreaterThanOrEqual(2);
    expect(new Set(d.pairs.map((p) => p[0])).size).toBe(d.pairs.length);
  }
}

describe('ink', () => {
  const W = 60;
  /** A mask with a vertical bar and a horizontal bar: a T. */
  const draw = (fn: (x: number, y: number) => boolean, w = W, h = W): Mask => {
    const data = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) data[y * w + x] = fn(x, y) ? 1 : 0;
    return { w, h, data };
  };
  const tee = draw((x, y) => (y >= 10 && y <= 13 && x >= 10 && x <= 50) || (x >= 28 && x <= 31 && y >= 10 && y <= 50));

  it('passes a careful trace and fails a scribble or an empty pad', () => {
    const traced = draw((x, y) => (y >= 9 && y <= 14 && x >= 11 && x <= 49) || (x >= 27 && x <= 32 && y >= 12 && y <= 49));
    expect(scoreInk(tee, traced, 'trace', 3).pass).toBe(true);
    const scribble = draw((x, y) => (x + y) % 9 === 0);
    expect(scoreInk(tee, scribble, 'trace', 3).pass).toBe(false);
    expect(
      scoreInk(
        tee,
        draw(() => false),
        'trace',
        3,
      ).pass,
    ).toBe(false);
    // Only half the letter.
    expect(
      scoreInk(
        tee,
        draw((x, y) => y >= 9 && y <= 14 && x >= 11 && x <= 49),
        'trace',
        3,
      ).pass,
    ).toBe(false);
  });

  it('accepts a letter written smaller and elsewhere from memory, not another letter', () => {
    const small = draw((x, y) => (y >= 30 && y <= 31 && x >= 30 && x <= 50) || (x >= 39 && x <= 41 && y >= 30 && y <= 50));
    expect(scoreInk(tee, small, 'write', 3).pass).toBe(true);
    const ell = draw((x, y) => (x >= 10 && x <= 13 && y >= 10 && y <= 50) || (y >= 47 && y <= 50 && x >= 10 && x <= 50));
    expect(scoreInk(tee, ell, 'write', 3).pass).toBe(false);
  });

  it('dilates and normalizes', () => {
    const dot = draw((x, y) => x === 30 && y === 30);
    expect(dilate(dot, 2).data.reduce((n, v) => n + v, 0)).toBe(25);
    const n = normalize(tee, 30);
    expect(n.w).toBe(30);
    expect(n.data.reduce((a, v) => a + v, 0)).toBeGreaterThan(20);
  });
});
