// Every node as SVG markup in its own coordinates (its top-left at 0, 0). The editor and the exports both draw with it.
import { ICONS } from './iconData';
import { fontStack } from './library';
import { bounds, union } from './model';
import type { Doc, LineNode, PathNode, PinNode, SNode, TextStyle, WidgetNode } from './model';

export const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const PRIORITY_COLOUR: Record<string, string> = { Must: '#e11d48', Should: '#d97706', Could: '#0284c7' };
export const PIN = 28;

const r = (n: number) => Math.round(n * 100) / 100;

export const textCss = (s: TextStyle, auto: boolean) =>
  `font-family:${esc(fontStack(s.font))};font-size:${s.size}px;font-weight:${s.weight};line-height:${s.lineHeight};color:${s.color};text-align:${s.align};${s.italic ? 'font-style:italic;' : ''}white-space:${auto ? 'pre' : 'pre-wrap'};overflow-wrap:break-word;margin:0;`;

const html = (w: number, h: number, css: string, body: string, x = 0, y = 0) =>
  `<foreignObject x="${r(x)}" y="${r(y)}" width="${r(Math.max(w, 1))}" height="${r(Math.max(h, 1))}" style="overflow:visible"><div xmlns="http://www.w3.org/1999/xhtml" style="${css}">${esc(body)}</div></foreignObject>`;

const label = (s: string, x: number, y: number, opts: { size?: number; weight?: number; anchor?: string; fill?: string } = {}) =>
  `<text x="${r(x)}" y="${r(y)}" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" font-size="${opts.size ?? 13}" font-weight="${opts.weight ?? 500}" fill="${opts.fill ?? '#475569'}" text-anchor="${opts.anchor ?? 'start'}" dominant-baseline="central">${esc(s)}</text>`;

const box = (w: number, h: number, rad: number, fill: string, stroke: string, extra = '') => `<rect x="0.5" y="0.5" width="${r(Math.max(w - 1, 0))}" height="${r(Math.max(h - 1, 0))}" rx="${rad}" fill="${fill}" stroke="${stroke}" stroke-width="1" ${extra}/>`;

const bar = (x: number, y: number, w: number, h: number, fill = '#cbd5e1') => `<rect x="${r(x)}" y="${r(y)}" width="${r(Math.max(w, 0))}" height="${r(h)}" rx="${r(h / 2)}" fill="${fill}"/>`;

