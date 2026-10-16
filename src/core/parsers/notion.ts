// Imports a languages table exported from Notion ("Export → Markdown & CSV"), with Dutch or English
// column names, into Tabula rows.
import type { CapabilityStatus, CefrLevel } from '@/data/types';
import { parseCsv } from './csv';

export interface ImportedCapability {
  /** Lingua code when known (e.g. 'es'), otherwise `x-<slug>`. */
  id: string;
  name: string;
  level: CefrLevel;
  status: CapabilityStatus;
  methods: string[];
  started?: string;
}

/** Language names in English and Dutch → codes (Lingua's own and common others). */
const NAMES: Record<string, string> = {
  english: 'en', engels: 'en',
  spanish: 'es', spaans: 'es', español: 'es',
  russian: 'ru', russisch: 'ru',
  portuguese: 'pt', portugees: 'pt', português: 'pt',
  french: 'fr', frans: 'fr', français: 'fr',
  greek: 'el', grieks: 'el',
  german: 'de', duits: 'de', deutsch: 'de',
  italian: 'it', italiaans: 'it', italiano: 'it',
  swedish: 'sv', zweeds: 'sv', svenska: 'sv',
  hungarian: 'hu', hongaars: 'hu', magyar: 'hu',
  dutch: 'nl', nederlands: 'nl',
  frisian: 'fy', fries: 'fy', frysk: 'fy',
  arabic: 'ar', arabisch: 'ar',
  chinese: 'zh', chinees: 'zh', mandarin: 'zh', mandarijn: 'zh',
  japanese: 'ja', japans: 'ja',
  korean: 'ko', koreaans: 'ko',
  turkish: 'tr', turks: 'tr',
  norwegian: 'no', noors: 'no',
  danish: 'da', deens: 'da',
  polish: 'pl', pools: 'pl',
  latin: 'la', latijn: 'la',
  swahili: 'sw',
  indonesian: 'id', indonesisch: 'id', bahasa: 'id',
};

/** The display name for a known code (English). */
export const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English', es: 'Spanish', ru: 'Russian', pt: 'Portuguese', fr: 'French', el: 'Greek', de: 'German', it: 'Italian', sv: 'Swedish', hu: 'Hungarian',
  nl: 'Dutch', fy: 'Frisian', ar: 'Arabic', zh: 'Chinese', ja: 'Japanese', ko: 'Korean', tr: 'Turkish', no: 'Norwegian', da: 'Danish', pl: 'Polish', la: 'Latin', sw: 'Swahili', id: 'Indonesian',
};

const STATUS: Record<string, CapabilityStatus> = {
  moedertaal: 'native', native: 'native', 'mother tongue': 'native',
  natuurlijk: 'natural', natural: 'natural',
  achtergrond: 'background', background: 'background',
  'aan het leren': 'learning', learning: 'learning',
  'niet begonnen': 'not-started', 'not started': 'not-started',
};

const METHODS: Record<string, string> = {
  natuurlijk: 'Natural', natural: 'Natural',
  school: 'School',
  internet: 'Internet',
  series: 'Series', 'tv-series': 'Series', "serie's": 'Series',
  zelfstudie: 'Self-study', 'self-study': 'Self-study', 'self study': 'Self-study',
};

const COLUMNS = {
  name: ['taal', 'language', 'name', 'naam'],
  level: ['cefr niveau', 'cefr level', 'cefr', 'level', 'niveau'],
  status: ['status'],
  methods: ['methode', 'method', 'methods', 'methodes'],
  started: ['begin datum', 'begindatum', 'start date', 'started', 'start'],
};

const DUTCH_MONTHS: Record<string, number> = { januari: 1, februari: 2, maart: 3, april: 4, mei: 5, juni: 6, juli: 7, augustus: 8, september: 9, oktober: 10, november: 11, december: 12 };

const pad = (n: number) => String(n).padStart(2, '0');

/** Notion writes dates as "June 27, 2005", "27 juni 2005", "2005/06/27" or ISO. */
export function parseLooseDate(value: string): string | undefined {
  const v = value.trim().replace(/\s*\(.*\)$/, '');
  if (!v) return undefined;
  let m = v.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (m) return `${m[1]}-${pad(+m[2])}-${pad(+m[3])}`;
  m = v.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
  if (m) return `${m[3]}-${pad(+m[2])}-${pad(+m[1])}`;
  m = v.toLowerCase().match(/^(\d{1,2})\s+([a-z]+)\s+(\d{4})/);
  if (m && DUTCH_MONTHS[m[2]]) return `${m[3]}-${pad(DUTCH_MONTHS[m[2]])}-${pad(+m[1])}`;
  const ms = Date.parse(v);
  if (!Number.isNaN(ms)) {
    const d = new Date(ms);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }
  return undefined;
}

export function codeForLanguage(name: string): string {
  const key = name.trim().toLowerCase();
  return NAMES[key] ?? `x-${key.normalize('NFKD').replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '') || 'language'}`;
}

/** Parses the CSV; throws when it doesn't look like a languages table. */
export function parseNotionLanguages(text: string): ImportedCapability[] {
  const rows = parseCsv(text.replace(/^﻿/, ''));
  if (rows.length < 2) throw new Error('This CSV has no rows.');
  const header = rows[0].map((h) => h.trim().toLowerCase());
  const col = (names: string[]) => header.findIndex((h) => names.includes(h));
  const at = { name: col(COLUMNS.name), level: col(COLUMNS.level), status: col(COLUMNS.status), methods: col(COLUMNS.methods), started: col(COLUMNS.started) };
  if (at.name < 0) throw new Error('No “Taal” or “Language” column was found.');
  const out: ImportedCapability[] = [];
  for (const row of rows.slice(1)) {
    const name = row[at.name]?.trim();
    if (!name) continue;
    const levelRaw = (row[at.level] ?? '').trim().toUpperCase().match(/[ABC][0-2]/)?.[0];
    const level = (levelRaw && /^(A0|A1|A2|B1|B2|C1|C2)$/.test(levelRaw) ? levelRaw : 'A0') as CefrLevel;
    const status = STATUS[(row[at.status] ?? '').trim().toLowerCase()] ?? 'learning';
    const methods = (row[at.methods] ?? '')
      .split(/[,;]/)
      .map((m) => m.trim())
      .filter(Boolean)
      .map((m) => METHODS[m.toLowerCase()] ?? m);
    out.push({ id: codeForLanguage(name), name: LANGUAGE_NAMES[codeForLanguage(name)] ?? name, level, status, methods: [...new Set(methods)], started: at.started >= 0 ? parseLooseDate(row[at.started] ?? '') : undefined });
  }
  if (!out.length) throw new Error('No languages were found in this CSV.');
  return out;
}
