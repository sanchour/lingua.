// Sandesigner's document: a flat list of nodes (frames hold their children through `parent`), pictures kept once in
// `assets`, and nothing else. FORMAT.md describes it for people and AI models; keep the two in step.

export const VERSION = '1.1';

export const KINDS = ['Layout', 'Spacing', 'Size', 'Colour', 'Type', 'Words', 'Remove', 'Add', 'Behaviour', 'Question'] as const;
export const PRIORITIES = ['Must', 'Should', 'Could'] as const;
export type Priority = (typeof PRIORITIES)[number];

export type NodeType = 'frame' | 'rect' | 'ellipse' | 'line' | 'path' | 'text' | 'sticky' | 'pin' | 'image' | 'widget' | 'icon';

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface BaseNode extends Box {
  id: string;
  type: NodeType;
  name?: string;
  /** The frame this sits in. */
  parent?: string;
  opacity?: number;
  hidden?: boolean;
  locked?: boolean;
}

export interface Paint {
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  radius?: number;
  dash?: boolean;
}

export interface TextStyle {
  font: string;
  size: number;
  weight: number;
  color: string;
  align: 'left' | 'center' | 'right';
  lineHeight: number;
  italic?: boolean;
}

/** One element of a captured page, in the page's CSS pixels. */
export interface DomBox extends Box {
  /** As a person would name it: button “Continue”. */
  name: string;
  selector: string;
  component?: string;
  depth: number;
}

/** What a note points at, worked out when it is placed. */
export interface Target {
  name: string;
  selector?: string;
  component?: string;
  /** The page of the screenshot it is on. */
  page?: string;
}

export interface FrameNode extends BaseNode, Paint {
  type: 'frame';
  clip?: boolean;
  device?: string;
}
export interface ShapeNode extends BaseNode, Paint {
  type: 'rect' | 'ellipse';
}
/** From (x, y) to (x + w, y + h): w and h may be negative. */
export interface LineNode extends BaseNode {
  type: 'line';
  stroke: string;
  strokeWidth: number;
  start?: 'none' | 'arrow' | 'dot';
  end?: 'none' | 'arrow' | 'dot';
  dash?: boolean;
}
/** A pen stroke: `points` (x, y, x, y …) were drawn in a box of bw × bh and are stretched to w × h. */
export interface PathNode extends BaseNode {
  type: 'path';
  points: number[];
  bw: number;
  bh: number;
  stroke: string;
  strokeWidth: number;
  highlight?: boolean;
}
export interface TextNode extends BaseNode, TextStyle {
  type: 'text';
  text: string;
  /** The width follows the words; otherwise they wrap at w. */
  auto: boolean;
}
export interface StickyNode extends BaseNode {
  type: 'sticky';
  text: string;
  fill: string;
}
/** A numbered note. Its point is the box's centre. */
export interface PinNode extends BaseNode {
  type: 'pin';
  n: number;
  text: string;
  kinds: string[];
  priority?: Priority;
  done?: boolean;
  target?: Target;
}
export interface ImageNode extends BaseNode {
  type: 'image';
  asset: string;
  /** The picture's own size in pixels. */
  nw: number;
  nh: number;
  /** A cut-out: the part of the picture shown, in its pixels. */
  crop?: Box;
  /** Where it came from: a page's address, a file name. */
  source?: string;
  /** A captured page's pixels per CSS pixel; its elements are in the document's `dom`, under the asset's id. */
  scale?: number;
}
export interface WidgetNode extends BaseNode {
  type: 'widget';
  widget: string;
  label: string;
  stroke?: string;
  fill?: string;
  radius?: number;
}
export interface IconNode extends BaseNode {
  type: 'icon';
  icon: string;
  color: string;
  strokeWidth?: number;
}

export type SNode = FrameNode | ShapeNode | LineNode | PathNode | TextNode | StickyNode | PinNode | ImageNode | WidgetNode | IconNode;

export interface Doc {
  format: 'sandesign';
  version: 1;
  id: string;
  title: string;
  created: number;
  updated: number;
  nodes: SNode[];
  /** Pictures as data URLs, by id. */
  assets: Record<string, string>;
  /** A captured page's elements, by the id of its screenshot's asset. */
  dom?: Record<string, DomBox[]>;
  view?: { x: number; y: number; zoom: number };
  settings?: { grid?: boolean; snap?: boolean; notesText?: boolean };
}

export const uid = () => Math.random().toString(36).slice(2, 10);

export const newDoc = (title = 'Untitled'): Doc => ({ format: 'sandesign', version: 1, id: uid(), title, created: Date.now(), updated: Date.now(), nodes: [], assets: {}, settings: { grid: false, snap: true, notesText: true } });

/** The box a node covers, with w and h never negative. */
export const bounds = (n: Box): Box => ({ x: Math.min(n.x, n.x + n.w), y: Math.min(n.y, n.y + n.h), w: Math.abs(n.w), h: Math.abs(n.h) });

export const union = (boxes: Box[]): Box | null => {
  if (!boxes.length) return null;
  let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
  for (const b of boxes.map(bounds)) {
    x1 = Math.min(x1, b.x);
    y1 = Math.min(y1, b.y);
    x2 = Math.max(x2, b.x + b.w);
    y2 = Math.max(y2, b.y + b.h);
  }
  return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
};

