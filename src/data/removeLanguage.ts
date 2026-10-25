// Removing a language (Settings › Languages): the language and everything learnt in it go from this
// device, with the files and the offline dictionary that took their room. Other languages stay.
import Dexie from 'dexie';
import { removePack } from '@/services/packs/packs';
import { deleteBook } from './books';
import { db } from './db';
import type { LinguaDB } from './db';
import { deleteDeck, deleteFolder } from './decks';
import { deleteEntry } from './journal';
import { removeGoal, removeMoment, removeStudyLog } from './journey';
import { switchLanguage } from './languages';
import { deleteText } from './library';
import { deleteMedia } from './media';
import { removeSong } from './songs';

export async function removeLanguage(lang: string, database: LinguaDB = db): Promise<void> {
  const others = (await database.languages.toArray()).filter((l) => !l.deletedAt && l.id !== lang);
  if (!others.length) throw new Error('Lingua needs one language to study: add another before removing this one.');
  if ((await database.languages.get(lang))?.isActive === 1) await switchLanguage(others[0].id, database);

  // What has its own way out (its files, chapters, cards, transcripts go with it).
  for (const t of await database.texts.where('lang').equals(lang).toArray()) await deleteText(t.id, database);
  for (const d of await database.decks.where('lang').equals(lang).toArray()) await deleteDeck(d.id, database);
  for (const f of await database.folders.where('lang').equals(lang).toArray()) await deleteFolder(f.id, database);
  const media = await database.media.where('lang').equals(lang).toArray();
  for (const bookId of new Set(media.map((m) => m.bookId).filter((id): id is string => Boolean(id)))) await deleteBook(bookId, database);
  for (const m of media) await deleteMedia(m.id, database);
  for (const s of await database.songs.where('lang').equals(lang).toArray()) await removeSong(s.id, database);
  for (const e of await database.journalEntries.where('lang').equals(lang).toArray()) await deleteEntry(e.id, database);
  for (const e of await database.journeyEvents.where('lang').equals(lang).toArray()) await removeMoment(e.id, database);
  for (const l of await database.studyLogs.where('lang').equals(lang).toArray()) await removeStudyLog(l.id, database);
  for (const g of await database.goals.where('lang').equals(lang).toArray()) await removeGoal(g.id, database);

  // The rest is rows of its own.
  const range = (index: string) => [`${index}`, [lang, Dexie.minKey], [lang, Dexie.maxKey]] as const;
  const [wi, wlo, whi] = range('[lang+state]');
  await database.words.where(wi).between(wlo, whi).delete();
  const [si, slo, shi] = range('[lang+startedAt]');
  await database.sessions.where(si).between(slo, shi).delete();
  const [di, dlo, dhi] = range('[lang+date]');
  await database.dailyStats.where(di).between(dlo, dhi).delete();
  await database.feeds.where('lang').equals(lang).delete();
  await database.stations.where('lang').equals(lang).delete();
  await database.challenges.where('lang').equals(lang).delete();
  await database.grammarItems.where('[lang+topic]').between([lang, Dexie.minKey], [lang, Dexie.maxKey]).delete();
  await database.grammarProgress.where('lang').equals(lang).delete();
  await database.courseProgress.where('lang').equals(lang).delete();
  await database.typing.where('lang').equals(lang).delete();
  await database.reviewLogs.where('[deckId+reviewedAt]').between([`grammar:${lang}`, Dexie.minKey], [`grammar:${lang}`, Dexie.maxKey]).delete();
  await removePack(lang);

  const now = Date.now();
  await database.languages.update(lang, { deletedAt: now, isActive: 0, updatedAt: now });
}
