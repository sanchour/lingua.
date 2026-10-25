import { describe, expect, it } from 'vitest';
import { LANGUAGES } from '@/core/lang/languages';
import { FREE_COURSES, freeCourses } from './courses';

describe('free courses', () => {
  it('gives Spanish two podcast courses, Language Transfer, FSI’s audio to add, and LibriVox', () => {
    const es = freeCourses('es');
    expect(es.map((c) => [c.by, c.kind])).toEqual([
      ['Spanish Obsessed', 'feed'],
      ['Duolingo', 'feed'],
      ['Language Transfer', 'link'],
      ['Foreign Service Institute', 'files'],
      ['LibriVox', 'link'],
    ]);
    expect(es[0].feed).toMatch(/^https:\/\/feeds\.transistor\.fm\//);
    expect(es[3]).toMatchObject({ archive: 'Fsi-SpanishBasicCourse-Volume1', url: 'https://fsi-languages.yojik.eu/languages/FSI/fsi-spanish-index.html' });
    expect(es[4].url).toBe('https://librivox.org/search?primary_key=5&search_category=language&search_page=1&search_form=get_results');
  });

  it('finds Mandarin’s FSI course under its own name, as a link, without Language Transfer', () => {
    const courses = freeCourses('zh').filter((c) => c.kind !== 'feed');
    expect(courses.map((c) => c.by)).toEqual(['Foreign Service Institute', 'LibriVox']);
    expect(courses[0]).toMatchObject({ name: 'FSI Mandarin', kind: 'link', url: 'https://fsi-languages.yojik.eu/languages/FSI/fsi-chinese-mandarin.html' });
    expect(courses[1].url).toContain('primary_key=14&');
  });

  it('gives every feed and file course what it needs to be added', () => {
    for (const course of Object.values(FREE_COURSES).flat()) {
      if (course.kind === 'feed') expect(course.feed).toMatch(/^https:\/\//);
      if (course.kind === 'files') expect(course.archive).toBeTruthy();
      expect(course.level).toBeTruthy();
    }
  });

  it('maps the courses with other names to Lingua’s codes', () => {
    expect(freeCourses('nb')[0].url).toMatch(/fsi-norwegian\.html$/);
    expect(freeCourses('fa')[0].url).toMatch(/fsi-persian\.html$/);
    expect(freeCourses('sh')[0].url).toMatch(/fsi-serbo-croatian\.html$/);
    expect(freeCourses('yue')[0].url).toMatch(/fsi-cantonese\.html$/);
    expect(freeCourses('ar').map((c) => c.by)).toEqual(['ArabicPod101', 'Language Transfer', 'Foreign Service Institute', 'LibriVox']);
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