function widgetSvg(n: WidgetNode): string {
  const { w, h } = n;
  const st = n.stroke ?? '#94a3b8';
  const soft = n.fill ?? '#f1f5f9';
  const name = n.label;
  switch (n.widget) {
    case 'button':
      return box(w, h, n.radius ?? Math.min(h / 2, 10), n.fill ?? '#e2e8f0', st) + label(name, w / 2, h / 2, { anchor: 'middle', weight: 600, fill: '#334155' });
    case 'input':
    case 'search': {
      const icon = n.widget === 'search' ? `<circle cx="18" cy="${h / 2 - 1}" r="6" fill="none" stroke="#94a3b8" stroke-width="1.6"/><path d="M22.5 ${h / 2 + 3.5}l4 4" stroke="#94a3b8" stroke-width="1.6"/>` : '';
      return box(w, h, n.radius ?? 8, n.fill ?? '#ffffff', st) + icon + label(name, n.widget === 'search' ? 36 : 14, h / 2, { fill: '#94a3b8', weight: 400 });
    }
    case 'card':
      return box(w, h, n.radius ?? 12, n.fill ?? '#f8fafc', st) + label(name, 16, 22, { weight: 600 }) + bar(16, 44, Math.min(w - 32, 180), 8) + bar(16, 60, Math.min(w - 32, 120), 8, '#e2e8f0');
    case 'nav': {
      const dots = [0, 1, 2].map((i) => bar(w - 40 - i * 72, h / 2 - 4, 52, 8)).join('');
      return box(w, h, n.radius ?? 0, soft, st) + label(name, 20, h / 2, { weight: 600 }) + (w > 320 ? dots : '');
    }
    case 'sidebar': {
      const rows = Array.from({ length: Math.max(0, Math.min(10, Math.floor((h - 64) / 44))) }, (_, i) => `<circle cx="28" cy="${76 + i * 44}" r="7" fill="#cbd5e1"/>` + bar(44, 72 + i * 44, Math.min(w - 64, 120), 8)).join('');
      return box(w, h, n.radius ?? 0, soft, st) + label(name, 20, 32, { weight: 600 }) + rows;
    }
    case 'tabbar': {
      const k = 4;
      const tabs = Array.from({ length: k }, (_, i) => `<circle cx="${r(((i + 0.5) * w) / k)}" cy="${r(h / 2 - 8)}" r="9" fill="${i ? '#cbd5e1' : '#64748b'}"/>` + bar(((i + 0.5) * w) / k - 16, h / 2 + 8, 32, 6)).join('');
      return box(w, h, n.radius ?? 0, soft, st) + tabs;
    }
    case 'list': {
      const rows = Array.from({ length: Math.max(1, Math.floor((h - 36) / 48)) }, (_, i) => {
        const y = 36 + i * 48;
        return `<circle cx="28" cy="${y + 20}" r="12" fill="#e2e8f0"/>` + bar(52, y + 12, Math.min(w - 84, 200), 7) + bar(52, y + 25, Math.min(w - 84, 120), 6, '#e2e8f0') + (i ? `<line x1="16" x2="${w - 16}" y1="${y}" y2="${y}" stroke="#e2e8f0"/>` : '');
      }).join('');
      return box(w, h, n.radius ?? 12, n.fill ?? '#ffffff', st) + label(name, 16, 18, { weight: 600 }) + rows;
    }
    case 'table': {
      const cols = Math.max(2, Math.min(6, Math.floor(w / 140)));
      const rows = Math.max(1, Math.floor((h - 40) / 40));
      let s = box(w, h, n.radius ?? 8, n.fill ?? '#ffffff', st) + `<rect x="1" y="1" width="${w - 2}" height="39" fill="#f1f5f9"/>` + label(name, 14, 20, { weight: 600 });
      for (let i = 1; i <= rows; i++) s += `<line x1="0" x2="${w}" y1="${40 * i}" y2="${40 * i}" stroke="#e2e8f0"/>` + Array.from({ length: cols }, (_, c) => bar(14 + (c * w) / cols, 40 * i + 16, Math.min(w / cols - 40, 90), 7)).join('');
      return s;
    }
    case 'image':
    case 'video': {
      const play = n.widget === 'video' ? `<circle cx="${w / 2}" cy="${h / 2}" r="22" fill="#ffffff" stroke="${st}"/><path d="M${w / 2 - 6} ${h / 2 - 9}l15 9-15 9z" fill="#64748b"/>` : '';
      return box(w, h, n.radius ?? 8, n.fill ?? '#e2e8f0', st) + `<path d="M0 0L${w} ${h}M${w} 0L0 ${h}" stroke="#cbd5e1"/>` + play + label(name, 12, 16, { size: 12 });
    }
    case 'chart': {
      const k = 8;
      const bars = Array.from({ length: k }, (_, i) => {
        const bh = (h - 70) * (0.3 + 0.7 * Math.abs(Math.sin(i * 1.7 + 1)));
        return `<rect x="${r(30 + (i * (w - 50)) / k)}" y="${r(h - 24 - bh)}" width="${r((w - 50) / k - 10)}" height="${r(bh)}" rx="3" fill="${i === 5 ? '#64748b' : '#cbd5e1'}"/>`;
      }).join('');
      return box(w, h, n.radius ?? 12, n.fill ?? '#ffffff', st) + label(name, 16, 20, { weight: 600 }) + `<line x1="24" x2="${w - 16}" y1="${h - 24}" y2="${h - 24}" stroke="#94a3b8"/>` + bars;
    }
    case 'heading':
      return `<rect width="${w}" height="${h}" fill="transparent"/>` + label(name, 0, h / 2, { size: Math.max(12, h * 0.6), weight: 700, fill: '#334155' });
    case 'text': {
      const k = Math.max(1, Math.floor(h / 18));
      return `<rect width="${w}" height="${h}" fill="transparent"/>` + Array.from({ length: k }, (_, i) => bar(0, i * 18 + 4, i === k - 1 ? w * 0.6 : w, 8)).join('');
    }
    case 'toggle':
      return `<rect width="${w}" height="${h}" rx="${h / 2}" fill="#64748b"/><circle cx="${w - h / 2}" cy="${h / 2}" r="${h / 2 - 3}" fill="#ffffff"/>`;
    case 'checkbox':
      return `<rect width="${w}" height="${h}" fill="transparent"/><rect x="1" y="${h / 2 - 9}" width="18" height="18" rx="4" fill="#ffffff" stroke="#64748b" stroke-width="1.5"/><path d="M5 ${h / 2}l3.5 3.5 6.5-7" fill="none" stroke="#64748b" stroke-width="2"/>` + label(name, 28, h / 2);
    case 'slider':
      return `<rect width="${w}" height="${h}" fill="transparent"/>` + bar(0, h / 2 - 3, w, 6) + bar(0, h / 2 - 3, w * 0.4, 6, '#64748b') + `<circle cx="${w * 0.4}" cy="${h / 2}" r="${Math.min(h / 2, 10)}" fill="#ffffff" stroke="#64748b" stroke-width="2"/>`;
    case 'chip':
      return box(w, h, h / 2, n.fill ?? '#f1f5f9', st) + label(name, w / 2, h / 2, { anchor: 'middle', size: 12 });
    case 'avatar':
      return `<ellipse cx="${w / 2}" cy="${h / 2}" rx="${w / 2 - 0.5}" ry="${h / 2 - 0.5}" fill="#e2e8f0" stroke="${st}"/>` + label(name.charAt(0).toUpperCase(), w / 2, h / 2, { anchor: 'middle', weight: 700, size: Math.max(10, Math.min(w, h) * 0.38) });
    case 'modal':
      return box(w, h, n.radius ?? 16, '#ffffff', st, 'style="filter:drop-shadow(0 8px 24px rgba(15,23,42,.18))"') + label(name, 24, 30, { weight: 700, size: 16 }) + bar(24, 56, Math.min(w - 48, 280), 8, '#e2e8f0') + `<rect x="${w - 232}" y="${h - 60}" width="96" height="36" rx="8" fill="#f1f5f9"/><rect x="${w - 124}" y="${h - 60}" width="100" height="36" rx="8" fill="#64748b"/>`;
    case 'tabs': {
      const k = Math.max(2, Math.min(5, Math.floor(w / 90)));
      return `<rect width="${w}" height="${h}" fill="transparent"/><line x1="0" x2="${w}" y1="${h - 1}" y2="${h - 1}" stroke="#e2e8f0" stroke-width="2"/>` + Array.from({ length: k }, (_, i) => bar((i * w) / k + 16, h / 2 - 4, w / k - 32, 8, i ? '#e2e8f0' : '#94a3b8')).join('') + `<rect x="0" y="${h - 3}" width="${w / k}" height="3" fill="#64748b"/>`;
    }
    default:
      return box(w, h, n.radius ?? 6, n.fill ?? 'rgba(148,163,184,.12)', st, 'stroke-dasharray="6 4"') + label(name, w / 2, h / 2, { anchor: 'middle' });
  }
}

