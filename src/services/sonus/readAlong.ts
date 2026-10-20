// Read along: an audiobook's parts get the book's own sentences (an ebook in Codex) in place of
// Whisper's, timed by matching the two (core/audio/align.ts). Whisper's transcript is kept with
// the timed text, so matching runs again from it and stopping puts it back.
import { alignToBook } from '@/core/audio/align';
import { getBook, updateBook } from '@/data/books';
import { db } from '@/data/db';
import type { LinguaDB } from '@/data/db';
import { textChapters } from '@/data/library';
import { getTranscript, saveTranscript } from '@/data/media';
import type { Media } from '@/data/types';
import { setCues } from '@/services/audio/engine';

export type ReadAlongResult = 'timed' | 'not-found' | 'no-transcript';

/** The text's paragraphs and headings in order: what a reader reads aloud. */
async function paragraphs(textId: string, database: LinguaDB): Promise<string[]> {
  return (await textChapters(textId, database)).flatMap((c) => c.blocks.flatMap((b) => (b.t === 'p' || b.t === 'h' ? [b.text] : [])));
}

async function alignPart(media: Media, lines: string[], database: LinguaDB): Promise<ReadAlongResult> {
  const transcript = await getTranscript(media.id, database);
  const heard = transcript?.source === 'book' ? transcript.original : transcript && { source: transcript.source, cues: transcript.cues };
  if (!heard?.cues.length) return 'no-transcript';
  const timed = alignToBook(heard.cues, lines, media.lang);
  if (!timed) return 'not-found';
  await saveTranscript(media.id, media.lang, timed, 'book', heard, database);
  setCues(media.id, timed);
  return 'timed';
}

/** Times one part with the book's text (after a new transcript, say). */
export async function readAlongPart(media: Media, textId: string, database: LinguaDB = db): Promise<ReadAlongResult> {
  return alignPart(media, await paragraphs(textId, database), database);
}

/** Reads the whole book along with a Codex text: every part with a transcript is timed now. */
export async function readAlongBook(bookId: string, textId: string, database: LinguaDB = db): Promise<Record<ReadAlongResult, number>> {
  await updateBook(bookId, { readAlongTextId: textId }, database);
  const counts: Record<ReadAlongResult, number> = { timed: 0, 'not-found': 0, 'no-transcript': 0 };
  const book = await getBook(bookId, database);
  if (!book) return counts;
  const lines = await paragraphs(textId, database);
  for (const part of book.parts) counts[await alignPart(part, lines, database)]++;
  return counts;
}

/** Back to Whisper's own transcripts. */
export async function stopReadAlong(bookId: string, database: LinguaDB = db): Promise<void> {
  const book = await getBook(bookId, database);
  for (const part of book?.parts ?? []) {
    const transcript = await getTranscript(part.id, database);
    if (transcript?.source !== 'book' || !transcript.original) continue;
    await saveTranscript(part.id, part.lang, transcript.original.cues, transcript.original.source, undefined, database);
    setCues(part.id, transcript.original.cues);
  }
  await updateBook(bookId, { readAlongTextId: null }, database);
}
