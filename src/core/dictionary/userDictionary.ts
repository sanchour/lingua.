import type { FullDictRow, FullEntry } from './format';
import { normalizeWord } from '@/core/text/normalize';
import { db } from '@/data/db';
import type { DictEntry, FrequencyRow, Word } from '@/data/types';

const uid = () => crypto.randomUUID();

export interface CustomDictEntry {
  id: string;
  lang: string;
  word: string;
  key: string;
  pos: string;
  gender?: 'm' | 'f' | 'n' | 'mf';
  ipa?: string;
  definitions: string[];
  examples: Array<[string, string]>;
  etymology?: string;
  sourceLabel?: string;
  createdAt: number;
  updatedAt: number;
}

export type DictIssueKind = 'definition' | 'example' | 'pronunciation' | 'forms' | 'other';

export interface DictIssueReport {
  id: string;
  lang: string;
  word: string;
  key: string;
  issueKind: DictIssueKind;
  detail: string;
  correctedGloss?: string;
  correctedExample?: string;
  createdAt: number;
}

export interface DictSourceCard {
  id: 'bilingual' | 'monolingual' | 'pack' | 'personal';
  title: string;
  subtitle: string;
  posList: string[];
  definitions: string[];
  examples: string[];
}

const CUSTOM_DICT_KEY = (lang: string) => `customDict:${lang}`;
const DICT_REPORTS_KEY = (lang: string) => `dictReports:${lang}`;

/** Converts a CustomDictEntry into a FullEntry block and merges it with an existing FullDictRow if present. */
export function toFullDictRow(custom: CustomDictEntry, existing?: FullDictRow | null): FullDictRow {
  const key = custom.key || normalizeWord(custom.word, custom.lang);
  const customBlock: FullEntry = {
    pos: custom.pos || 'noun',
    head: custom.word,
    gender: custom.gender,
    ipa: custom.ipa ? [custom.ipa] : undefined,
    ety: custom.etymology,
    senses: custom.definitions.map((def, idx) => ({
      g: [def],
      tags: [custom.sourceLabel || 'Personal dictionary'],
      ex: idx === 0 && custom.examples.length > 0 ? custom.examples : undefined,
    })),
  };

  if (!existing) {
    return {
      lang: custom.lang,
      key,
      fold: key.normalize('NFD').replace(/[\u0300-\u036f]/g, ''),
      word: custom.word,
      entries: [customBlock],
    };
  }

  const filteredEntries = existing.entries.filter(
    (e) => !e.senses.some((s) => s.tags?.includes('Personal dictionary') || (custom.sourceLabel && s.tags?.includes(custom.sourceLabel))),
  );

  return {
    ...existing,
    entries: [customBlock, ...filteredEntries],
  };
}

/**
 * Parses a personal dictionary file in JSON, Markdown, TSV, or CSV format (F1287, F1482).
 */
