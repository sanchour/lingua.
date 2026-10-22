import { describe, expect, it } from 'vitest';
import { seededRandom } from '@/core/grammar/drills';
import { loadGrammar } from '@/core/grammar/load';
import { findTopic, splitFocus } from '@/core/grammar/types';
import { COURSE_LANGS, loadCourse } from './load';
import { planCourseLesson, unitLessons } from './lessons';
import { OUTLINE, UNIT_IDS } from './outline';

describe('the course outline', () => {
  it('has twelve units, A1 to B1, each with what you can do after it', () => {
    expect(OUTLINE.map((u) => u.id)).toEqual([...UNIT_IDS]);
    expect(OUTLINE.map((u) => u.level).join(' ')).toBe('A1 A1 A1 A1 A1 A1 A2 A2 A2 A2 B1 B1');
    for (const u of OUTLINE) expect(u.canDo.length).toBeGreaterThanOrEqual(3);
  });
});

describe.each(COURSE_LANGS)('the %s course', (lang) => {
  it('fills every unit: words, phrases with one bracketed word and three wrong ones, grammar that exists, a model answer', async () => {
    const course = (await loadCourse(lang))!;
    const grammar = await loadGrammar(lang);
    expect(Object.keys(course.units).sort()).toEqual([...UNIT_IDS].sort());
    for (const id of UNIT_IDS) {
      const unit = course.units[id];
      const where = `${lang} ${id}`;
      expect(unit.words.length, where).toBeGreaterThanOrEqual(8);
      expect(new Set(unit.words.map(([t]) => t)).size, `${where}: words repeat`).toBe(unit.words.length);
      for (const [term, meaning] of unit.words) expect(term && meaning, `${where}: ${term}`).toBeTruthy();
      if (lang === 'zh') for (const w of unit.words) expect(w[2], `${where}: pinyin for ${w[0]}`).toBeTruthy();
      expect(unit.phrases.length, where).toBeGreaterThanOrEqual(8);
      for (const p of unit.phrases) {
        const { focus } = splitFocus(p.s);
        expect(p.s.match(/\[/g)?.length, `${where}: ${p.s}`).toBe(1);
        expect(focus, `${where}: ${p.s}`).toBeTruthy();
        expect(new Set(p.wrong).size, `${where}: ${p.s}`).toBe(3);
        expect(p.wrong, `${where}: ${p.s}`).not.toContain(focus);
        expect(p.en, `${where}: ${p.s}`).toBeTruthy();
        if (lang === 'zh') expect(p.reading, `${where}: pinyin for ${p.s}`).toBeTruthy();
      }
      for (const t of unit.grammar) expect(grammar && findTopic(grammar, t), `${where}: Grammatica has no topic "${t}"`).toBeTruthy();
      expect(unit.model.length, where).toBeGreaterThan(40);
    }
  });

  it('makes every drilled lesson of every unit', async () => {
    const course = (await loadCourse(lang))!;
    const grammar = await loadGrammar(lang);
    for (const outline of OUTLINE) {
      const content = course.units[outline.id];
      for (const lesson of unitLessons(content, grammar)) {
        const plan = planCourseLesson(lesson, outline, content, grammar, lang, { random: seededRandom(7), canHear: true, typing: true, size: 10 });
        if (lesson === 'speak' || lesson === 'write') expect(plan).toBeNull();
        else expect(plan?.drills.length, `${lang} ${outline.id} ${lesson}`).toBeGreaterThanOrEqual(8);
      }
    }
  });
});

describe('a unit’s lessons', () => {
  it('start with words in pairs, keep the phrases whole, and mix the check', async () => {
    const course = (await loadCourse('es'))!;
    const grammar = await loadGrammar('es');
    const hello = OUTLINE[0];
    const opts = { random: seededRandom(3), canHear: true, typing: true, size: 10 };
    const words = planCourseLesson('words', hello, course.units.hello, grammar, 'es', opts)!;
    expect(words.drills[0].kind).toBe('pairs');
    expect(words.intro?.items).toHaveLength(course.units.hello.words.length);
    const phrases = planCourseLesson('phrases', hello, course.units.hello, grammar, 'es', opts)!;
    expect(new Set(phrases.drills.map((d) => d.kind)).size).toBeGreaterThanOrEqual(3);
    const check = planCourseLesson('check', hello, course.units.hello, grammar, 'es', opts)!;
    expect(check.drills).toHaveLength(12);
    expect(check.drills.some((d) => d.kind === 'recognise' || d.kind === 'hear')).toBe(false);
  });
});