const head = (x: number, y: number, angle: number, size: number) => {
  const a1 = angle + Math.PI * 0.84, a2 = angle - Math.PI * 0.84;
  return `M${r(x + Math.cos(a1) * size)} ${r(y + Math.sin(a1) * size)}L${r(x)} ${r(y)}L${r(x + Math.cos(a2) * size)} ${r(y + Math.sin(a2) * size)}`;
};

function lineSvg(n: LineNode): string {
  const sw = n.strokeWidth;
  const angle = Math.atan2(n.h, n.w);
  const size = Math.max(9, sw * 3.2);
  const end = (kind: string | undefined, x: number, y: number, a: number) =>
    kind === 'arrow' ? `<path d="${head(x, y, a, size)}" fill="none" stroke="${n.stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/>` : kind === 'dot' ? `<circle cx="${r(x)}" cy="${r(y)}" r="${r(sw * 1.8 + 1)}" fill="${n.stroke}"/>` : '';
  return `<line x1="0" y1="0" x2="${r(n.w)}" y2="${r(n.h)}" stroke="${n.stroke}" stroke-width="${sw}" stroke-linecap="round"${n.dash ? ` stroke-dasharray="${sw * 3} ${sw * 2.5}"` : ''}/>` + end(n.end, n.w, n.h, angle) + end(n.start, 0, 0, angle + Math.PI);
}

