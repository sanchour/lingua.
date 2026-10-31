// Pure dictionary search tools (6-22):
// - Reverse dictionary / search by meaning or definition (F1247, F1275, F1276)
// - Spelling mistake & fuzzy search via Damerau-Levenshtein distance on accent-free keys (F1248, F1249)
// - Rhyme & similar-sound search using IPA / phonetic tails and syllables (F1277, F1278)
// - Prefix & suffix search (F1279)
// - Part-of-speech filter (F1280)
import type { FullDictRow } from './format';

export type DictSearchMode = 'word' | 'meaning' | 'fuzzy' | 'prefix' | 'suffix' | 'rhyme' | 'sound';

export interface DictSearchOptions {
  mode: DictSearchMode;
  pos?: string;
  limit?: number;
}

export interface ScoredDictRow {
  row: FullDictRow;
  score: number;
  reason?: string;
}

// ── Accent folding & tokenization ───────────────────────────────────────────

export function stripAccents(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'to', 'of', 'in', 'on', 'for', 'with', 'at', 'by', 'from', 'or', 'and', 'as', 'be', 'is', 'are', 'that', 'which', 'one', 'someone', 'something',
]);

export function tokenizeMeaning(text: string): string[] {
  return stripAccents(text)
    .split(/[^a-z0-9\p{L}]+/u)
    .filter((w) => w.length >= 2 && !STOP_WORDS.has(w));
}

// ── Damerau-Levenshtein edit distance (F1248, F1249) ────────────────────────

export function editDistance(a: string, b: string, maxDist = 3): number {
  if (a === b) return 0;
  const la = a.length;
  const lb = b.length;
  if (Math.abs(la - lb) > maxDist) return maxDist + 1;
  if (la === 0) return lb;
  if (lb === 0) return la;

  const dp: number[][] = Array.from({ length: la + 1 }, () => Array<number>(lb + 1).fill(0));
  for (let i = 0; i <= la; i++) dp[i][0] = i;
  for (let j = 0; j <= lb; j++) dp[0][j] = j;

  for (let i = 1; i <= la; i++) {
    let rowMin = maxDist + 1;
    for (let j = 1; j <= lb; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let val = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost,
      );
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        val = Math.min(val, dp[i - 2][j - 2] + 1);
      }
      dp[i][j] = val;
      if (val < rowMin) rowMin = val;
    }
    if (rowMin > maxDist) return maxDist + 1;
  }

  return dp[la][lb];
}

// ── Phonetic & rhyme keys (F1277, F1278) ────────────────────────────────────

function cleanIpa(ipa: string): string {
  return ipa
    .replace(/^[/[\s]+|[/\]\s]+$/g, '')
    .replace(/[ˈˌ.ːˑ()]/g, '')
    .trim();
}

/** Extracts the rhyming tail from the last vowel cluster onward (IPA if available, else folded word). */
export function rhymeTail(row: FullDictRow): string {
  const ipaRaw = row.entries.flatMap((e) => e.ipa ?? [])[0];
  const base = ipaRaw ? cleanIpa(ipaRaw) : row.fold || stripAccents(row.word);
  if (!base) return '';
  // Find last vowel or IPA vowel nucleus
  const m = /[aeiouáéíóúäöüɑɛɪɔʊəɐɜiːuːyøœãõẽũ]+[^aeiouáéíóúäöüɑɛɪɔʊəɐɜ]*$/i.exec(base);
  if (m && m[0].length >= 2) return m[0].toLowerCase();
  return base.slice(-Math.min(3, base.length)).toLowerCase();
}

/** Coarse phonetic skeleton so similar-sounding words match (c/k/qu -> k, s/z/c -> s, b/v -> b, etc.). */
export function phoneticKey(text: string): string {
  return stripAccents(text)
    .replace(/^h/, '')
    .replace(/qu/g, 'k')
    .replace(/ch/g, 'x')
    .replace(/ll|y/g, 'j')
    .replace(/[ckq]/g, 'k')
    .replace(/[sz]/g, 's')
    .replace(/[bv]/g, 'b')
    .replace(/ph/g, 'f')
    .replace(/(.)\1+/g, '$1');
}

// ── Part-of-speech matching (F1280) ─────────────────────────────────────────

