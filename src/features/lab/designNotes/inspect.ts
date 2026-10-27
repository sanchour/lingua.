// Design notes (7-0c): what an element is, read from the page (its tag, component, classes, size, type, colours with
// their tokens, and box), and the tweaks a note can ask for, each with its value now and a live preview.
import type { ElementFacts } from './notes';

/** The properties a tweak can change: its name in the card and the Markdown, and the CSS property it is. */
export const TWEAKS = [
  { name: 'type size', css: 'font-size' },
  { name: 'weight', css: 'font-weight' },
  { name: 'line height', css: 'line-height' },
  { name: 'letter spacing', css: 'letter-spacing' },
  { name: 'typeface', css: 'font-family' },
  { name: 'colour', css: 'color' },
  { name: 'background', css: 'background-color' },
  { name: 'padding', css: 'padding' },
  { name: 'margin', css: 'margin' },
  { name: 'gap', css: 'gap' },
  { name: 'corners', css: 'border-radius' },
  { name: 'width', css: 'width' },
  { name: 'height', css: 'height' },
  { name: 'opacity', css: 'opacity' },
  { name: 'shadow', css: 'box-shadow' },
] as const;

const cssOf = (prop: string) => TWEAKS.find((t) => t.name === prop)?.css;

// One pixel to turn any CSS colour (oklch, color-mix, a name) into sRGB.
let pixel: CanvasRenderingContext2D | null | undefined;
function rgba(value: string): [number, number, number, number] | null {
  if (pixel === undefined) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 1;
    pixel = canvas.getContext('2d', { willReadFrequently: true });
  }
  if (!pixel || !value || !CSS.supports('color', value)) return null;
  pixel.clearRect(0, 0, 1, 1);
  pixel.fillStyle = '#000';
  pixel.fillStyle = value;
  pixel.fillRect(0, 0, 1, 1);
  const [r, g, b, a] = pixel.getImageData(0, 0, 1, 1).data;
  return [r, g, b, a];
}

/** A colour as #rrggbb, with its opacity when it has one, or "transparent" when it is fully see-through. */
export function hex(value: string): string {
  const c = rgba(value);
  if (!c) return value;
  if (c[3] === 0) return 'transparent';
  const code = `#${c
    .slice(0, 3)
    .map((n) => n.toString(16).padStart(2, '0'))
    .join('')}`;
  return c[3] < 255 ? `${code} at ${Math.round((c[3] / 255) * 100)}%` : code;
}

// The custom properties the app's stylesheets define, found once.
let names: string[] | null = null;
function tokenNames(): string[] {
  if (names) return names;
  const found = new Set<string>();
  const walk = (rules: CSSRuleList) => {
    for (const rule of Array.from(rules)) {
      if (rule instanceof CSSStyleRule) for (const name of Array.from(rule.style)) if (name.startsWith('--') && !name.startsWith('--tw-')) found.add(name);
      if ('cssRules' in rule && (rule as CSSGroupingRule).cssRules) walk((rule as CSSGroupingRule).cssRules);
    }
  };
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      walk(sheet.cssRules);
    } catch {
      // Another origin's stylesheet: its rules can't be read.
    }
  }
  // Shorter names first: --ink before --color-ink.
  names = [...found].sort((a, b) => a.length - b.length || a.localeCompare(b));
  return names;
}

/** The tokens whose colour is this one, where the element is (a room may set its own). At most two. */
function tokensFor(value: string, style: CSSStyleDeclaration): string[] {
  const want = hex(value);
  if (want === 'transparent' || want === value) return [];
  const out: string[] = [];
  for (const name of tokenNames()) {
    const raw = style.getPropertyValue(name).trim();
    if (raw && hex(raw) === want) out.push(name);
    if (out.length === 2) break;
  }
  return out;
}

