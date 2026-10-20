import type { Grammar } from './types';

// Each language's grammar is a module of its own, loaded when Grammatica opens in that language.
const MODULES = import.meta.glob<{ default: Grammar }>('./topics/*.ts');

const pathOf = (lang: string) => `./topics/${lang}.ts`;

/** Languages with a grammar written for them. */
export const hasGrammar = (lang: string) => pathOf(lang) in MODULES;

export const GRAMMAR_LANGS = Object.keys(MODULES).map((p) => p.slice('./topics/'.length, -'.ts'.length));

const cache = new Map<string, Promise<Grammar | null>>();

export function loadGrammar(lang: string): Promise<Grammar | null> {
  let hit = cache.get(lang);
  if (!hit) {
    const load = MODULES[pathOf(lang)];
    hit = load ? load().then((m) => m.default) : Promise.resolve(null);
    cache.set(lang, hit);
  }
  return hit;
}
