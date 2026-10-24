// The themed lists of a language pack, picked from themes.ts' candidates. Shared by build.ts (a full
// build) and retheme.ts (new lists for the packs already built, 5.1-3b).
import type { PackThemeItem } from '../../src/core/packs/format.ts';

/** themes.ts output: [candidates as [word, gender tag, 0 · 1 regional · -1 hand-picked], meaning, pos] */
export type ThemeCandidates = [Array<[string, string, number]>, string, string];

export interface ThemeDictionary {
  /** Whether the dictionary knows every word of the phrase. */
  known(phrase: string): boolean;
  /** The frequency rank of the phrase's rarest word (Infinity when unranked). */
  rankOf(phrase: string): number;
  /** The dictionary's gender for a one-word noun, if it has one. */
  nounGender(term: string): string | undefined;
  /** The pack's own spelling of a picked word (Mandarin: Simplified for a Traditional one). */
  respell?(term: string): string;
}

/**
 * Of the candidates take the first this dictionary knows; a rare first choice gives way to a common,
 * non-regional alternative (chuño → patata). Gender comes from the dictionary. A word two concepts
 * share (illness, disease → enfermedad) stays once.
 */
export function pickThemes(raw: Record<string, ThemeCandidates[]>, dict: ThemeDictionary): Record<string, PackThemeItem[]> {
  const pick = (candidates: ThemeCandidates[0]) => {
    if (candidates[0]?.[2] === -1) return candidates[0];
    const usable = candidates.filter(([w]) => dict.known(w));
    const list = usable.length ? usable : candidates;
    if (dict.rankOf(list[0][0]) > 20_000) {
      const better = list
        .slice(1)
        .filter((c) => c[2] === 0 && dict.rankOf(c[0]) <= 10_000)
        .sort((a, b) => dict.rankOf(a[0]) - dict.rankOf(b[0]))[0];
      if (better) return better;
    }
    return list[0];
  };
  return Object.fromEntries(
    Object.entries(raw).map(([theme, items]) => [
      theme,
      dedupe(
        items.map(([candidates, meaning, pos]): PackThemeItem => {
          const [picked, tagGender] = pick(candidates);
          const term = dict.respell?.(picked) ?? picked;
          return [term, meaning, pos, pos === 'noun' ? dict.nounGender(term) || tagGender : ''];
        }),
      ),
    ]),
  );
}

/** Each term once, in its first place. */
export function dedupe(items: PackThemeItem[]): PackThemeItem[] {
  const seen = new Set<string>();
  return items.filter(([term]) => {
    const key = term.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
