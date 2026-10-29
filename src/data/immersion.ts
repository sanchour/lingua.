import { db } from './db';
import type { LinguaDB } from './db';
import { CEFR_LEVELS } from '@/core/lang/levels';
import { MEDIA_KINDS } from '@/core/culture/immersion';
import type { ImmersionMediaKind } from '@/core/culture/immersion';
export interface ShoppingItem { id: string; text: string; done: boolean }
export interface ImmersionMedia { mediaId: string; level: string; kind: ImmersionMediaKind }
export interface ImmersionList { shopping: ShoppingItem[]; media: ImmersionMedia[] }
export type ImmersionAction = { type: 'add'; text: string } | { type: 'toggle' | 'remove'; id: string } | { type: 'restore'; item: ShoppingItem } | { type: 'media-add' | 'media-restore'; item: ImmersionMedia } | { type: 'media-remove'; mediaId: string };
const keyOf = (lang: string) => `immersion:${lang}`;
export async function immersionList(lang: string, database: LinguaDB = db): Promise<ImmersionList> {
  const raw = (await database.settings.get(keyOf(lang)))?.value;
  if (raw === undefined) return { shopping: [], media: [] };
  const r = raw as ImmersionList;
  if (!r || !Array.isArray(r.shopping) || !Array.isArray(r.media) || r.shopping.length > 100 || r.media.length > 100 || !r.shopping.every((x) => x && typeof x.id === 'string' && typeof x.text === 'string' && x.text.length <= 200 && typeof x.done === 'boolean') || !r.media.every((x) => x && typeof x.mediaId === 'string' && CEFR_LEVELS.includes(x.level as typeof CEFR_LEVELS[number]) && MEDIA_KINDS.includes(x.kind))) throw new Error('The saved immersion list could not be read. It has been kept unchanged.');
  return r;
}
// shortcut: small immersion lists use existing settings rows; use a table if per-item sync merging becomes necessary.
export async function updateImmersion(lang: string, action: ImmersionAction, database: LinguaDB = db) {
  await database.transaction('rw', database.settings, database.media, async () => {
    const list = await immersionList(lang, database);
    if (action.type === 'add') {
      if (!action.text.trim() || action.text.length > 200 || list.shopping.length >= 100) throw new Error('Use an item under 200 characters; keep up to 100 items.');
      list.shopping.push({ id: crypto.randomUUID(), text: action.text.trim(), done: false });
    } else if (action.type === 'toggle') list.shopping = list.shopping.map((x) => x.id === action.id ? { ...x, done: !x.done } : x);
    else if (action.type === 'remove') list.shopping = list.shopping.filter((x) => x.id !== action.id);
    else if (action.type === 'restore') {
      if (!action.item.id || !action.item.text.trim() || action.item.text.length > 200 || typeof action.item.done !== 'boolean' || list.shopping.length >= 100) throw new Error('Could not restore this item.');
      if (!list.shopping.some((x) => x.id === action.item.id)) list.shopping.push(action.item);
    } else if (action.type === 'media-remove') list.media = list.media.filter((x) => x.mediaId !== action.mediaId);
    else if (action.type === 'media-add' || action.type === 'media-restore') {
      const item = action.item;
      const media = await database.media.get(item.mediaId);
      if (!media || media.deletedAt || media.lang !== lang || media.kind !== 'video' || !CEFR_LEVELS.includes(item.level as typeof CEFR_LEVELS[number]) || !MEDIA_KINDS.includes(item.kind)) throw new Error('Choose a video in this language and a level.');
      const kept = list.media.filter((x) => x.mediaId !== item.mediaId);
      if (kept.length >= 100) throw new Error('Keep up to 100 videos in these playlists.');
      list.media = [...kept, item];
    }
    await database.settings.put({ key: keyOf(lang), value: list, updatedAt: Date.now() });
  });
}
