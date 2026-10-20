import type { Script } from './types';

// Each language's alphabet is a module of its own, loaded when its letters are opened.
const MODULES = import.meta.glob<{ default: Script }>('./alphabets/*.ts');

const pathOf = (lang: string) => `./alphabets/${lang}.ts`;

/** Languages with an alphabet of their own to learn. */
export const hasScript = (lang: string) => pathOf(lang) in MODULES;

export const SCRIPT_LANGS = Object.keys(MODULES).map((p) => p.slice('./alphabets/'.length, -'.ts'.length));

const cache = new Map<string, Promise<Script | null>>();

export function loadScript(lang: string): Promise<Script | null> {
  let hit = cache.get(lang);
  if (!hit) {
    const load = MODULES[pathOf(lang)];
    hit = load ? load().then((m) => m.default) : Promise.resolve(null);
    cache.set(lang, hit);
  }
  return hit;
}