export function matchesPos(row: FullDictRow, posFilter?: string): boolean {
  if (!posFilter || posFilter === 'all') return true;
  const target = posFilter.toLowerCase();
  return row.entries.some((e) => e.pos.toLowerCase() === target);
}

const definitions = new WeakMap<FullDictRow, { raw: string[]; folded: string[]; tokens: Set<string>; tokenList: string[] }>();
function meaningIndex(row: FullDictRow) {
  let index = definitions.get(row);
  if (!index) {
    const raw = [...row.entries.flatMap((e) => e.senses.flatMap((s) => s.g)), ...(row.mono ?? []).flatMap((m) => m.defs)];
    const tokens = new Set(tokenizeMeaning(raw.join(' ; ')));
    index = { raw, folded: raw.map(stripAccents), tokens, tokenList: [...tokens] };
    definitions.set(row, index);
  }
  return index;
}

/** Prepare once per dictionary snapshot, in the search worker. */
export function prepareDictionarySearch(rows: FullDictRow[]): void { for (const row of rows) meaningIndex(row); }

// ── Main pure search across a dictionary slice ──────────────────────────────

export function searchDictionaryRows(
  rows: FullDictRow[],
  rawQuery: string,
  options: DictSearchOptions,
): ScoredDictRow[] {
  const qRaw = rawQuery.trim();
  const qFold = stripAccents(qRaw);
  const limit = options.limit ?? 24;
  if (!qFold && (!options.pos || options.pos === 'all')) return [];

  const out: ScoredDictRow[] = [];

  // If no query text is given, filter by POS only (sorted by frequency rank).
  if (!qFold) {
    for (const row of rows) {
      if (row.key === '#version') continue;
      if (!matchesPos(row, options.pos)) continue;
      out.push({ row, score: 1000 - Math.min(999, (row.rank ?? 50000) / 100), reason: options.pos });
    }
    return out.sort((a, b) => b.score - a.score || (a.row.rank ?? 1e9) - (b.row.rank ?? 1e9)).slice(0, limit);
  }

  const queryTokens = options.mode === 'meaning' ? tokenizeMeaning(qRaw) : [];
  const meaningPattern = options.mode === 'meaning' ? new RegExp(`(?:^|[^a-z])${qFold.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:$|[^a-z])`) : undefined;
  const targetRhyme =
    options.mode === 'rhyme'
      ? (() => {
          const exactRow = rows.find((r) => r.fold === qFold || stripAccents(r.word) === qFold);
          return exactRow ? rhymeTail(exactRow) : qFold.slice(-Math.min(3, qFold.length));
        })()
      : '';
  const targetSound = options.mode === 'sound' ? phoneticKey(qRaw) : '';

  for (const row of rows) {
    if (row.key === '#version') continue;
    if (!matchesPos(row, options.pos)) continue;

    const fold = row.fold || stripAccents(row.word);
    const freqBonus = Math.max(0, 1 - (row.rank ?? 50000) / 100000);

    switch (options.mode) {
      case 'word': {
        if (fold === qFold) {
          out.push({ row, score: 100 + freqBonus, reason: 'exact match' });
        } else if (fold.startsWith(qFold)) {
          out.push({ row, score: 80 + freqBonus - (fold.length - qFold.length) * 0.5, reason: 'starts with' });
        } else if (fold.includes(qFold)) {
          out.push({ row, score: 50 + freqBonus, reason: 'contains' });
        } else {
          // Also check phrases inside entries (F1247)
          const phraseHit = row.entries.flatMap((e) => e.phrases ?? []).find(([p]) => stripAccents(p).includes(qFold));
          if (phraseHit) {
            out.push({ row, score: 45 + freqBonus, reason: `phrase: ${phraseHit[0]}` });
          }
        }
        break;
      }

      case 'meaning': {
        // Reverse dictionary / search by concept or definition (F1247, F1275, F1276)
        const index = meaningIndex(row);
        const allDefs = index.raw;
        if (!allDefs.length) break;
        let bestScore = 0;
        let matchedDef = '';

        // Direct substring match in a gloss
        for (let i = 0; i < allDefs.length; i++) {
          const g = allDefs[i];
          const gClean = index.folded[i];
          if (gClean === qFold) {
            bestScore = Math.max(bestScore, 100);
            matchedDef = g;
          } else if (meaningPattern!.test(gClean)) {
            if (85 > bestScore) {
              bestScore = 85;
              matchedDef = g;
            }
          }
        }

        // Concept token overlap
        if (queryTokens.length > 0) {
          const defTokens = index.tokens;
          let hits = 0;
          for (const qt of queryTokens) {
            if (defTokens.has(qt) || index.tokenList.some((dt) => dt.startsWith(qt) || qt.startsWith(dt))) {
              hits++;
            }
          }
          if (hits > 0) {
            const ratio = hits / queryTokens.length;
            const conceptScore = Math.round(ratio * 75) + hits * 5;
            if (conceptScore > bestScore) {
              bestScore = conceptScore;
              matchedDef = allDefs[0] ?? '';
            }
          }
        }

        if (bestScore > 0) {
          out.push({ row, score: bestScore + freqBonus, reason: matchedDef });
        }
        break;
      }

      case 'fuzzy': {
        // Spelling mistake / typo-tolerant search (F1248, F1249)
        const maxDist = qFold.length <= 4 ? 1 : 2;
        const dist = editDistance(fold, qFold, maxDist);
        if (dist <= maxDist) {
          out.push({
            row,
            score: (maxDist + 1 - dist) * 30 + freqBonus,
            reason: dist === 0 ? 'exact' : `${dist} letter${dist === 1 ? '' : 's'} off`,
          });
        } else if (fold.startsWith(qFold.slice(0, Math.max(2, qFold.length - 1)))) {
          out.push({ row, score: 15 + freqBonus, reason: 'similar start' });
        }
        break;
      }

      case 'prefix': {
        // Prefix search (F1279): headword starts with query, or has matching `parts` prefix
        const cleanPrefix = qFold.replace(/-$/, '');
        const hasPartPrefix = row.entries.some((e) => (e.parts ?? []).some((p) => stripAccents(p.replace(/-$/, '')) === cleanPrefix));
        if (hasPartPrefix) {
          out.push({ row, score: 95 + freqBonus, reason: `prefix ${cleanPrefix}-` });
        } else if (fold.startsWith(cleanPrefix) && fold.length > cleanPrefix.length) {
          out.push({ row, score: 75 + freqBonus, reason: `starts with ${cleanPrefix}-` });
        }
        break;
      }

      case 'suffix': {
        // Suffix search (F1279): headword ends with query, or has matching `parts` suffix
        const cleanSuffix = qFold.replace(/^-/, '');
        const hasPartSuffix = row.entries.some((e) => (e.parts ?? []).some((p) => stripAccents(p.replace(/^-/, '')) === cleanSuffix));
        if (hasPartSuffix) {
          out.push({ row, score: 95 + freqBonus, reason: `suffix -${cleanSuffix}` });
        } else if (fold.endsWith(cleanSuffix) && fold.length > cleanSuffix.length) {
          out.push({ row, score: 75 + freqBonus, reason: `ends with -${cleanSuffix}` });
        }
        break;
      }

      case 'rhyme': {
        // Rhyme search (F1277)
        if (fold === qFold) break;
        const tail = rhymeTail(row);
        if (tail && targetRhyme && tail === targetRhyme) {
          out.push({ row, score: 90 + freqBonus, reason: `rhymes (-${tail})` });
        } else if (fold.length >= 3 && qFold.length >= 3 && fold.slice(-3) === qFold.slice(-3)) {
          out.push({ row, score: 70 + freqBonus, reason: `ending -${fold.slice(-3)}` });
        }
        break;
      }

      case 'sound': {
        // Similar sounds / homophones (F1278)
        const homophones = row.entries.flatMap((e) => e.hom ?? []).map(stripAccents);
        if (homophones.includes(qFold)) {
          out.push({ row, score: 100 + freqBonus, reason: 'homophone' });
          break;
        }
        const pKey = phoneticKey(fold);
        if (pKey && targetSound) {
          if (pKey === targetSound) {
            out.push({ row, score: 90 + freqBonus, reason: 'sounds alike' });
          } else {
            const dist = editDistance(pKey, targetSound, 1);
            if (dist <= 1) {
              out.push({ row, score: 65 + freqBonus, reason: 'similar sound' });
            }
          }
        }
        break;
      }
    }
  }

  return out
    .sort((a, b) => b.score - a.score || (a.row.rank ?? 1e9) - (b.row.rank ?? 1e9) || a.row.word.length - b.row.word.length)
    .slice(0, limit);
}
