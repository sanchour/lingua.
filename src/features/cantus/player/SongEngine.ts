import type { LyricLine, Song, Text, WordState } from '@/data/types';
import type { WordContext } from '@/data/words';
import { WordEngine } from '@/features/codex/reader/engine';
import type { ChapterModel } from '@/features/codex/reader/model';

/** The word engine for lyrics: each word is saved with its line and the song, so its card can play the line. */
export class SongEngine extends WordEngine {
  constructor(
    text: Text,
    model: ChapterModel,
    private readonly song: Pick<Song, 'id'>,
    private readonly lines: readonly LyricLine[],
    onChange?: (norm: string, state: WordState, previous: WordState) => void,
  ) {
    super(text, model, onChange);
  }

  override context(el: HTMLElement): WordContext {
    const base = super.context(el);
    const i = base.blockIndex ?? -1;
    const line = this.lines[i];
    const next = this.lines.slice(i + 1).find((l) => l.startMs !== undefined)?.startMs;
    return {
      ...base,
      // The whole line is the context: lyrics rarely end their sentences.
      sentence: line?.text || base.sentence,
      textId: undefined,
      chapterIndex: undefined,
      songId: this.song.id,
      startMs: line?.startMs,
      endMs: line?.startMs !== undefined ? (next ?? line.startMs + 5000) : undefined,
      source: 'cantus',
    };
  }
}
