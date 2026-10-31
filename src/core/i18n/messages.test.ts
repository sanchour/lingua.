import { describe, expect, it } from 'vitest';
import { interpolate, message, UI_LANGUAGES, uiLanguage } from './messages';
import sources from './sources.json';
import es from './es.json';
import fr from './fr.json';
import de from './de.json';
import ru from './ru.json';
import zh from './zh.json';
import ar from './ar.json';
const catalogues: Record<string, Record<string, string>> = { es, fr, de, ru, zh, ar };
const placeholders = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort();
describe('bundled interface messages', () => {
  it('keeps values literal, reorders placeholders and falls back to English', () => {
    expect(interpolate('{1}: {0} / {0}', ['<script>$&</script>', 3])).toBe('3: <script>$&</script> / <script>$&</script>');
    expect(message('xx', 'My own text')).toBe('My own text');
    expect(message('__proto__', 'constructor')).toBe('constructor');
    expect(message('es', 'constructor')).toBe('constructor');
    expect(uiLanguage('it')).toBe('en');
    expect(uiLanguage('ar')).toBe('ar');
  });
  for (const lang of UI_LANGUAGES) it(`${lang} covers the catalogue and preserves every value slot`, () => {
    for (const source of Object.keys(sources)) {
      const translated = catalogues[lang][source];
      expect(translated, source).toBeTruthy();
      expect(placeholders(translated), source).toEqual(placeholders(source));
    }
  });
});
