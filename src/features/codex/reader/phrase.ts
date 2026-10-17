// Selecting a phrase: press and drag across words (mouse), or long-press and slide (touch). The
// words in between light up, up to a limit, and the bubble translates what was chosen.
import { wordAt } from './hit';

export const PHRASE_MAX_WORDS = 60;

export class PhraseSelector {
  private words: HTMLElement[] = [];
  private anchor = -1;
  private selected: HTMLElement[] = [];

  constructor(private readonly root: HTMLElement) {}

  begin(anchor: HTMLElement): void {
    this.words = [...this.root.querySelectorAll<HTMLElement>('.w')];
    this.anchor = this.words.indexOf(anchor);
    this.paint(this.anchor, this.anchor);
  }

  /** Extends the selection to the word under (x, y), if there is one. */
  update(x: number, y: number): void {
    if (this.anchor < 0) return;
    const el = wordAt(document.elementFromPoint(x, y), x, y, this.root);
    const i = el ? this.words.indexOf(el) : -1;
    if (i < 0) return;
    let a = Math.min(this.anchor, i);
    let b = Math.max(this.anchor, i);
    if (b - a + 1 > PHRASE_MAX_WORDS) {
      if (i > this.anchor) b = a + PHRASE_MAX_WORDS - 1;
      else a = b - PHRASE_MAX_WORDS + 1;
    }
    this.paint(a, b);
  }

  private paint(a: number, b: number): void {
    for (const el of this.selected) el.classList.remove('is-selected');
    this.selected = a < 0 ? [] : this.words.slice(a, b + 1);
    for (const el of this.selected) el.classList.add('is-selected');
  }

  get count(): number {
    return this.selected.length;
  }

  get first(): HTMLElement | undefined {
    return this.selected[0];
  }

  get last(): HTMLElement | undefined {
    return this.selected.at(-1);
  }

  /** The selected text as written (with its spaces and punctuation), paragraphs joined by a space. */
  text(): string {
    const parts: string[] = [];
    let group: HTMLElement[] = [];
    const flush = () => {
      if (!group.length) return;
      const range = document.createRange();
      range.setStartBefore(group[0]);
      range.setEndAfter(group.at(-1)!);
      parts.push(range.toString());
      group = [];
    };
    let block: Element | null = null;
    for (const el of this.selected) {
      const b = el.closest('[data-b]');
      if (b !== block) flush();
      block = b;
      group.push(el);
    }
    flush();
    return parts.join(' ').replace(/\s+/g, ' ').trim();
  }

  clear(): void {
    this.paint(-1, -1);
    this.anchor = -1;
  }
}
