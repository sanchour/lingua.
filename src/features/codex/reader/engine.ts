import { sentenceAt } from '@/core/text/tokenizer';
import type { Text, WordState } from '@/data/types';
import { markKnownBulk, setWordState } from '@/data/words';
import type { WordContext } from '@/data/words';
import { fetchOnlineGloss } from '@/services/translate/gloss';
import type { GlossInfo } from '@/services/translate/gloss';
import type { ChapterModel } from './model';

/**
 * A click always means "I'm learning this", and clicking a Learning word means "now I know it":
 * one click Learning, two clicks Known, from Unseen and from Known alike. Resetting to Unseen is
 * X, or the reset button in the word's details.
 */
export const nextState = (s: WordState): WordState => (s === 2 ? 1 : 2);

/**
 * Imperative word engine for one rendered chapter. State changes repaint the affected spans
 * directly (no React render) and are then saved; glosses come from the in-memory map.
 */
export class WordEngine {
  private index = new Map<string, HTMLElement[]>();

  constructor(
    readonly text: Text,
    readonly model: ChapterModel,
    private readonly onChange?: (norm: string, state: WordState, previous: WordState) => void,
  ) {}

  /** Indexes the rendered word spans by form. Call after each render of the chapter body. */
  attach(root: HTMLElement): void {
    this.index.clear();
    for (const el of root.querySelectorAll<HTMLElement>('.w')) {
      const norm = el.dataset.n!;
      const list = this.index.get(norm);
      if (list) list.push(el);
      else this.index.set(norm, [el]);
    }
  }

  get lang(): string {
    return this.text.lang;
  }

  state(norm: string): WordState {
    return this.model.states.get(norm) ?? 0;
  }

  gloss(norm: string): GlossInfo | undefined {
    return this.model.glosses.get(norm);
  }

  /** Online fallback for a missing gloss; the answer is remembered for the chapter. */
  async ensureGloss(norm: string, surface: string): Promise<GlossInfo | null> {
    const known = this.gloss(norm);
    if (known) return known;
    const text = await fetchOnlineGloss(this.lang, norm, surface);
    if (!text) return null;
    const info: GlossInfo = { text, source: 'online' };
    this.model.glosses.set(norm, info);
    return info;
  }

  /** Overrides a gloss in the current chapter (after the learner edits it). */
  setGloss(norm: string, text: string): void {
    if (text) this.model.glosses.set(norm, { ...this.gloss(norm), text, source: 'user' });
  }

  context(el: HTMLElement): WordContext {
    const blockEl = el.closest<HTMLElement>('[data-b]');
    const b = Number(blockEl?.dataset.b ?? 0);
    const block = this.model.blocks[b]?.block;
    const norm = el.dataset.n!;
    const gloss = this.gloss(norm);
    return {
      surface: el.textContent ?? norm,
      sentence: block && block.t !== 'img' ? sentenceAt(block.text, Number(el.dataset.o ?? 0), this.lang) : undefined,
      gloss: gloss?.text,
      lemma: gloss?.lemma,
      textId: this.text.id,
      chapterIndex: this.model.chapter.index,
      blockIndex: b,
    };
  }

  private paint(norm: string, state: WordState): void {
    for (const el of this.index.get(norm) ?? []) el.dataset.s = String(state);
  }

  /** A short glow on the word you changed, so every click visibly lands (CSS: .w[data-flash]). */
  private flash(el: HTMLElement | undefined, state: WordState): void {
    if (!el) return;
    el.dataset.flash = state === 1 ? 'known' : state === 2 ? 'learning' : 'reset';
    // Restart the animation even when the same word is clicked again quickly.
    el.style.animation = 'none';
    void el.offsetWidth;
    el.style.animation = '';
    window.clearTimeout(Number(el.dataset.flashTimer));
    el.dataset.flashTimer = String(window.setTimeout(() => delete el.dataset.flash, 700));
  }

  set(norm: string, state: WordState, el?: HTMLElement): void {
    const previous = this.state(norm);
    this.flash(el, state);
    if (previous === state) return;
    this.paint(norm, state);
    if (state) this.model.states.set(norm, state);
    else this.model.states.delete(norm);
    this.onChange?.(norm, state, previous);
    void setWordState(this.lang, norm, state, el ? this.context(el) : {});
  }

  cycle(el: HTMLElement): WordState {
    const norm = el.dataset.n!;
    const next = nextState(this.state(norm));
    this.set(norm, next, el);
    return next;
  }

  /** LingQ-style: everything still Unseen among these spans becomes Known. */
  markSeenAsKnown(elements: Iterable<HTMLElement>): number {
    const norms = new Set<string>();
    for (const el of elements) {
      const n = el.dataset.n!;
      if (this.state(n) === 0) norms.add(n);
    }
    for (const n of norms) {
      this.paint(n, 1);
      this.model.states.set(n, 1);
      this.onChange?.(n, 1, 0);
    }
    void markKnownBulk(this.lang, [...norms]);
    return norms.size;
  }

  words(): HTMLElement[] {
    return [...this.index.values()].flat();
  }
}
