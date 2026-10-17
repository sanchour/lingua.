import type { Cue, Media, Text, WordState } from '@/data/types';
import type { WordContext } from '@/data/words';
import { WordEngine } from '@/features/codex/reader/engine';
import type { ChapterModel } from '@/features/codex/reader/model';

/**
 * The word engine for transcripts and subtitles: one block per cue, and every word saved with the
 * line it was heard in and that line's clip, so its flashcard can play it back.
 */
export class ClipEngine extends WordEngine {
  constructor(
    text: Text,
    model: ChapterModel,
    private readonly cues: readonly Cue[],
    private readonly media: Pick<Media, 'id' | 'kind' | 'textId'>,
    onChange?: (norm: string, state: WordState, previous: WordState) => void,
  ) {
    super(text, model, onChange);
  }

  override context(el: HTMLElement): WordContext {
    const base = super.context(el);
    const cue = this.cues[base.blockIndex ?? -1];
    const fromText = Boolean(this.media.textId);
    return {
      ...base,
      // A Sonus transcript kept as a Codex text can still open there; otherwise there's no text.
      textId: fromText ? base.textId : undefined,
      chapterIndex: fromText ? base.chapterIndex : undefined,
      blockIndex: fromText ? base.blockIndex : undefined,
      mediaId: this.media.id,
      startMs: cue?.startMs,
      endMs: cue?.endMs,
      source: this.media.kind === 'video' ? 'visio' : 'sonus',
    };
  }
}