export function parsePersonalDictionary(raw: string, lang: string, sourceLabel = 'Personal dictionary'): CustomDictEntry[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];
  const now = Date.now();

  // 1. JSON format
  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      const items: CustomDictEntry[] = [];
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (!item || typeof item !== 'object') continue;
          const rec = item as Record<string, unknown>;
          const word = String(rec.word ?? rec.term ?? rec.headword ?? '').trim();
          if (!word) continue;
          const rawDefs = rec.definitions ?? rec.defs ?? rec.meaning ?? rec.gloss;
          const definitions = Array.isArray(rawDefs)
            ? rawDefs.map((d) => String(d).trim()).filter(Boolean)
            : typeof rawDefs === 'string'
              ? rawDefs.split(/[;\n]+/).map((d) => d.trim()).filter(Boolean)
              : [];
          if (definitions.length === 0) continue;
          const rawEx = rec.examples ?? rec.example;
          const examples: Array<[string, string]> = Array.isArray(rawEx)
            ? rawEx
                .map((ex): [string, string] => {
                  if (Array.isArray(ex)) return [String(ex[0] ?? '').trim(), String(ex[1] ?? '').trim()];
                  if (ex && typeof ex === 'object') {
                    const exObj = ex as Record<string, unknown>;
                    return [String(exObj.text ?? exObj.sentence ?? '').trim(), String(exObj.translation ?? '').trim()];
                  }
                  return [String(ex).trim(), ''];
                })
                .filter((pair) => pair[0].length > 0)
            : typeof rawEx === 'string' && rawEx.trim()
              ? [[rawEx.trim(), '']]
              : [];
          const key = normalizeWord(word, lang);
          items.push({
            id: uid(),
            lang,
            word,
            key,
            pos: String(rec.pos ?? 'noun').trim() || 'noun',
            ipa: typeof rec.ipa === 'string' ? rec.ipa.trim() : undefined,
            etymology: typeof rec.etymology === 'string' ? rec.etymology.trim() : undefined,
            sourceLabel: typeof rec.source === 'string' ? rec.source.trim() : sourceLabel,
            definitions,
            examples,
            createdAt: now,
            updatedAt: now,
          });
        }
        return items;
      } else if (parsed && typeof parsed === 'object') {
        for (const [wordKey, val] of Object.entries(parsed as Record<string, unknown>)) {
          const word = wordKey.trim();
          if (!word) continue;
          const def = typeof val === 'string' ? val.trim() : '';
          if (!def) continue;
          items.push({
            id: uid(),
            lang,
            word,
            key: normalizeWord(word, lang),
            pos: 'noun',
            definitions: [def],
            examples: [],
            sourceLabel,
            createdAt: now,
            updatedAt: now,
          });
        }
        return items;
      }
    } catch {
      // Fall through to text parsers
    }
  }

  // 2. Markdown bullet list (`- **word** (pos): meaning`) or headings
  const lines = trimmed.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const mdBulletRegex = /^[-*]\s+\*\*([^*]+)\*\*(?:\s*\(([^)]+)\))?\s*[:—-]\s*(.+)$/;
  if (lines.some((l) => mdBulletRegex.test(l))) {
    const entries: CustomDictEntry[] = [];
    for (const line of lines) {
      const m = line.match(mdBulletRegex);
      if (!m) continue;
      const word = m[1].trim();
      const pos = (m[2] ?? 'noun').trim();
      const defs = m[3].split(';').map((d) => d.trim()).filter(Boolean);
      if (!word || defs.length === 0) continue;
      entries.push({
        id: uid(),
        lang,
        word,
        key: normalizeWord(word, lang),
        pos,
        definitions: defs,
        examples: [],
        sourceLabel,
        createdAt: now,
        updatedAt: now,
      });
    }
    if (entries.length > 0) return entries;
  }

  // 3. TSV / CSV lines (`word\tdefinition\tpos\texample` or `word,definition,pos,example`)
  const delimiter = lines[0]?.includes('\t') ? '\t' : ',';
  const entries: CustomDictEntry[] = [];
  for (let i = 0; i < lines.length; i++) {
    const cols = splitDelimitedRow(lines[i], delimiter);
    if (cols.length < 2) continue;
    const firstLower = cols[0].toLowerCase();
    if (i === 0 && (firstLower === 'word' || firstLower === 'term' || firstLower === 'headword')) continue;
    const word = cols[0].trim();
    const rawDef = cols[1].trim();
    if (!word || !rawDef) continue;
    const pos = cols[2]?.trim() || 'noun';
    const exText = cols[3]?.trim() || '';
    const exTrans = cols[4]?.trim() || '';
    entries.push({
      id: uid(),
      lang,
      word,
      key: normalizeWord(word, lang),
      pos,
      definitions: rawDef.split(';').map((d) => d.trim()).filter(Boolean),
      examples: exText ? [[exText, exTrans]] : [],
      sourceLabel,
      createdAt: now,
      updatedAt: now,
    });
  }
  return entries;
}