/** A pen stroke, smoothed through the midpoints. */
export function pathD(points: number[], kx = 1, ky = 1): string {
  if (points.length < 4) return points.length === 2 ? `M${r(points[0] * kx)} ${r(points[1] * ky)}l0.01 0` : '';
  let d = `M${r(points[0] * kx)} ${r(points[1] * ky)}`;
  for (let i = 2; i < points.length - 2; i += 2) {
    const x = points[i] * kx, y = points[i + 1] * ky;
    const mx = (x + points[i + 2] * kx) / 2, my = (y + points[i + 3] * ky) / 2;
    d += `Q${r(x)} ${r(y)} ${r(mx)} ${r(my)}`;
  }
  return d + `L${r(points[points.length - 2] * kx)} ${r(points[points.length - 1] * ky)}`;
}

const pathSvg = (n: PathNode) =>
  `<path d="${pathD(n.points, n.bw ? n.w / n.bw : 1, n.bh ? n.h / n.bh : 1)}" fill="none" stroke="${n.stroke}" stroke-width="${n.strokeWidth}" stroke-linecap="round" stroke-linejoin="round"${n.highlight ? ' stroke-opacity="0.38"' : ''}/>`;

function pinSvg(n: PinNode, notesText: boolean): string {
  const c = n.done ? '#94a3b8' : (PRIORITY_COLOUR[n.priority ?? ''] ?? '#7c3aed');
  const mid = PIN / 2;
  let s = `<circle cx="${mid}" cy="${mid}" r="${mid - 1}" fill="${c}" stroke="#ffffff" stroke-width="2"/>` + label(n.done ? '✓' : String(n.n), mid, mid + 0.5, { anchor: 'middle', weight: 700, fill: '#ffffff', size: 13 });
  if (notesText && n.text.trim())
    s += html(240, 10, `display:inline-block;max-width:240px;padding:6px 9px;border-radius:9px;background:#ffffff;color:#0f172a;font:500 12.5px/1.4 system-ui,-apple-system,'Segoe UI',sans-serif;box-shadow:0 2px 10px rgba(15,23,42,.18);border-left:3px solid ${c};white-space:pre-wrap;`, n.text.trim(), PIN + 6, 0);
  return s;
}

export interface DrawOptions {
  asset: (id: string) => string | undefined;
  notesText: boolean;
}

/** One node's drawing, with its top-left at 0, 0. */
export function nodeSvg(n: SNode, o: DrawOptions): string {
  switch (n.type) {
    case 'frame':
      return `<rect width="${r(n.w)}" height="${r(n.h)}" rx="${n.radius ?? 0}" fill="${n.fill ?? '#ffffff'}"${n.stroke ? ` stroke="${n.stroke}" stroke-width="${n.strokeWidth ?? 1}"` : ''}/>`;
    case 'rect':
    case 'ellipse': {
      const paint = `fill="${n.fill ?? 'none'}"${n.stroke ? ` stroke="${n.stroke}" stroke-width="${n.strokeWidth ?? 1}"${n.dash ? ` stroke-dasharray="${(n.strokeWidth ?? 1) * 4} ${(n.strokeWidth ?? 1) * 3}"` : ''}` : ''}`;
      return n.type === 'rect' ? `<rect width="${r(n.w)}" height="${r(n.h)}" rx="${n.radius ?? 0}" ${paint}/>` : `<ellipse cx="${r(n.w / 2)}" cy="${r(n.h / 2)}" rx="${r(n.w / 2)}" ry="${r(n.h / 2)}" ${paint}/>`;
    }
    case 'line':
      return lineSvg(n);
    case 'path':
      return pathSvg(n);
    case 'text':
      return `<rect width="${r(n.w)}" height="${r(n.h)}" fill="transparent"/>` + html(n.w, n.h, textCss(n, n.auto) + 'width:' + (n.auto ? 'max-content' : `${r(n.w)}px`), n.text);
    case 'sticky':
      return `<rect width="${r(n.w)}" height="${r(n.h)}" rx="4" fill="${n.fill}" style="filter:drop-shadow(0 2px 4px rgba(15,23,42,.18))"/>` + html(n.w - 28, n.h - 28, `font:500 16px/1.4 system-ui,-apple-system,'Segoe UI',sans-serif;color:#1f2937;white-space:pre-wrap;overflow-wrap:break-word;width:${r(n.w - 28)}px;`, n.text, 14, 14);
    case 'pin':
      return pinSvg(n, o.notesText);
    case 'image': {
      const href = o.asset(n.asset);
      const c = n.crop ?? { x: 0, y: 0, w: n.nw, h: n.nh };
      if (!href) return `<rect width="${r(n.w)}" height="${r(n.h)}" fill="#e2e8f0"/>` + label('Picture missing', 12, 16);
      return `<svg width="${r(n.w)}" height="${r(n.h)}" viewBox="${r(c.x)} ${r(c.y)} ${r(c.w)} ${r(c.h)}" preserveAspectRatio="none" overflow="hidden"><image href="${href}" width="${n.nw}" height="${n.nh}" preserveAspectRatio="none"/></svg>`;
    }
    case 'widget':
      return widgetSvg(n);
    case 'icon':
      return `<rect width="${r(n.w)}" height="${r(n.h)}" fill="transparent"/><svg width="${r(n.w)}" height="${r(n.h)}" viewBox="0 0 24 24" fill="none" stroke="${n.color}" stroke-width="${n.strokeWidth ?? 2}" stroke-linecap="round" stroke-linejoin="round">${ICONS[n.icon] ?? ''}</svg>`;
  }
}

