import type { Picks } from './types';

// Each language's picks are a small module of their own, loaded when Mundus opens in that language.
const MODULES = import.meta.glob<{ default: Picks }>('./picks/*.ts');

const pathOf = (lang: string) => `./picks/${lang}.ts`;

/** Languages with hand-picked recommendations (the twenty main ones). */
export const hasPicks = (lang: string) => pathOf(lang) in MODULES;

export async function loadPicks(lang: string): Promise<Picks | null> {
  const load = MODULES[pathOf(lang)];
  return load ? (await load()).default : null;
}
