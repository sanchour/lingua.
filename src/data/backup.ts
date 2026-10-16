import JSZip from 'jszip';
import { planMerge } from '@/core/backup/merge';
import type { MergePolicy } from '@/core/backup/merge';
import { localDateKey } from '@/lib/format';
import { db } from './db';
import type { LinguaDB, TableName } from './db';
import { DEVICE_LOCAL_SETTINGS, getSettings, patchSetting } from './settings';
import type { BlobRow, SettingRow } from './types';

export const BACKUP_FORMAT = 1;

type Policy = { policy: MergePolicy | 'skip'; key: string };

/** How each table travels in a backup. Dictionary/frequency data is reinstalled from packs instead. */
export const BACKUP_POLICIES: Record<TableName, Policy> = {
  languages: { policy: 'lww', key: 'id' },
  settings: { policy: 'lww', key: 'key' },
  texts: { policy: 'lww', key: 'id' },
  chapters: { policy: 'insertOnly', key: 'id' },
  readingProgress: { policy: 'lww', key: 'textId' },
  words: { policy: 'lww', key: 'id' },
  frequency: { policy: 'skip', key: 'id' },
  dictForms: { policy: 'skip', key: '' },
  dictEntries: { policy: 'skip', key: '' },
  dictPacks: { policy: 'skip', key: 'id' },
  translationCache: { policy: 'insertOnly', key: 'id' },
  llmCache: { policy: 'insertOnly', key: 'id' },
  folders: { policy: 'lww', key: 'id' },
  decks: { policy: 'lww', key: 'id' },
  notes: { policy: 'lww', key: 'id' },
  cards: { policy: 'lww', key: 'id' },
  reviewLogs: { policy: 'union', key: 'id' },
  media: { policy: 'lww', key: 'id' },
  transcripts: { policy: 'lww', key: 'id' },
  playbackProgress: { policy: 'lww', key: 'mediaId' },
  blobs: { policy: 'insertOnly', key: 'id' },
  sessions: { policy: 'union', key: 'id' },
  dailyStats: { policy: 'lww', key: 'id' },
  // Derived from chapters; rebuilt on demand.
  textVocab: { policy: 'skip', key: 'textId' },
  // Language-pack data; reinstalled with the pack.
  dictExamples: { policy: 'skip', key: '' },
  starterLists: { policy: 'skip', key: 'lang' },
};

const BACKED_UP = (Object.keys(BACKUP_POLICIES) as TableName[]).filter((t) => BACKUP_POLICIES[t].policy !== 'skip');

export interface BackupManifest {
  app: 'lingua';
  format: number;
  dbVersion: number;
  exportedAt: number;
  deviceId: string;
  counts: Partial<Record<TableName, number>>;
  includesMedia: boolean;
  includesApiKeys: boolean;
}

export class BackupError extends Error {}

type Row = Record<string, unknown>;

export interface ExportOptions {
  includeMedia: boolean;
  includeApiKeys: boolean;
}

export async function exportBackup(options: ExportOptions, database: LinguaDB = db): Promise<File> {
  const zip = new JSZip();
  const counts: Partial<Record<TableName, number>> = {};

  for (const name of BACKED_UP) {
    if (name === 'blobs' && !options.includeMedia) continue;
    let rows = (await database.table(name).toArray()) as Row[];
    if (name === 'settings') {
      rows = rows.filter((r) => !DEVICE_LOCAL_SETTINGS.has(r.key as string) || (r.key === 'apiKeys' && options.includeApiKeys));
    }
    if (name === 'blobs') {
      rows = await Promise.all(
        (rows as unknown as BlobRow[]).map(async ({ blob, ...meta }) => {
          zip.file(`blobs/${meta.id}`, await blob.arrayBuffer(), { compression: 'STORE' });
          return meta as Row;
        }),
      );
    }
    zip.file(`tables/${name}.ndjson`, rows.map((r) => JSON.stringify(r)).join('\n'));
    counts[name] = rows.length;
  }

  const settings = await getSettings(database);
  const manifest: BackupManifest = {
    app: 'lingua',
    format: BACKUP_FORMAT,
    dbVersion: database.verno,
    exportedAt: Date.now(),
    deviceId: settings.meta.deviceId,
    counts,
    includesMedia: options.includeMedia,
    includesApiKeys: options.includeApiKeys,
  };
  zip.file('manifest.json', JSON.stringify(manifest, null, 2));

  const bytes = await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE', compressionOptions: { level: 6 } });
  await patchSetting('meta', { lastBackupAt: manifest.exportedAt }, database);
  return new File([bytes as Uint8Array<ArrayBuffer>], `lingua-backup-${localDateKey(manifest.exportedAt)}.zip`, { type: 'application/zip' });
}

