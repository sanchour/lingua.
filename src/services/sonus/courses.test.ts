import { describe, expect, it } from 'vitest';
import { LANGUAGES } from '@/core/lang/languages';
import { FREE_COURSES, freeCourses } from './courses';

describe('free courses', () => {
  it('links Spanish to Language Transfer, the FSI courses and LibriVox', () => {
    expect(freeCourses('es')).toEqual([
      {
        name: 'Complete Spanish',
        by: 'Language Transfer',
        url: 'https://www.languagetransfer.org/complete-spanish',
        detail: 'Audio-only, thinking method: no memorising, builds sentences from the first lesson.',
      },
      {
        name: 'FSI Spanish',
        by: 'Foreign Service Institute',
        url: 'https://fsi-languages.yojik.eu/languages/FSI/fsi-spanish-index.html',
        detail: 'The US diplomats’ courses: drills with tapes and books, free and old-fashioned, but thorough.',
      },
      {
        name: 'Spanish audiobooks',
        by: 'LibriVox',
        url: 'https://librivox.org/search?primary_key=5&search_category=language&search_page=1&search_form=get_results',
        detail: expect.any(String),
      },
    ]);
  });

  it('finds Mandarin’s FSI course under its own name, without Language Transfer', () => {
    const courses = freeCourses('zh');
    expect(courses.map((c) => c.by)).toEqual(['Foreign Service Institute', 'LibriVox']);
    expect(courses[0]).toMatchObject({ name: 'FSI Mandarin', url: 'https://fsi-languages.yojik.eu/languages/FSI/fsi-chinese-mandarin.html' });
    expect(courses[1].url).toContain('primary_key=14&');
  });

  it('maps the courses with other names to Lingua’s codes', () => {
    expect(freeCourses('nb')[0].url).toMatch(/fsi-norwegian\.html$/);
    expect(freeCourses('fa')[0].url).toMatch(/fsi-persian\.html$/);
    expect(freeCourses('sh')[0].url).toMatch(/fsi-serbo-croatian\.html$/);
    expect(freeCourses('yue')[0].url).toMatch(/fsi-cantonese\.html$/);
    expect(freeCourses('ar').map((c) => c.by)).toEqual(['Language Transfer', 'Foreign Service Institute', 'LibriVox']);
  });

  it('gives an empty list for a language with none', () => {
    expect(freeCourses('ka')).toEqual([]);
    expect(freeCourses('xx')).toEqual([]);
    expect(FREE_COURSES.ka).toBeUndefined();
  });

  it('has only languages Lingua knows, with https addresses and curly apostrophes', () => {
    const codes = new Set(LANGUAGES.map((l) => l.code));
    for (const [lang, courses] of Object.entries(FREE_COURSES)) {
      expect(codes.has(lang)).toBe(true);
      for (const course of courses) {
        expect(course.url).toMatch(/^https:\/\//);
        expect(`${course.name} ${course.detail}`).not.toContain("'");
      }
    }
  });
});