function splitDelimitedRow(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === delimiter && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

/**
 * Builds a side-by-side comparison of definitions across multiple dictionary sources (F1288, F1289).
 */
export function compareDictionarySources(params: {
  langName: string;
  fullRow?: FullDictRow | null;
  packEntry?: DictEntry | null;
  freqRow?: FrequencyRow | null;
  customEntries?: CustomDictEntry[];
  userWord?: Word | null;
  reports?: DictIssueReport[];
}): DictSourceCard[] {
  const { langName, fullRow, packEntry, freqRow, customEntries = [], userWord, reports = [] } = params;
  const cards: DictSourceCard[] = [];

  // 1. Bilingual Wiktionary (kaikki.org)
  if (fullRow && fullRow.entries.length > 0) {
    const wikiEntries = fullRow.entries.filter((e) => !e.senses.some((s) => s.tags?.includes('Personal dictionary')));
    if (wikiEntries.length > 0) {
      const posList = [...new Set(wikiEntries.map((e) => e.pos))];
      const definitions = wikiEntries.flatMap((e) => e.senses.map((s) => s.g.join('; '))).filter(Boolean).slice(0, 6);
      const examples = wikiEntries
        .flatMap((e) => e.senses.flatMap((s) => (s.ex ?? []).map(([t, tr]) => (tr ? `${t} — ${tr}` : t))))
        .slice(0, 3);
      cards.push({
        id: 'bilingual',
        title: 'English Wiktionary',
        subtitle: 'Bilingual senses & usage via kaikki.org',
        posList,
        definitions,
        examples,
      });
    }
  }

  // 2. Monolingual Wiktionary (in the target language itself)
  if (fullRow?.mono && fullRow.mono.length > 0) {
    const posList = [...new Set(fullRow.mono.map((m) => m.pos))];
    const definitions = fullRow.mono.flatMap((m) => m.defs).slice(0, 6);
    cards.push({
      id: 'monolingual',
      title: `${langName} Wiktionary`,
      subtitle: `Monolingual definitions written in ${langName}`,
      posList,
      definitions,
      examples: [],
    });
  }

  // 3. Language Pack & Core Frequency Dictionary
  const packDefs: string[] = [];
  const packPos: string[] = [];
  if (packEntry) {
    for (const s of packEntry.senses) {
      if (s.pos && !packPos.includes(s.pos)) packPos.push(s.pos);
      const g = s.glosses.join('; ');
      if (g && !packDefs.includes(g)) packDefs.push(g);
    }
  }
  if (freqRow?.gloss && !packDefs.includes(freqRow.gloss)) {
    packDefs.push(freqRow.gloss);
  }
  if (packDefs.length > 0) {
    cards.push({
      id: 'pack',
      title: 'Lingua Core Pack',
      subtitle: freqRow?.rank ? `Core reader dictionary · rank #${freqRow.rank.toLocaleString()}` : 'Core reader dictionary',
      posList: packPos,
      definitions: packDefs.slice(0, 6),
      examples: [],
    });
  }

  // 4. Personal & Custom Dictionary (custom entries + learner gloss + reported corrections)
  const personalDefs: string[] = [];
  const personalPos: string[] = [];
  const personalExamples: string[] = [];

  for (const ce of customEntries) {
    if (ce.pos && !personalPos.includes(ce.pos)) personalPos.push(ce.pos);
    for (const d of ce.definitions) {
      if (!personalDefs.includes(d)) personalDefs.push(d);
    }
    for (const [ex, tr] of ce.examples) {
      personalExamples.push(tr ? `${ex} — ${tr}` : ex);
    }
  }
  if (userWord?.gloss && !personalDefs.includes(userWord.gloss)) {
    personalDefs.push(userWord.gloss);
  }
  for (const rep of reports) {
    if (rep.correctedGloss && !personalDefs.includes(rep.correctedGloss)) {
      personalDefs.push(`${rep.correctedGloss} (corrected)`);
    }
    if (rep.correctedExample) {
      personalExamples.push(rep.correctedExample);
    }
  }

  if (personalDefs.length > 0 || userWord?.note) {
    cards.push({
      id: 'personal',
      title: 'Your Personal Dictionary',
      subtitle: customEntries[0]?.sourceLabel ?? 'Your custom definitions, glosses & notes',
      posList: personalPos,
      definitions: personalDefs.length > 0 ? personalDefs : [userWord?.note ?? ''],
      examples: personalExamples.slice(0, 3),
    });
  }

  return cards;
}

/** Reads all custom dictionary entries for a language from db.settings. */
export async function loadCustomEntries(lang: string): Promise<CustomDictEntry[]> {
  const row = await db.settings.get(CUSTOM_DICT_KEY(lang));
  return Array.isArray(row?.value) ? (row.value as CustomDictEntry[]) : [];
}

/** Saves or updates a custom dictionary entry and syncs it into db.fullDict so it is immediately searchable. */
export async function saveCustomEntry(
  input: Omit<CustomDictEntry, 'id' | 'key' | 'createdAt' | 'updatedAt'> & { id?: string },
): Promise<CustomDictEntry> {
  const now = Date.now();
  const key = normalizeWord(input.word, input.lang);
  const existingList = await loadCustomEntries(input.lang);
  const foundIdx = existingList.findIndex((e) => (input.id ? e.id === input.id : e.key === key));

  const entry: CustomDictEntry = {
    id: foundIdx >= 0 ? existingList[foundIdx].id : input.id ?? uid(),
    lang: input.lang,
    word: input.word.trim(),
    key,
    pos: input.pos.trim() || 'noun',
    gender: input.gender,
    ipa: input.ipa?.trim() || undefined,
    definitions: input.definitions.map((d) => d.trim()).filter(Boolean),
    examples: input.examples,
    etymology: input.etymology?.trim() || undefined,
    sourceLabel: input.sourceLabel?.trim() || 'Personal dictionary',
    createdAt: foundIdx >= 0 ? existingList[foundIdx].createdAt : now,
    updatedAt: now,
  };

  const nextList = foundIdx >= 0 ? existingList.map((e, i) => (i === foundIdx ? entry : e)) : [entry, ...existingList];
  await db.settings.put({ key: CUSTOM_DICT_KEY(input.lang), value: nextList, updatedAt: now });

  // Also merge into db.fullDict so the entry can be opened and found in DictionarySearch
  const currentFull = await db.fullDict.get([input.lang, key]);
  await db.fullDict.put(toFullDictRow(entry, currentFull));

  return entry;
}

/** Imports a batch of personal dictionary entries from a raw file string and indexes them in db.fullDict. */
export async function importPersonalDictionary(lang: string, raw: string, sourceLabel = 'Personal dictionary'): Promise<CustomDictEntry[]> {
  const parsed = parsePersonalDictionary(raw, lang, sourceLabel);
  if (parsed.length === 0) return [];

  const existingList = await loadCustomEntries(lang);
  const byKey = new Map(existingList.map((e) => [e.key, e]));
  for (const item of parsed) {
    byKey.set(item.key, item);
  }
  const merged = [...byKey.values()];
  await db.settings.put({ key: CUSTOM_DICT_KEY(lang), value: merged, updatedAt: Date.now() });

  const existingFull = await db.fullDict.bulkGet(parsed.map((p) => [lang, p.key] as [string, string]));
  const nextFull = parsed.map((p, idx) => toFullDictRow(p, existingFull[idx]));
  await db.fullDict.bulkPut(nextFull);

  return parsed;
}

/** Loads all learner-reported dictionary issues for a language. */
export async function loadIssueReports(lang: string): Promise<DictIssueReport[]> {
  const row = await db.settings.get(DICT_REPORTS_KEY(lang));
  return Array.isArray(row?.value) ? (row.value as DictIssueReport[]) : [];
}

/** Records an issue report for a dictionary entry and applies a local override if a corrected gloss is supplied (F1290). */
export async function submitIssueReport(
  input: Omit<DictIssueReport, 'id' | 'key' | 'createdAt'>,
): Promise<DictIssueReport> {
  const key = normalizeWord(input.word, input.lang);
  const report: DictIssueReport = {
    id: uid(),
    lang: input.lang,
    word: input.word.trim(),
    key,
    issueKind: input.issueKind,
    detail: input.detail.trim(),
    correctedGloss: input.correctedGloss?.trim() || undefined,
    correctedExample: input.correctedExample?.trim() || undefined,
    createdAt: Date.now(),
  };

  const existing = await loadIssueReports(input.lang);
  await db.settings.put({ key: DICT_REPORTS_KEY(input.lang), value: [report, ...existing], updatedAt: Date.now() });

  if (report.correctedGloss) {
    await saveCustomEntry({
      lang: input.lang,
      word: input.word,
      pos: 'correction',
      definitions: [report.correctedGloss],
      examples: report.correctedExample ? [[report.correctedExample, '']] : [],
      sourceLabel: 'Learner correction',
    });
  }

  return report;
}