/** A colour for a person and for Claude: "#c86d51 (`--accent`)". */
export function colourOf(value: string, style: CSSStyleDeclaration): string {
  const code = hex(value);
  const tokens = tokensFor(value, style);
  return tokens.length ? `${code} (${tokens.map((t) => `\`${t}\``).join(' / ')})` : code;
}

const round = (value: string) => {
  const n = parseFloat(value);
  return Number.isFinite(n) ? `${Math.round(n * 2) / 2}` : value;
};

/** Four sides the short way: "16", "8 16" or "8 16 12 16" (px). */
export function sides(top: string, right: string, bottom: string, left: string): string {
  const [t, r, b, l] = [top, right, bottom, left].map(round);
  if (t === r && r === b && b === l) return t === '0' ? '0' : `${t}px`;
  if (t === b && r === l) return `${t}px ${r}px`;
  return `${t}px ${r}px ${b}px ${l}px`;
}

function corners(cs: CSSStyleDeclaration): string {
  const all = [cs.borderTopLeftRadius, cs.borderTopRightRadius, cs.borderBottomRightRadius, cs.borderBottomLeftRadius];
  if (all.every((v) => parseFloat(v) >= 999)) return 'round (pill)';
  return sides(all[0], all[1], all[2], all[3]);
}

const firstFamily = (family: string) => family.split(',')[0].replace(/["']/g, '').trim();

function typeOf(cs: CSSStyleDeclaration): string {
  const spacing = cs.letterSpacing === 'normal' ? '' : `, letter spacing ${cs.letterSpacing}`;
  return `${firstFamily(cs.fontFamily)} ${round(cs.fontSize)}px / ${cs.lineHeight === 'normal' ? 'normal' : `${round(cs.lineHeight)}px`}, weight ${cs.fontWeight}${spacing}`;
}

/** The React components around the element, nearest last ("PlanPitch › Perks"), in the dev server only. */
function componentOf(el: Element): string | undefined {
  if (!import.meta.env.DEV) return undefined;
  const key = Object.keys(el).find((k) => k.startsWith('__reactFiber$'));
  type Fiber = { type: unknown; return: Fiber | null };
  let fiber = key ? ((el as unknown as Record<string, Fiber>)[key] ?? null) : null;
  const found: string[] = [];
  while (fiber && found.length < 2) {
    const type = fiber.type as { displayName?: string; name?: string; render?: { displayName?: string; name?: string } } | null;
    const name = type && (typeof type === 'function' || typeof type === 'object') ? (type.displayName ?? type.name ?? type.render?.displayName ?? type.render?.name) : undefined;
    if (name && /^[A-Z]/.test(name) && !/^(Motion|Suspense|Fragment|Presence|PopChild|LayoutGroup)/.test(name) && !found.includes(name)) found.unshift(name);
    fiber = fiber.return;
  }
  return found.length ? found.join(' › ') : undefined;
}

const clip = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text);

/** What the element is, written down by itself. */
export function factsOf(el: Element): ElementFacts {
  const cs = getComputedStyle(el);
  const r = el.getBoundingClientRect();
  const layout = cs.display.includes('flex') || cs.display.includes('grid');
  const borderWidth = parseFloat(cs.borderTopWidth);
  const classes = typeof el.className === 'string' ? el.className : (el.getAttribute('class') ?? '');
  return {
    tag: el.tagName.toLowerCase(),
    component: componentOf(el),
    classes: clip(classes.replace(/\s+/g, ' ').trim(), 220),
    size: `${Math.round(r.width)} × ${Math.round(r.height)}`,
    type: typeOf(cs),
    colour: colourOf(cs.color, cs),
    background: colourOf(cs.backgroundColor, cs),
    border: borderWidth > 0 ? `${round(cs.borderTopWidth)}px ${colourOf(cs.borderTopColor, cs)}` : undefined,
    padding: sides(cs.paddingTop, cs.paddingRight, cs.paddingBottom, cs.paddingLeft),
    margin: sides(cs.marginTop, cs.marginRight, cs.marginBottom, cs.marginLeft),
    gap: layout && cs.rowGap !== 'normal' ? (cs.rowGap === cs.columnGap ? `${round(cs.rowGap)}px` : `${round(cs.rowGap)}px ${round(cs.columnGap)}px`) : undefined,
    corners: corners(cs),
  };
}

/** A tweak's value now, as the card shows it. */
export function valueNow(el: Element, prop: string): string {
  const cs = getComputedStyle(el);
  switch (prop) {
    case 'colour':
      return colourOf(cs.color, cs);
    case 'background':
      return colourOf(cs.backgroundColor, cs);
    case 'padding':
      return sides(cs.paddingTop, cs.paddingRight, cs.paddingBottom, cs.paddingLeft);
    case 'margin':
      return sides(cs.marginTop, cs.marginRight, cs.marginBottom, cs.marginLeft);
    case 'corners':
      return corners(cs);
    case 'typeface':
      return firstFamily(cs.fontFamily);
    case 'width':
    case 'height':
      return `${Math.round(prop === 'width' ? el.getBoundingClientRect().width : el.getBoundingClientRect().height)}px`;
    default: {
      const css = cssOf(prop);
      return css ? cs.getPropertyValue(css).trim() : '';
    }
  }
}

/** A typed value as CSS: bare numbers become px where the property wants a length, "--token" becomes var(--token). */
export function asCss(prop: string, want: string): string {
  const value = want.trim().replace(/`/g, '');
  if (/^--[\w-]+$/.test(value)) return `var(${value})`;
  if (prop === 'typeface') return value;
  if (prop === 'weight' || prop === 'opacity' || prop === 'line height') return value;
  return value.replace(/(^|\s)(-?\d*\.?\d+)(?=\s|$)/g, (_, space: string, n: string) => `${space}${n === '0' ? '0' : `${n}px`}`);
}