export interface ParsedBackup {
  manifest: BackupManifest;
  tables: Partial<Record<TableName, Row[]>>;
}

export async function readBackup(file: Blob): Promise<ParsedBackup> {
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(await file.arrayBuffer());
  } catch {
    throw new BackupError('This file is not a Lingua backup (it is not a readable .zip).');
  }
  const manifestFile = zip.file('manifest.json');
  if (!manifestFile) throw new BackupError('This .zip is not a Lingua backup (manifest missing).');
  const manifest = JSON.parse(await manifestFile.async('string')) as BackupManifest;
  if (manifest.app !== 'lingua') throw new BackupError('This .zip is not a Lingua backup.');
  if (manifest.format > BACKUP_FORMAT) throw new BackupError('This backup comes from a newer version of Lingua. Update the app on this device first.');

  const tables: ParsedBackup['tables'] = {};
  for (const name of BACKED_UP) {
    const entry = zip.file(`tables/${name}.ndjson`);
    if (!entry) continue;
    const text = await entry.async('string');
    tables[name] = text ? text.split('\n').filter(Boolean).map((line) => JSON.parse(line) as Row) : [];
  }

  // Re-attach binary data; rows whose file is missing are dropped.
  if (tables.blobs) {
    const withData: Row[] = [];
    for (const row of tables.blobs) {
      const data = zip.file(`blobs/${row.id as string}`);
      if (!data) continue;
      withData.push({ ...row, blob: new Blob([await data.async('uint8array') as Uint8Array<ArrayBuffer>], { type: row.mime as string }) });
    }
    tables.blobs = withData;
  }
  return { manifest, tables };
}

export interface RestoreSummary {
  added: number;
  updated: number;
  perTable: Partial<Record<TableName, { added: number; updated: number }>>;
}

/**
 * merge:   newest edit wins per row; logs are combined; nothing local is lost.
 * replace: tables present in the backup are cleared first (device-only settings are kept).
 */
export async function restoreBackup(backup: ParsedBackup, mode: 'merge' | 'replace', database: LinguaDB = db): Promise<RestoreSummary> {
  const summary: RestoreSummary = { added: 0, updated: 0, perTable: {} };
  const names = (Object.keys(backup.tables) as TableName[]).filter((n) => BACKUP_POLICIES[n]?.policy !== 'skip');
  const tables = names.map((n) => database.table(n));

  await database.transaction('rw', tables, async () => {
    for (const name of names) {
      const { policy, key } = BACKUP_POLICIES[name];
      const table = database.table(name);
      let rows = backup.tables[name] ?? [];
      if (name === 'settings') {
        rows = rows.filter((r) => !DEVICE_LOCAL_SETTINGS.has(r.key as string) || r.key === 'apiKeys');
      }

      if (mode === 'replace') {
        if (name === 'settings') {
          const keep = (await table.toArray()) as SettingRow[];
          await table.bulkDelete(keep.filter((r) => !DEVICE_LOCAL_SETTINGS.has(r.key)).map((r) => r.key));
        } else {
          await table.clear();
        }
        await table.bulkPut(rows);
        summary.perTable[name] = { added: rows.length, updated: 0 };
        summary.added += rows.length;
        continue;
      }

      const keyOf = (r: Row) => String(r[key]);
      const local = (await table.bulkGet(rows.map(keyOf))) as Array<Row | undefined>;
      const localByKey = new Map<string, Row>();
      local.forEach((r) => r && localByKey.set(keyOf(r), r));
      const plan = planMerge(localByKey, rows, keyOf, policy as MergePolicy);
      if (plan.put.length) await table.bulkPut(plan.put);
      summary.perTable[name] = { added: plan.added, updated: plan.updated };
      summary.added += plan.added;
      summary.updated += plan.updated;
    }

    // Two devices may each have had a different language active; keep only the most recent one.
    if (names.includes('languages')) {
      const active = await database.languages.where('isActive').equals(1).toArray();
      active.sort((a, b) => b.updatedAt - a.updatedAt);
      for (const extra of active.slice(1)) await database.languages.update(extra.id, { isActive: 0 });
    }
  });
  return summary;
}
