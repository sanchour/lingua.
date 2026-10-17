import { posFromContext, senseInContext, shortGloss } from '@/core/lang/context';
import { sentenceAt } from '@/core/text/tokenizer';
import type { Text, WordState } from '@/data/types';
import { markKnownBulk, setWordState } from '@/data/words';
import type { WordContext } from '@/data/words';
import { contextGlosses, contextGlossesEnabled } from '@/services/llm/contextGloss';
import { fetchOnlineGloss } from '@/services/translate/gloss';
import type { GlossInfo } from '@/services/translate/gloss';
import type { ChapterModel } from './model';

/**
 * A click always means "I'm learning this", and clicking a Learning word means "now I know it":
 * one click Learning, two clicks Known, from Unseen and from Known alike. Resetting to Unseen is
 * X, or the reset button in the word's details.
 */
export const nextState = (s: WordState): WordState => (s === 2 ? 1 : 2);

const WORD_EVENT = 'lingua:word';
interface WordEvent {
  lang: string;
  norm: string;
  state: WordState;
  engine: WordEngine;
}

/**
 * Imperative word engine for one rendered chapter. State changes repaint the affected spans
 * directly (no React render) and are then saved; glosses come from the in-memory map.
 */
const SENTENCE_END = /[.!?;:…]/;
const sentenceSegmenters = new Map<string, Intl.Segmenter>();

export class WordEngine {
  private index = new Map<string, HTMLElement[]>();
  /** Glosses for one occurrence (`block:offset`): chosen by the neighbours, or read by the AI. */
  private contextual = new Map<string, GlossInfo>();
  /** Sentences already sent to the AI (`block:start`). */
  private asked = new Set<string>();

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

  /**
   * The gloss for this occurrence of a word: the learner's own translation wins; then what the AI
   * read in this sentence; then the dictionary sense the neighbouring word points to; else the
   * word's usual gloss.
   */
  glossAt(el: HTMLElement): GlossInfo | undefined {
    const norm = el.dataset.n!;
    const base = this.gloss(norm);
    if (base?.source === 'user') return base;
    const b = Number(el.closest<HTMLElement>('[data-b]')?.dataset.b ?? -1);
    const offset = Number(el.dataset.o ?? -1);
    const key = `${b}:${offset}`;
    const known = this.contextual.get(key);
    if (known) return known;
    const options = this.model.senses?.get(norm);
    const tokens = this.model.blocks[b]?.tokens;
    if (!options || !tokens) return base;
    const at = tokens.findIndex((t) => t.start === offset);
    let previous: string | undefined;
    for (let i = at - 1; i >= 0; i--) {
      const t = tokens[i];
      if (t.isWord) {
        previous = t.norm;
        break;
      }
      if (SENTENCE_END.test(t.text)) break;
    }
    const sense = senseInContext(options, posFromContext(this.lang, previous));
    // The usual reading keeps the dictionary's own short gloss ("perro" after "el" is still "dog").
    if (!sense || (sense === options[0] && base)) return base;
    const info: GlossInfo = { text: shortGloss(sense.glosses), lemma: sense.lemma, source: 'context' };
    this.contextual.set(key, info);
    return info;
  }

  /**
   * With an AI key: asks once for the meanings every word has in this sentence. `onReady` runs when
   * they arrive (the tooltip then refreshes itself).
   */
  async requestContext(el: HTMLElement, onReady?: () => void): Promise<void> {
    const blockEl = el.closest<HTMLElement>('[data-b]');
    const b = Number(blockEl?.dataset.b ?? -1);
    const block = this.model.blocks[b];
    if (!block?.tokens || block.block.t === 'img') return;
    const text = block.block.text;
    let seg = sentenceSegmenters.get(this.lang);
    if (!seg) sentenceSegmenters.set(this.lang, (seg = new Intl.Segmenter(this.lang, { granularity: 'sentence' })));
    const sentence = seg.segment(text).containing(Number(el.dataset.o ?? 0));
    if (!sentence) return;
    const key = `${b}:${sentence.index}`;
    if (this.asked.has(key)) return;
    this.asked.add(key);
    if (!(await contextGlossesEnabled())) return;
    const end = sentence.index + sentence.segment.length;
    const words = block.tokens.filter((t) => t.isWord && t.start >= sentence.index && t.start < end);
    if (!words.length || words.length > 80) return;
    try {
      const glosses = await contextGlosses(this.lang, sentence.segment.trim(), words.map((w) => w.text));
      words.forEach((w, i) => {
        const g = glosses[i];
        if (g) this.contextual.set(`${b}:${w.start}`, { text: g, lemma: this.gloss(w.norm!)?.lemma, source: 'context' });
      });
      onReady?.();
    } catch {
      this.asked.delete(key); // offline or no answer: try again on a later look
    }
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
    const gloss = this.glossAt(el);
    const usual = this.gloss(norm)?.text;
    return {
      surface: el.textContent ?? norm,
      sentence: block && block.t !== 'img' ? sentenceAt(block.text, Number(el.dataset.o ?? 0), this.lang) : undefined,
      gloss: gloss?.text,
      usualGloss: gloss?.source === 'context' && usual && usual !== gloss.text ? usual : undefined,
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
    document.dispatchEvent(new CustomEvent<WordEvent>(WORD_EVENT, { detail: { lang: this.lang, norm, state, engine: this } }));
  }

  /** Repaints a word changed by another engine on the page, without saving it again. */
  reflect(norm: string, state: WordState): void {
    if (this.state(norm) === state) return;
    this.paint(norm, state);
    if (state) this.model.states.set(norm, state);
    else this.model.states.delete(norm);
  }

  /** Keeps in step with other engines on the same page (Visio's subtitles and its transcript). */
  follow(): () => void {
    const on = (e: Event) => {
      const d = (e as CustomEvent<WordEvent>).detail;
      if (d.engine !== this && d.lang === this.lang) this.reflect(d.norm, d.state);
    };
    document.addEventListener(WORD_EVENT, on);
    return () => document.removeEventListener(WORD_EVENT, on);
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