/** Shows the wanted values on the element, inline and important; the function it returns puts it back. */
export function preview(el: Element, tweaks: Array<{ prop: string; want: string }>): () => void {
  if (!(el instanceof HTMLElement || el instanceof SVGElement)) return () => {};
  const before: Array<[string, string, string]> = [];
  for (const t of tweaks) {
    const css = cssOf(t.prop);
    if (!css || !t.want.trim()) continue;
    before.push([css, el.style.getPropertyValue(css), el.style.getPropertyPriority(css)]);
    el.style.setProperty(css, asCss(t.prop, t.want), 'important');
  }
  return () => {
    for (const [css, value, priority] of before.reverse()) {
      if (value) el.style.setProperty(css, value, priority);
      else el.style.removeProperty(css);
    }
  };
}

const pickable = (el: Element | null): el is Element => Boolean(el) && el!.tagName !== 'BODY' && el!.tagName !== 'HTML' && !el!.closest('[data-design-notes]');

/**
 * The element around (up) or inside (down) the chosen one. `trail` runs from the innermost element reached so far
 * out to the outermost; `level` is the chosen one's place in it. Going down past the innermost takes the child under
 * `point` (else the first child). Null when there is nowhere to go.
 */
export function climb(trail: Element[], level: number, dir: 'up' | 'down', point?: { x: number; y: number }): { trail: Element[]; level: number } | null {
  if (dir === 'up') {
    if (level + 1 < trail.length) return { trail, level: level + 1 };
    const parent = trail[trail.length - 1]?.parentElement ?? null;
    return pickable(parent) ? { trail: [...trail, parent], level: level + 1 } : null;
  }
  if (level > 0) return { trail, level: level - 1 };
  const children = Array.from(trail[0]?.children ?? []).filter(pickable);
  const under = point && children.find((c) => {
    const r = c.getBoundingClientRect();
    return point.x >= r.left && point.x <= r.right && point.y >= r.top && point.y <= r.bottom;
  });
  const child = under ?? children[0];
  return child ? { trail: [child, ...trail], level: 0 } : null;
}

/** A spot or area given as fractions of one element, given again as fractions of another (both measured now). */
export function moveFractions(area: { x: number; y: number; w: number; h: number }, from: DOMRect, to: DOMRect): { x: number; y: number; w: number; h: number } {
  const w = to.width || 1;
  const h = to.height || 1;
  return {
    x: (from.left + area.x * from.width - to.left) / w,
    y: (from.top + area.y * from.height - to.top) / h,
    w: (area.w * from.width) / w,
    h: (area.h * from.height) / h,
  };
}

/** The words of an element a note can rewrite: its visible text, when it has some and isn't a whole page of it. */
export function wordsOf(el: Element): string | null {
  const text = ((el as HTMLElement).innerText ?? el.textContent ?? '').trim();
  return text && text.length <= 400 ? text : null;
}
