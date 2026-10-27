// The brief: the canvas written out as Markdown for an AI model (or a person) to build from. Notes first, by priority,
// then each frame's contents with positions relative to the frame. FORMAT.md explains how to read it.
import { DEVICES } from './library';
import { bounds, label, PRIORITIES, VERSION } from './model';
import type { Doc, FrameNode, PinNode, SNode } from './model';

const px = (n: number) => Math.round(n);

/** The outermost frame around a node. */
const topFrame = (nodes: SNode[], n: SNode): FrameNode | undefined => {
  let found: FrameNode | undefined;
  for (let p = n.parent; p; ) {
    const f = nodes.find((m) => m.id === p);
    if (!f) break;
    if (f.type === 'frame') found = f;
    p = f.parent;
  }
  return found;
};

const where = (nodes: SNode[], n: SNode) => {
  const f = topFrame(nodes, n);
  const b = bounds(n);
  return { frame: f, x: px(b.x - (f?.x ?? 0)), y: px(b.y - (f?.y ?? 0)), w: px(b.w), h: px(b.h) };
};

export const priorityCount = (pins: PinNode[]) =>
  PRIORITIES.map((p) => [p, pins.filter((n) => !n.done && n.priority === p).length] as const)
    .filter(([, k]) => k)
    .map(([p, k]) => `${p} ${k}`)
    .join(' · ');

const describe = (n: SNode): string => {
  switch (n.type) {
    case 'text':
      return `Text “${n.text.replace(/\n/g, ' / ')}” · ${n.font} ${n.size}/${n.weight}${n.italic ? ' italic' : ''} · ${n.color} · ${n.align}`;
    case 'sticky':
      return `Sticky note “${n.text.replace(/\n/g, ' / ')}”`;
    case 'widget':
      return `${n.widget} outline “${n.label}”`;
    case 'icon':
      return `Icon \`${n.icon}\` (Lucide) · ${n.color}`;
    case 'image':
      return n.crop ? `Cut-out of a picture${n.source ? ` (${n.source})` : ''}` : n.source ? `Screenshot of ${n.source}` : `Picture${n.name ? ` “${n.name}”` : ''}`;
    case 'line':
      return `${label(n)} · ${n.stroke} ${n.strokeWidth}px${n.dash ? ' dashed' : ''}`;
    case 'path':
      return `${label(n)} (freehand) · ${n.stroke}`;
    case 'rect':
    case 'ellipse':
      return `${n.type === 'rect' ? 'Rectangle' : 'Ellipse'}${n.name ? ` “${n.name}”` : ''}${n.fill && n.fill !== 'none' ? ` · fill ${n.fill}` : ''}${n.stroke ? ` · stroke ${n.stroke} ${n.strokeWidth ?? 1}px` : ''}${n.radius ? ` · corners ${n.radius}` : ''}`;
    case 'frame':
      return `Frame “${label(n)}”`;
    case 'pin':
      return `Note ${n.n}`;
  }
};

/** Markdown for an AI model: what to change (the notes) and what the layout should be (the frames). */
export function toBrief(doc: Doc, picture?: string): string {
  const nodes = doc.nodes.filter((n) => !n.hidden);
  const pins = nodes.filter((n): n is PinNode => n.type === 'pin').sort((a, b) => a.n - b.n);
  const open = pins.filter((p) => !p.done);
  const order = (p: PinNode) => (p.priority ? PRIORITIES.indexOf(p.priority) : 3);
  const lines: string[] = [];
  const counted = priorityCount(pins);
  lines.push(`# ${doc.title}: design brief`, '');
  lines.push(`Made with Sandesigner ${VERSION} on ${new Date().toISOString().slice(0, 10)}. ${open.length} open ${open.length === 1 ? 'note' : 'notes'}${counted ? ` (${counted})` : ''}.`);
  if (picture) lines.push(`The picture \`${picture}\` shows the canvas; the numbered circles are the notes below.`);
  lines.push('', 'How to read this: positions are x, y from the top-left of the frame they are in, then width × height, in CSS pixels. Screenshots show the app as it is now; what is drawn on top of them shows what is wanted. Outlines (“button outline”, “card outline” …) are placeholders for real components.', '');

  if (pins.length) {
    lines.push('## Notes', '');
    for (const p of [...open].sort((a, b) => order(a) - order(b) || a.n - b.n).concat(pins.filter((p) => p.done))) {
      const at = where(doc.nodes, p);
      const tags = [p.done ? 'Done' : p.priority, ...p.kinds].filter(Boolean).join(' · ');
      lines.push(`${p.n}. ${tags ? `**${tags}** · ` : ''}${p.text.trim().replace(/\n/g, ' ') || '(no words yet)'}`);
      const on = p.target ? `${p.target.name}${p.target.selector ? ` (\`${p.target.selector}\`)` : ''}${p.target.component ? `, component \`${p.target.component}\`` : ''}${p.target.page ? `, on ${p.target.page}` : ''}` : '';
      lines.push(`   - At ${at.x + 14}, ${at.y + 14}${at.frame ? ` in “${label(at.frame)}”` : ''}${on ? `, on ${on}` : ''}`);
    }
    lines.push('');
  }

  const frames = nodes.filter((n): n is FrameNode => n.type === 'frame' && !n.parent);
  const inside = (f: FrameNode) => nodes.filter((n) => n.type !== 'pin' && topFrame(doc.nodes, n)?.id === f.id);
  for (const f of frames) {
    const device = DEVICES.find((d) => d.id === f.device);
    lines.push(`## Frame “${label(f)}” · ${px(f.w)} × ${px(f.h)}${device ? ` (${device.name})` : ''}${f.fill && f.fill !== '#ffffff' ? ` · background ${f.fill}` : ''}`, '');
    const list = inside(f);
    if (!list.length) lines.push('Empty.');
    for (const n of list) {
      const at = where(doc.nodes, n);
      const depth = Math.max(0, (() => {
        let d = 0;
        for (let p = n.parent; p && p !== f.id; p = doc.nodes.find((m) => m.id === p)?.parent) d++;
        return d;
      })());
      lines.push(`${'  '.repeat(depth)}- ${describe(n)} · ${at.x}, ${at.y} · ${at.w} × ${at.h}${n.opacity !== undefined && n.opacity < 1 ? ` · opacity ${n.opacity}` : ''}`);
    }
    lines.push('');
  }

  const loose = nodes.filter((n) => !n.parent && n.type !== 'frame' && n.type !== 'pin');
  if (loose.length) {
    lines.push('## Elsewhere on the canvas', '');
    for (const n of loose) {
      const b = bounds(n);
      lines.push(`- ${describe(n)} · ${px(b.x)}, ${px(b.y)} · ${px(b.w)} × ${px(b.h)}`);
    }
    lines.push('');
  }
  return lines.join('\n');
}

export const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'canvas';
