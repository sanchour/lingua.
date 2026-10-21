// Starting over: one language's progress, or everything on this device.
import { db } from './db';
import type { LinguaDB } from './db';

export interface ResetCounts {
  words: number;
  cards: number;
  sessions: number;
}

/**
 * Clears a language's progress: word states, decks with their cards and reviews, reading positions,
 * statistics, milestones, logged study and goals. Books, audio and journal entries stay.
 */
export async function resetLanguageProgress(lang: string, database: LinguaDB = db): Promise<ResetCounts> {
  return database.transaction(
    'rw',
    [database.words, database.decks, database.folders, database.notes, database.cards, database.reviewLogs, database.readingProgress, database.texts, database.sessions, database.dailyStats, database.journeyEvents, database.studyLogs, database.goals, database.languages, database.playbackProgress, database.media, database.grammarItems, database.grammarProgress],
    async () => {
      const deckIds = (await database.decks.where('lang').equals(lang).toArray()).map((d) => d.id);
      const noteIds = deckIds.length ? ((await database.notes.where('deckId').anyOf(deckIds).primaryKeys()) as string[]) : [];
      const cardIds = noteIds.length ? ((await database.cards.where('noteId').anyOf(noteIds).primaryKeys()) as string[]) : [];
      const words = await database.words.where('[lang+state]').between([lang, 0], [lang, 2], true, true).delete();
      if (deckIds.length) {
        for (const id of deckIds) await database.reviewLogs.where('[deckId+reviewedAt]').between([id, 0], [id, Infinity]).delete();
        await database.cards.bulkDelete(cardIds);
        await database.notes.bulkDelete(noteIds);
        await database.decks.bulkDelete(deckIds);
      }
      await database.folders.where('lang').equals(lang).delete();
      const textIds = (await database.texts.where('lang').equals(lang).toArray()).map((t) => t.id);
      await database.readingProgress.bulkDelete(textIds);
      await database.texts.where('lang').equals(lang).modify((t) => {
        delete t.stats;
        delete t.finishedAt;
        delete t.lastOpenedAt;
      });
      const mediaIds = (await database.media.where('lang').equals(lang).toArray()).map((m) => m.id);
      await database.playbackProgress.bulkDelete(mediaIds);
      const sessions = await database.sessions.where('[lang+startedAt]').between([lang, 0], [lang, Infinity]).delete();
      await database.dailyStats.where('[lang+date]').between([lang, ''], [lang, '￿']).delete();
      await database.journeyEvents.where('lang').equals(lang).delete();
      await database.studyLogs.where('lang').equals(lang).delete();
      await database.goals.where('lang').equals(lang).delete();
      await database.grammarItems.where('[lang+topic]').between([lang, ''], [lang, '\uffff']).delete();
      await database.grammarProgress.where('lang').equals(lang).delete();
      await database.reviewLogs.where('[deckId+reviewedAt]').between([`grammar:${lang}`, 0], [`grammar:${lang}`, Infinity]).delete();
      // Ready-made "known" seeding can be applied again from Settings › Languages.
      await database.languages.update(lang, { seedAppliedAt: undefined, updatedAt: Date.now() });
      return { words, cards: cardIds.length, sessions };
    },
  );
}

/** Erases everything Lingua stored on this device and starts again at onboarding. */
export async function eraseEverything(database: LinguaDB = db): Promise<void> {
  database.close();
  await database.delete();
  try {
    localStorage.clear();
    sessionStorage.clear();
  } catch {
    /* storage unavailable */
  }
  // Runtime caches (fonts, the Anki engine); the app itself stays installed and offline-ready.
  if ('caches' in window) {
    for (const name of await caches.keys()) if (name.startsWith('lingua-')) await caches.delete(name);
  }
  location.replace(import.meta.env.BASE_URL);
}