/** The nearest frame around a node that cuts off what spills out of it. */
export const clipFrame = (nodes: SNode[], n: SNode) => {
  for (let p = n.parent; p; ) {
    const f = nodes.find((m) => m.id === p);
    if (!f) return;
    if (f.type === 'frame' && f.clip) return f;
    p = f.parent;
  }
};

/** The whole canvas, or some of it, as one SVG file. */
export function toSvg(doc: Doc, only?: Set<string>, background = '#f4f4f5', pad = 40): { svg: string; w: number; h: number } {
  const all = doc.nodes.filter((n) => !n.hidden);
  const chosen = only ? all.filter((n) => only.has(n.id)) : all;
  const area = union(chosen.map((n) => (n.type === 'pin' ? { x: n.x, y: n.y, w: n.w + (doc.settings?.notesText && n.text ? 260 : 0), h: n.h + 20 } : bounds(n)))) ?? { x: 0, y: 0, w: 100, h: 100 };
  const x = Math.floor(area.x - pad), y = Math.floor(area.y - pad), w = Math.ceil(area.w + pad * 2), h = Math.ceil(area.h + pad * 2);
  const opts: DrawOptions = { asset: (id) => doc.assets[id], notesText: doc.settings?.notesText ?? true };
  const clips = new Set<string>();
  let body = '';
  for (const n of chosen) {
    const f = clipFrame(doc.nodes, n);
    if (f) clips.add(f.id);
    body += `<g${f ? ` clip-path="url(#c-${f.id})"` : ''}><g transform="translate(${r(n.x)} ${r(n.y)})"${n.opacity !== undefined && n.opacity < 1 ? ` opacity="${n.opacity}"` : ''}>${nodeSvg(n, opts)}</g></g>`;
  }
  const defs = [...clips].map((id) => {
    const f = doc.nodes.find((n) => n.id === id)!;
    return `<clipPath id="c-${id}"><rect x="${f.x}" y="${f.y}" width="${f.w}" height="${f.h}" rx="${(f as { radius?: number }).radius ?? 0}"/></clipPath>`;
  });
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${w}" height="${h}" viewBox="${x} ${y} ${w} ${h}"><defs>${defs.join('')}</defs>${background !== 'none' ? `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${background}"/>` : ''}${body}</svg>`;
  return { svg, w, h };
}

/** The SVG drawn into a PNG, twice the size for sharp text. */
export async function toPng(doc: Doc, only?: Set<string>, scale = 2): Promise<Blob> {
  const { svg, w, h } = toSvg(doc, only);
  const img = new Image();
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  await img.decode();
  const k = Math.min(scale, 16000 / Math.max(w, h));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(w * k);
  canvas.height = Math.round(h * k);
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('The picture could not be made'))), 'image/png'));
}
