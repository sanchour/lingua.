// Capturing the page you're on: a screenshot through the browser's own screen sharing (it asks first, and the person
// picks this tab), and the box of every visible element, so a note on the picture knows what it points at.
import type { DomBox } from './model';

export interface Capture {
  dataUrl: string;
  /** The picture's pixels. */
  nw: number;
  nh: number;
  /** The window in CSS pixels, and pixels per CSS pixel. */
  w: number;
  h: number;
  scale: number;
  dom: DomBox[];
  page: string;
  title: string;
}

const SKIP = new Set(['SCRIPT', 'STYLE', 'LINK', 'META', 'NOSCRIPT', 'TEMPLATE', 'BR', 'HEAD']);

const cssPath = (el: Element): string => {
  if (el.id && /^[A-Za-z][\w-]*$/.test(el.id)) return `#${el.id}`;
  const parts: string[] = [];
  for (let e: Element | null = el; e && e !== document.body && parts.length < 5; e = e.parentElement) {
    if (e.id && /^[A-Za-z][\w-]*$/.test(e.id)) {
      parts.unshift(`#${e.id}`);
      break;
    }
    let part = e.tagName.toLowerCase();
    const cls = [...e.classList].filter((c) => /^[A-Za-z][\w-]*$/.test(c) && c.length < 30).slice(0, 2);
    if (cls.length) part += `.${cls.join('.')}`;
    const parent = e.parentElement;
    if (parent) {
      const same = [...parent.children].filter((c) => c.tagName === e!.tagName);
      if (same.length > 1) part += `:nth-of-type(${same.indexOf(e) + 1})`;
    }
    parts.unshift(part);
  }
  return parts.join(' > ');
};

/** button “Continue”, input “Email”, a heading’s words: what a person would call it. */
export const nameOf = (el: Element): string => {
  const tag = el.tagName.toLowerCase();
  const role = el.getAttribute('role');
  const aria = el.getAttribute('aria-label') || el.getAttribute('title') || el.getAttribute('placeholder') || el.getAttribute('alt');
  const own = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent ?? '').join(' ').replace(/\s+/g, ' ').trim();
  const words = (aria || own || (el as HTMLElement).innerText || '').replace(/\s+/g, ' ').trim().slice(0, 50);
  const kind = role || ({ a: 'link', img: 'picture', h1: 'heading', h2: 'heading', h3: 'heading', p: 'text', li: 'list item', ul: 'list', nav: 'navigation', aside: 'side panel', header: 'header', footer: 'footer', main: 'main' } as Record<string, string>)[tag] || tag;
  return words ? `${kind} “${words}”` : kind;
};

/** React's name for the component around an element, where the page is a React app in development. */
const componentOf = (el: Element): string | undefined => {
  const key = Object.keys(el).find((k) => k.startsWith('__reactFiber$'));
  type Fiber = { type?: unknown; return?: Fiber };
  for (let f = key ? ((el as unknown as Record<string, Fiber>)[key] as Fiber | undefined) : undefined, i = 0; f && i < 30; f = f.return, i++) {
    const t = f.type as { displayName?: string; name?: string } | undefined;
    const name = typeof t === 'function' || typeof t === 'object' ? t?.displayName || t?.name : undefined;
    if (name && /^[A-Z]/.test(name)) return name;
  }
};

/** Every element worth pointing at, in CSS pixels of the window. */
export function domMap(skip?: (el: Element) => boolean): DomBox[] {
  const out: DomBox[] = [];
  const vw = innerWidth, vh = innerHeight;
  const walk = (el: Element, depth: number) => {
    if (out.length > 1500 || SKIP.has(el.tagName) || skip?.(el)) return;
    const style = getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) return;
    const b = el.getBoundingClientRect();
    const seen = b.width >= 8 && b.height >= 8 && b.right > 0 && b.bottom > 0 && b.left < vw && b.top < vh;
    if (seen && el !== document.body) out.push({ x: Math.round(b.left), y: Math.round(b.top), w: Math.round(b.width), h: Math.round(b.height), name: nameOf(el), selector: cssPath(el), component: componentOf(el), depth });
    for (const c of el.children) walk(c, depth + 1);
  };
  walk(document.body, 0);
  return out;
}

const frame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

/**
 * A screenshot of this tab. The browser asks which tab to share (this one comes first in Chrome and Edge); nothing
 * is recorded beyond the one picture, and sharing stops straight away.
 */
export async function captureTab(hide: () => () => void, skip?: (el: Element) => boolean): Promise<Capture> {
  if (!navigator.mediaDevices?.getDisplayMedia) throw new Error('This browser can’t take screenshots of a page. Paste one instead (Ctrl V).');
  const stream = await navigator.mediaDevices.getDisplayMedia({ video: { displaySurface: 'browser' }, audio: false, preferCurrentTab: true, selfBrowserSurface: 'include' } as DisplayMediaStreamOptions);
  const show = hide();
  try {
    const video = document.createElement('video');
    video.muted = true;
    video.srcObject = stream;
    await video.play();
    await frame();
    // The sharing bar can take a moment to settle; one more frame keeps it out of the picture.
    await new Promise((r) => setTimeout(r, 250));
    const dom = domMap(skip);
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')!.drawImage(video, 0, 0);
    return { dataUrl: canvas.toDataURL('image/png'), nw: canvas.width, nh: canvas.height, w: innerWidth, h: innerHeight, scale: canvas.width / innerWidth, dom, page: location.href, title: document.title };
  } finally {
    stream.getTracks().forEach((t) => t.stop());
    show();
  }
}
