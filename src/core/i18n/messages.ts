import type { UiMessage } from './types';
import es from './es.json';
import fr from './fr.json';
import de from './de.json';
import ru from './ru.json';
import zh from './zh.json';
import ar from './ar.json';
export const UI_LANGUAGES = ['es', 'fr', 'de', 'ru', 'zh', 'ar'] as const;
const catalogues: Record<string, Record<string, string>> = { es, fr, de, ru, zh, ar };
export const uiLanguage = (lang: string): string => UI_LANGUAGES.includes(lang as typeof UI_LANGUAGES[number]) ? lang : 'en';
const brands = new Set(['Lingua', 'Lingua+', 'Max', 'Codex', 'Thesaurus', 'Cursus', 'Ludus', 'Sermo', 'Sonus', 'Visio', 'Cantus', 'Mundus', 'Mentis', 'Ordo', 'Ratio', 'Diarium', 'Grammatica', 'Atlas', 'Explora', 'Bibliotheca']);
export const message = (lang: string, source: string): string => brands.has(source.replace(/\{\d+\}/g, '').trim()) || !Object.hasOwn(catalogues, lang) || !Object.hasOwn(catalogues[lang], source) ? source : catalogues[lang][source];
const reverse = new Map<string, Map<string, string>>();
export function englishSource(lang: string, source: string): string {
  if (!Object.hasOwn(catalogues, lang) || Object.hasOwn(catalogues[lang], source)) return source;
  if (!reverse.has(lang)) reverse.set(lang, new Map(Object.entries(catalogues[lang]).map(([en, local]) => [local, en])));
  return reverse.get(lang)?.get(source) ?? source;
}
export const interpolate = (source: string, values: readonly unknown[] = []): string => source.replace(/\{(\d+)\}/g, (token, index: string) => Number(index) < values.length ? String(values[Number(index)] ?? '') : token);

export function formatUiMessage(locale: string, value: string | UiMessage): string {
  return typeof value === 'string' ? message(locale, value) : interpolate(message(locale, value.source), value.values?.map((part) => typeof part === 'string' ? part : formatUiMessage(locale, part)));
}
export function englishUiMessage(value: string | UiMessage): string {
  return typeof value === 'string' ? value : interpolate(value.source, value.values?.map(englishUiMessage));
}
