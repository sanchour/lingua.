// Design notes (7-0b): finding an element again, and naming it for a person. Works on anything shaped like an
// element, so the tests can use plain objects.

/** What the selector needs of an element; real DOM elements have all of it. */
export interface NodeLike {
  tagName: string;
  id: string;
  parentElement: NodeLike | null;
  children: ArrayLike<NodeLike>;
  getAttribute(name: string): string | null;
  textContent: string | null;
}

const quote = (value: string) => value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
const STABLE_ID = /^[A-Za-z][\w-]*$/;
/** Where a path may stop: these are landmarks, unlikely to repeat. */
const LANDMARKS = new Set(['main', 'nav', 'aside', 'header', 'footer', 'dialog']);

/**
 * A CSS path for `el`, short but specific: an id ends it; a test id or an aria-label narrows a step; same-tag
 * siblings get :nth-of-type. At most six steps, stopping at a landmark.
 */
export function cssPath(el: NodeLike): string {
  const parts: string[] = [];
  let node: NodeLike | null = el;
  while (node && parts.length < 6) {
    const tag = node.tagName.toLowerCase();
    if (tag === 'html' || tag === 'body') break;
    if (node.id && STABLE_ID.test(node.id)) {
      parts.unshift(`#${node.id}`);
      break;
    }
    let part = tag;
    const testId = node.getAttribute('data-testid');
    const label = node.getAttribute('aria-label');
    if (testId) part += `[data-testid="${quote(testId)}"]`;
    else if (label && label.length <= 60) part += `[aria-label="${quote(label)}"]`;
    const parent: NodeLike | null = node.parentElement;
    if (parent && !testId) {
      const same = Array.from(parent.children).filter((c) => c.tagName === node!.tagName);
      if (same.length > 1) part += `:nth-of-type(${same.indexOf(node) + 1})`;
    }
    parts.unshift(part);
    if (LANDMARKS.has(tag)) break;
    node = parent;
  }
  return parts.join(' > ');
}

const KIND: Record<string, string> = {
  a: 'link', button: 'button', img: 'picture', svg: 'drawing', input: 'field', textarea: 'text field', select: 'menu',
  h1: 'heading', h2: 'heading', h3: 'heading', h4: 'heading', p: 'text', span: 'text', li: 'item', ul: 'list', ol: 'list',
  label: 'label', nav: 'navigation', main: 'page', aside: 'panel', header: 'header', section: 'section', table: 'table',
};

const clip = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text);

/** How a person would name the element: its kind and its words, e.g. button “Continue reading”. */
export function describe(el: NodeLike): string {
  const tag = el.tagName.toLowerCase();
  const kind = el.getAttribute('role') ?? KIND[tag] ?? (tag === 'div' ? 'block' : tag);
  const words = (el.getAttribute('aria-label') ?? el.getAttribute('title') ?? el.getAttribute('alt') ?? el.getAttribute('placeholder') ?? el.textContent ?? '').replace(/\s+/g, ' ').trim();
  return words ? `${kind} “${clip(words, 48)}”` : kind;
}
