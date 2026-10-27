// Sandesigning's one door: open the studio over any page (or as the page), optionally capturing it first with notes
// already pinned. Used by the standalone app, by sandesigning.js in any web app, and by Lingua's design notes.
import type { Doc } from './model';
import { Studio } from './studio';
import type { PinInput } from './studio';

export type { PinInput } from './studio';
export type { Doc, SNode } from './model';
export { VERSION } from './model';

export interface OpenOptions {
  /** Take a screenshot of the page first and put it on the canvas. */
  capture?: boolean;
  /** Notes to pin on that screenshot, at window coordinates. */
  pins?: PinInput[];
  /** Open this canvas instead of the last one. */
  doc?: Doc;
  /** Sandesigning is the page itself: no close button. */
  standalone?: boolean;
  /** Where sandesigning.html and SANDESIGNING.md are served from, ending in '/'. */
  base?: string;
  onClose?: () => void;
}

let current: { host: HTMLElement; studio: Studio; overflow: string; onClose?: () => void } | null = null;

export const isOpen = () => current !== null;

export async function open(opts: OpenOptions = {}): Promise<Studio> {
  if (!current) {
    const host = document.createElement('div');
    host.setAttribute('data-sandesigning', '');
    host.style.cssText = 'position:fixed;inset:0;z-index:2147483000;';
    const root = host.attachShadow({ mode: 'open' });
    // The app underneath doesn't hear the canvas's keys, typing or clipboard.
    for (const type of ['keydown', 'keyup', 'keypress', 'input', 'paste', 'copy', 'cut']) host.addEventListener(type, (e) => e.stopPropagation());
    document.body.appendChild(host);
    const studio = new Studio(root, { standalone: opts.standalone, base: opts.base, onClose: close });
    current = { host, studio, overflow: document.documentElement.style.overflow, onClose: opts.onClose };
    document.documentElement.style.overflow = 'hidden';
    await studio.start(opts.doc);
    studio.ed.stage.focus();
  } else if (opts.doc) current.studio.ed.load(opts.doc);
  if (opts.capture) await current.studio.capture(opts.pins);
  return current.studio;
}

export function close() {
  if (!current) return;
  const { host, studio, overflow, onClose } = current;
  current = null;
  studio.destroy();
  host.remove();
  document.documentElement.style.overflow = overflow;
  onClose?.();
}