export const contains = (b: Box, x: number, y: number, pad = 0) => x >= b.x - pad && x <= b.x + b.w + pad && y >= b.y - pad && y <= b.y + b.h + pad;
export const overlaps = (a: Box, b: Box) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

/** Every node inside a frame, at any depth. */
export const descendants = (nodes: SNode[], id: string): SNode[] => {
  const out: SNode[] = [];
  const walk = (pid: string) => {
    for (const n of nodes) if (n.parent === pid) out.push(n), n.type === 'frame' && walk(n.id);
  };
  walk(id);
  return out;
};

export const depthOf = (nodes: SNode[], n: SNode): number => {
  let d = 0;
  for (let p = n.parent; p; p = nodes.find((m) => m.id === p)?.parent) d++;
  return d;
};

/**
 * Puts the list in drawing order: each frame followed by its children, keeping everyone's order among their
 * siblings. Parents that no longer exist are forgotten.
 */
export const normalize = (nodes: SNode[]): SNode[] => {
  const ids = new Set(nodes.map((n) => n.id));
  const kids = new Map<string | undefined, SNode[]>();
  for (const n of nodes) {
    if (n.parent && (!ids.has(n.parent) || n.parent === n.id)) delete n.parent;
    const list = kids.get(n.parent) ?? [];
    list.push(n);
    kids.set(n.parent, list);
  }
  const out: SNode[] = [];
  const seen = new Set<string>();
  const visit = (pid: string | undefined) => {
    for (const n of kids.get(pid) ?? []) {
      if (seen.has(n.id)) continue;
      seen.add(n.id);
      out.push(n);
      if (n.type === 'frame') visit(n.id);
    }
  };
  visit(undefined);
  // A loop of parents (never made on purpose) would hide nodes: they come back at the top level.
  for (const n of nodes) if (!seen.has(n.id)) delete n.parent, out.push(n);
  return out;
};

/** The innermost frame whose box holds the point, leaving out `skip` (a node and what is inside it). */
export const frameAt = (nodes: SNode[], x: number, y: number, skip: Set<string>): FrameNode | undefined => {
  let best: FrameNode | undefined;
  let bestDepth = -1;
  for (const n of nodes) {
    if (n.type !== 'frame' || skip.has(n.id) || n.hidden || !contains(bounds(n), x, y)) continue;
    const d = depthOf(nodes, n);
    if (d >= bestDepth) (best = n), (bestDepth = d);
  }
  return best;
};

/** A copy of nodes with new ids (parents inside the copy follow), moved by dx, dy. */
export const cloneNodes = (list: SNode[], dx = 0, dy = 0): SNode[] => {
  const ids = new Map(list.map((n) => [n.id, uid()]));
  return list.map((n) => {
    const c = structuredClone(n);
    c.id = ids.get(n.id)!;
    c.x += dx;
    c.y += dy;
    if (c.parent) c.parent = ids.get(c.parent);
    return c;
  });
};

/** The smallest element of a captured page under a point given in the picture's node coordinates. */
export const domAt = (img: ImageNode, dom: DomBox[] | undefined, x: number, y: number): DomBox | undefined => {
  if (!dom?.length) return;
  const crop = img.crop ?? { x: 0, y: 0, w: img.nw, h: img.nh };
  const scale = img.scale ?? 1;
  // From the node's box to the page's CSS pixels.
  const px = (crop.x + ((x - img.x) / img.w) * crop.w) / scale;
  const py = (crop.y + ((y - img.y) / img.h) * crop.h) / scale;
  let best: DomBox | undefined;
  for (const d of dom) if (contains(d, px, py) && (!best || d.w * d.h <= best.w * best.h)) best = d;
  return best;
};

/** Where a page element sits in the picture's node coordinates. */
export const domBox = (img: ImageNode, d: Box): Box => {
  const crop = img.crop ?? { x: 0, y: 0, w: img.nw, h: img.nh };
  const s = img.scale ?? 1;
  const kx = img.w / crop.w, ky = img.h / crop.h;
  return { x: img.x + (d.x * s - crop.x) * kx, y: img.y + (d.y * s - crop.y) * ky, w: d.w * s * kx, h: d.h * s * ky };
};

export const isDoc = (v: unknown): v is Doc => typeof v === 'object' && v !== null && (v as Doc).format === 'sandesign' && Array.isArray((v as Doc).nodes);

/** Nodes are what a person would call them, for the layers and the brief. */
export const label = (n: SNode): string => {
  if (n.name) return n.name;
  switch (n.type) {
    case 'text':
    case 'sticky':
      return n.text.split('\n')[0].slice(0, 40) || (n.type === 'text' ? 'Text' : 'Sticky note');
    case 'pin':
      return `Note ${n.n}`;
    case 'widget':
      return n.label || n.widget;
    case 'icon':
      return `Icon ${n.icon}`;
    case 'image':
      return n.crop ? 'Cut-out' : n.source ? `Screenshot ${n.source}` : 'Picture';
    case 'line':
      return n.end === 'arrow' || n.start === 'arrow' ? 'Arrow' : 'Line';
    case 'path':
      return n.highlight ? 'Highlight' : 'Drawing';
    case 'rect':
      return 'Rectangle';
    case 'ellipse':
      return 'Ellipse';
    case 'frame':
      return 'Frame';
  }
};
