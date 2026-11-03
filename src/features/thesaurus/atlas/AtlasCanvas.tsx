// Draws the atlas, a compass or a tree (6-29 G2 and G4, docs/WORD-GRAPH-PLAN.md sections 2 to 4 and 6) on one canvas. Frames are drawn only
// while something moves (a draw-in, a hover fade, a zoom); at rest nothing runs. React renders it once per scene.
import { useEffect, useRef } from 'react';
import type { Ref } from 'react';
import { bendOf, cutQuad, easeOut, elbowPoints, nibOutline, type Point } from '@/core/graph/curves';
import { QUARTER_ANGLE, RING_1, RING_2, type Scene, type SceneNode } from '@/core/graph/scene';
import { motionIsReduced } from '@/design/motionPref';

const DRAW_IN = 280;
const RING_DELAY = 60;
const FADE = 150;
const ZOOM_EASE = 120;
const K_MIN = 0.35;
const K_MAX = 4;
const FIT_MAX = 1.25;
const FLY = 450;
/** The atlas draws at most this many words' labels a frame, the most common first; zooming in makes room for more. */
const LABELS_MAX = 320;

/** A token's colour with an alpha, for the washes' soft edges (a gradient to "transparent" darkens in some browsers). */
function rgba(colour: string, alpha: number): string {
  const hex = colour.replace('#', '');
  const full = hex.length === 3 ? [...hex].map((c) => c + c).join('') : hex.slice(0, 6);
  const n = Number.parseInt(full, 16);
  return Number.isNaN(n) ? colour : `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

type Tokens = Record<'bg' | 'ink' | 'soft' | 'faint' | 'line' | 'strong' | 'sage' | 'accent' | 'serif' | 'sans', string>;
function readTokens(): Tokens {
  const css = getComputedStyle(document.documentElement);
  const v = (name: string) => css.getPropertyValue(name).trim();
  return { bg: v('--bg'), ink: v('--ink'), soft: v('--ink-soft'), faint: v('--ink-faint'), line: v('--line'), strong: v('--line-strong'), sage: v('--sage'), accent: v('--accent'), serif: v('--font-serif') || 'serif', sans: v('--font-sans') || 'sans-serif' };
}

export interface AtlasCanvasHandle {
  zoom: (factor: number) => void;
  fit: () => void;
  /** Flies the camera to a node (out a little, across, in), and resolves when it is there. */
  flyTo: (id: string, k?: number) => Promise<void>;
}
export interface Camera {
  x: number;
  y: number;
  k: number;
}

export interface AtlasCanvasProps {
  scene: Scene;
  selected: string;
  onSelect: (node: SceneNode) => void;
  onOpen: (node: SceneNode) => void;
  quarterLabels: Record<'meaning' | 'form' | 'origin' | 'use', string>;
  /** A language code's name, for foreign words' notes. */
  nameOf: (code: string) => string;
  label: string;
  handle?: Ref<AtlasCanvasHandle>;
  /** Where the atlas was left, to open there again; and where it is now, to keep. */
  camera?: Camera;
  onCamera?: (camera: Camera) => void;
}

export function AtlasCanvas({ scene, selected, onSelect, onOpen, quarterLabels, nameOf, label, handle, camera, onCamera }: AtlasCanvasProps) {
  const box = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const mini = useRef<HTMLCanvasElement>(null);
  // Everything the frames read lives here, so a frame never waits on React.
  const live = useRef({ scene, selected, onSelect, onOpen, quarterLabels, nameOf, camera, onCamera });
  live.current = { scene, selected, onSelect, onOpen, quarterLabels, nameOf, camera, onCamera };
  const api = useRef<{ redraw: () => void; restart: () => void; zoom: (f: number) => void; fit: () => void; flyTo: (id: string, k?: number) => Promise<void> } | null>(null);
  const shownKey = useRef('');

  useEffect(() => {
    const el = canvas.current!, wrap = box.current!, map = mini.current!;
    const ctx = el.getContext('2d')!, mctx = map.getContext('2d')!;
    let tokens = readTokens();
    let w = 0, h = 0, dpr = 1;
    const cam = { x: 0, y: 0, k: 1 };
    let zoomTo: { k: number; at: Point; from: number; start: number } | null = null;
    let shownAt = performance.now();
    let hover = -1, hoverFrom = -1, hoverAt = 0;
    let frame = 0;
    const widths = new Map<string, number>();
    let fly: { from: Camera; to: Camera; start: number; done: () => void } | null = null;
    // Worked out once a scene: who is joined to whom (for the hover), the words most common first (for the labels).
    let adj: Array<Set<number>> = [];
    let byRank: number[] = [];
    let maxRank = 1;
    let drawn: Array<{ i: number; r: [number, number, number, number] }> = [];
    const seen = new Map<string, number>();
    let miniImage: HTMLCanvasElement | null = null;
    let miniView = { x0: 0, y0: 0, s: 1 };
    let cameraTimer = 0;
    const index = () => {
      const s = live.current.scene;
      adj = s.nodes.map(() => new Set<number>());
      for (const e of s.edges) adj[e.a].add(e.b), adj[e.b].add(e.a);
      byRank = s.nodes.map((_, i) => i).filter((i) => s.nodes[i].kind === 'word').sort((a, b) => (s.nodes[a].rank ?? Infinity) - (s.nodes[b].rank ?? Infinity) || a - b);
      maxRank = Math.max(1, ...s.nodes.map((n) => n.rank ?? 0));
      miniImage = null;
    };

    // The atlas zooms out far enough to show every word; a compass or a tree doesn't need to.
    const kMin = () => (live.current.scene.kind === 'atlas' ? 0.03 : K_MIN);
    const toScreen = (x: number, y: number): Point => [(x - cam.x) * cam.k + w / 2, (y - cam.y) * cam.k + h / 2];
    const toWorld = (sx: number, sy: number): Point => [(sx - w / 2) / cam.k + cam.x, (sy - h / 2) / cam.k + cam.y];
    const fit = () => {
      const b = live.current.scene.box;
      // A small tree is not blown up: at most a little larger than life.
      cam.k = Math.min(FIT_MAX, Math.max(kMin(), Math.min(w / (b.x1 - b.x0), h / (b.y1 - b.y0)) * 0.96));
      cam.x = (b.x0 + b.x1) / 2;
      cam.y = (b.y0 + b.y1) / 2;
    };
    const zoomAt = (factor: number, at: Point, eased: boolean) => {
      const k = Math.min(K_MAX, Math.max(kMin(), (zoomTo?.k ?? cam.k) * factor));
      if (!eased || motionIsReduced()) setZoom(k, at);
      else zoomTo = { k, at, from: cam.k, start: performance.now() };
      kick();
    };
    // Zooming keeps the point under the pointer where it is.
    const setZoom = (k: number, at: Point) => {
      const before = toWorld(at[0], at[1]);
      cam.k = k;
      const after = toWorld(at[0], at[1]);
      cam.x += before[0] - after[0];
      cam.y += before[1] - after[1];
    };

    const fontOf = (n: SceneNode, size: number) => {
      if (n.kind === 'hub' || n.kind === 'more') return `700 ${size * 0.66}px ${tokens.sans}`;
      if (n.kind === 'place') return `${size * 0.76}px ${tokens.sans}`;
      const italic = n.ghost || n.kind === 'foreign' || n.kind === 'phrase' ? 'italic ' : '';
      return `${italic}${n.kind === 'centre' ? 600 : 400} ${size}px ${tokens.serif}`;
    };
    const baseSize = (n: SceneNode) => (n.kind === 'centre' ? 30 : n.ring === 2 ? 14 : 17);
    const textOf = (n: SceneNode) => {
      const t = n.kind === 'hub' ? n.label.toUpperCase() : n.kind === 'place' && n.label.length > 44 ? `${n.label.slice(0, 43)}…` : n.label;
      return n.weak ? `${t} †` : t;
    };
    const labelBox = (n: SceneNode, [x, y]: Point, size: number) => {
      const text = textOf(n), font = fontOf(n, size), id = `${font}|${text}`;
      if (!widths.has(id)) {
        ctx.font = font;
        widths.set(id, ctx.measureText(text).width);
      }
      const tw = widths.get(id)!, gap = n.kind === 'centre' ? 22 : 10;
      const lx = n.anchor === 'start' ? x + gap : n.anchor === 'end' ? x - gap - tw : x - tw / 2;
      const ly = n.anchor === 'above' ? y - gap - size * 0.3 : n.anchor === 'below' ? y + gap + size * 0.9 : y + size * 0.35;
      return { text, font, lx, ly, tw };
    };

    const draw = () => {
      frame = 0;
      const now = performance.now();
      const { scene: s, selected: sel } = live.current;
      const reduced = motionIsReduced();
      if (zoomTo) {
        const t = easeOut((now - zoomTo.start) / ZOOM_EASE);
        setZoom(zoomTo.from + (zoomTo.k - zoomTo.from) * t, zoomTo.at);
        if (t >= 1) zoomTo = null;
      }
      if (fly) {
        // Out a little, across, in: the zoom dips in the middle of a long flight, as a map's does.
        const raw = Math.min(1, (now - fly.start) / FLY), e = raw < 0.5 ? 2 * raw * raw : 1 - (-2 * raw + 2) ** 2 / 2;
        const far = Math.min(1, Math.hypot(fly.to.x - fly.from.x, fly.to.y - fly.from.y) * fly.from.k / Math.max(w, 1));
        cam.x = fly.from.x + (fly.to.x - fly.from.x) * e;
        cam.y = fly.from.y + (fly.to.y - fly.from.y) * e;
        cam.k = Math.exp(Math.log(fly.from.k) + (Math.log(fly.to.k) - Math.log(fly.from.k)) * e - 0.5 * far * Math.sin(Math.PI * e));
        if (raw >= 1) {
          const done = fly.done;
          fly = null;
          done();
        }
      }
      const age = now - shownAt;
      const fade = easeOut((now - hoverAt) / FADE);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = tokens.bg;
      ctx.fillRect(0, 0, w, h);
      const P = s.nodes.map((n) => toScreen(n.x, n.y));
      const near = (i: number, e: { a: number; b: number }) => e.a === i || e.b === i;
      if (s.kind === 'atlas') {
        const fading = drawAtlas(P, now, reduced, fade, sel);
        drawMini();
        keepCamera();
        if (zoomTo || fly || fading || now - hoverAt < FADE) frame = requestAnimationFrame(draw);
        return;
      }
      drawn = [];

      // The rose: two dotted rings, four hairlines, the quarters named at their ends.
      if (s.kind === 'compass') {
        const [cx, cy] = toScreen(0, 0);
        ctx.lineWidth = 0.8;
        ctx.lineCap = 'round';
        for (const [r, colour, dash] of [[RING_1, tokens.strong, [1, 5]], [RING_2, tokens.line, [1, 6]]] as const) {
          ctx.strokeStyle = colour;
          ctx.setLineDash(dash as unknown as number[]);
          ctx.beginPath();
          ctx.arc(cx, cy, r * cam.k, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.setLineDash([]);
        ctx.font = `700 11.5px ${tokens.sans}`;
        ctx.textAlign = 'center';
        for (const [q, deg] of Object.entries(QUARTER_ANGLE)) {
          const r = (deg * Math.PI) / 180, c = Math.cos(r), sn = Math.sin(r);
          ctx.strokeStyle = tokens.line;
          ctx.beginPath();
          ctx.moveTo(cx + c * 40 * cam.k, cy + sn * 40 * cam.k);
          ctx.lineTo(cx + c * (RING_2 + 18) * cam.k, cy + sn * (RING_2 + 18) * cam.k);
          ctx.stroke();
          ctx.fillStyle = tokens.faint;
          ctx.fillText(live.current.quarterLabels[q as keyof typeof QUARTER_ANGLE].toUpperCase(), cx + c * (RING_2 + 36) * cam.k, cy + sn * (RING_2 + 36) * cam.k + 4);
        }
      }

      // Threads: they draw themselves out from the word when it opens, and the hovered word's darken while the rest fade.
      for (const e of s.edges) {
        const t = reduced ? 1 : easeOut((age - (e.ring === 2 ? RING_DELAY : 0)) / DRAW_IN);
        if (t <= 0) continue;
        const was = hoverFrom >= 0 && near(hoverFrom, e), is = hover >= 0 && near(hover, e);
        const emphasis = (is ? fade : 0) + (was ? 1 - fade : 0);
        const dim = hover >= 0 ? fade : hoverFrom >= 0 ? 1 - fade : 0;
        const base = e.style === 'member' ? 0.35 : e.style === 'elbow' ? 0.6 : 0.55;
        ctx.globalAlpha = (reduced ? t : 1) * (base + (0.95 - base) * emphasis) * (1 - 0.75 * dim * (1 - emphasis));
        ctx.strokeStyle = ctx.fillStyle = emphasis > 0.5 ? tokens.ink : tokens.soft;
        const a = P[e.a], b = P[e.b];
        if (e.style === 'elbow') {
          const pts = elbowPoints(a, b);
          ctx.lineWidth = 1;
          ctx.setLineDash([]);
          ctx.beginPath();
          ctx.moveTo(pts[0][0], pts[0][1]);
          // A sharp T under the parent, a rounded bend down to each child.
          ctx.lineTo(pts[1][0], pts[1][1]);
          ctx.arcTo(pts[2][0], pts[2][1], pts[3][0], pts[3][1], Math.min(10, Math.abs(pts[2][0] - pts[1][0]) / 2) || 0.01);
          const end = reduced ? 1 : t;
          ctx.lineTo(pts[3][0], pts[2][1] + (pts[3][1] - pts[2][1]) * end);
          ctx.stroke();
          continue;
        }
        const c = bendOf(a, b);
        const [c2, b2] = cutQuad(a, c, b, reduced ? 1 : t);
        // The first ring's meaning and form threads are nib strokes: fuller at the word, a point at the far end.
        if (s.kind === 'compass' && e.ring === 1 && (e.style === 'meaning' || e.style === 'form' || e.style === 'yours')) {
          const outline = nibOutline(a, c2, b2, e.style === 'form' ? 3.2 : 2.4);
          ctx.beginPath();
          ctx.moveTo(outline[0][0], outline[0][1]);
          for (const p of outline) ctx.lineTo(p[0], p[1]);
          ctx.fill();
          continue;
        }
        ctx.lineWidth = e.style === 'form' ? 1.4 : e.style === 'member' ? 0.6 : e.style === 'origin' ? 1.3 : 0.9;
        ctx.lineCap = 'round';
        ctx.setLineDash(e.style === 'origin' ? [0.1, 4] : e.style === 'use' ? [5, 4] : []);
        ctx.beginPath();
        ctx.moveTo(a[0], a[1]);
        ctx.quadraticCurveTo(c2[0], c2[1], b2[0], b2[1]);
        ctx.stroke();
      }
      ctx.setLineDash([]);

      // Words: the dot by state (never colour alone: filled, a ring, a dotted ring), the label with a paper halo.
      const labels: number[] = [];
      s.nodes.forEach((n, i) => {
        const appear = reduced ? 1 : easeOut((age - (n.ring === 2 ? RING_DELAY : 0) - DRAW_IN * 0.5) / FADE);
        const dimmed = hover >= 0 && hover !== i && !adj[hover]?.has(i);
        ctx.globalAlpha = appear * (dimmed ? 1 - 0.6 * fade : 1);
        const [x, y] = P[i];
        const r = (n.kind === 'centre' ? 10 : n.ring === 2 ? 4 : 5) * Math.min(1.4, Math.max(0.8, cam.k));
        if (n.kind === 'hub') {
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(Math.PI / 4);
          ctx.fillStyle = tokens.bg;
          ctx.strokeStyle = tokens.soft;
          ctx.lineWidth = 1;
          ctx.fillRect(-r, -r, 2 * r, 2 * r);
          ctx.strokeRect(-r, -r, 2 * r, 2 * r);
          ctx.restore();
        } else if (n.kind === 'foreign') {
          ctx.fillStyle = tokens.soft;
          ctx.beginPath();
          ctx.arc(x, y, 3, 0, Math.PI * 2);
          ctx.fill();
        } else if (n.kind === 'word' || n.kind === 'centre') {
          ctx.beginPath();
          ctx.arc(x, y, r, 0, Math.PI * 2);
          if (n.state === 1) {
            ctx.fillStyle = tokens.sage;
            ctx.fill();
          } else if (n.state === 2) {
            ctx.fillStyle = tokens.bg;
            ctx.fill();
            ctx.strokeStyle = tokens.ink;
            ctx.lineWidth = 1.4;
            ctx.stroke();
          } else {
            ctx.strokeStyle = tokens.faint;
            ctx.lineWidth = 1.1;
            ctx.setLineDash([1.4, 2.4]);
            ctx.stroke();
            ctx.setLineDash([]);
          }
        }
        // The bookmark: the one terracotta thing on the page, a ring on the word you are on.
        if (n.id === sel) {
          ctx.strokeStyle = tokens.accent;
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.arc(x, y, r + 6, 0, Math.PI * 2);
          ctx.stroke();
        }
        labels.push(i);
      });
      // Labels in order of importance (the word, the chosen one, the hovered one, the first ring, the second); one that would
      // touch a label already drawn waits until it is hovered or zoomed into room.
      const placed: Array<[number, number, number, number]> = [];
      const rank = (i: number) => (i === hover ? -2 : s.nodes[i].id === sel ? -1 : s.nodes[i].kind === 'centre' ? -3 : s.nodes[i].ring);
      for (const i of labels.sort((a, b) => rank(a) - rank(b) || a - b)) {
        const n = s.nodes[i];
        const [x, y] = P[i];
        const appear = reduced ? 1 : easeOut((age - (n.ring === 2 ? RING_DELAY : 0) - DRAW_IN * 0.5) / FADE);
        const dimmed = hover >= 0 && hover !== i && !adj[hover]?.has(i);
        ctx.globalAlpha = appear * (dimmed ? 1 - 0.6 * fade : 1);
        const size = Math.max(12.5, baseSize(n) * Math.min(1.5, Math.max(0.8, cam.k)));
        const boxOf = labelBox(n, [x, y], size);
        const rect: [number, number, number, number] = [boxOf.lx - 3, boxOf.ly - size, boxOf.lx + boxOf.tw + 3, boxOf.ly + (n.note && n.kind === 'foreign' ? 16 : 4)];
        if (rank(i) >= 0 && placed.some((o) => rect[0] < o[2] && rect[2] > o[0] && rect[1] < o[3] && rect[3] > o[1])) continue;
        placed.push(rect);
        drawn.push({ i, r: rect });
        const { text, font, lx, ly } = labelBox(n, [x, y], size);
        ctx.font = font;
        ctx.textAlign = 'left';
        ctx.direction = n.lang === 'ar' || /[؀-ۿ]/.test(text) ? 'rtl' : 'ltr';
        if (ctx.direction === 'rtl') ctx.textAlign = 'right';
        const tx = ctx.direction === 'rtl' ? lx + labelBox(n, [x, y], size).tw : lx;
        ctx.lineJoin = 'round';
        ctx.lineWidth = 4;
        ctx.strokeStyle = tokens.bg;
        ctx.strokeText(text, tx, ly);
        ctx.fillStyle = n.ghost || n.kind === 'hub' || n.kind === 'place' || n.kind === 'more' ? tokens.soft : tokens.ink;
        ctx.fillText(text, tx, ly);
        if (n.kind === 'phrase') {
          ctx.fillStyle = tokens.strong;
          ctx.fillRect(lx, ly + 3, labelBox(n, [x, y], size).tw, 1);
        }
        if (n.note && n.kind === 'foreign') {
          ctx.direction = 'ltr';
          ctx.font = `700 ${10 * Math.min(1.3, Math.max(0.9, cam.k))}px ${tokens.sans}`;
          ctx.textAlign = n.anchor === 'start' ? 'left' : n.anchor === 'end' ? 'right' : 'center';
          ctx.fillStyle = tokens.faint;
          const nx = n.anchor === 'start' ? lx : n.anchor === 'end' ? x - 10 : x;
          ctx.fillText(live.current.nameOf(n.note).toUpperCase(), nx, n.anchor === 'above' ? ly - size - 2 : ly + 14);
        }
        ctx.direction = 'ltr';
      }
      ctx.globalAlpha = 1;
      const moving = zoomTo || fly || (!reduced && age < DRAW_IN + RING_DELAY + FADE * 2) || now - hoverAt < FADE;
      if (moving) frame = requestAnimationFrame(draw);
    };

    // The atlas: washes for the regions, threads curved inside them and bundled between them, dots sized by how common a
    // word is and inked by how well it is remembered, labels by importance. Returns true while a label is still fading in.
    const drawAtlas = (P: Point[], now: number, reduced: boolean, fade: number, sel: string): boolean => {
      const s = live.current.scene, regions = s.regions ?? [];
      const inView = (p: Point, pad: number) => p[0] > -pad && p[0] < w + pad && p[1] > -pad && p[1] < h + pad;
      const tints: Array<[string, number]> = [[tokens.sage, 0.13], [tokens.accent, 0.07], [tokens.strong, 0.38], [tokens.sage, 0.07]];
      regions.forEach((r, i) => {
        const [cx, cy] = toScreen(r.x, r.y), rad = r.r * cam.k * 1.2;
        if (cx + rad < 0 || cx - rad > w || cy + rad < 0 || cy - rad > h || rad < 1) return;
        const [colour, a] = tints[i % tints.length];
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
        g.addColorStop(0, rgba(colour, a));
        g.addColorStop(0.7, rgba(colour, a * 0.75));
        g.addColorStop(1, rgba(colour, 0));
        ctx.globalAlpha = 1;
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(cx, cy, rad, 0, Math.PI * 2);
        ctx.fill();
      });
      // Threads: one path for those inside regions, one for the bundles between them, one for the hovered word's.
      const fine = cam.k > 0.6;
      const inside = new Path2D(), between = new Path2D(), lit = new Path2D(), hubs = new Path2D();
      const reach = 1.2 * Math.max(w, h);
      for (const e of s.edges) {
        const A = P[e.a], B = P[e.b];
        if (!inView(A, 0) && !inView(B, 0)) continue;
        if (Math.abs(A[0] - B[0]) + Math.abs(A[1] - B[1]) < 2 || (e.style === 'member' && !fine)) continue;
        const na = s.nodes[e.a], nb = s.nodes[e.b], isLit = hover >= 0 && (e.a === hover || e.b === hover);
        // A thread running more than a screen away says little here; hovering either end still shows it.
        if (!isLit && Math.abs(A[0] - B[0]) + Math.abs(A[1] - B[1]) > reach) continue;
        const apart = na.region !== undefined && nb.region !== undefined && na.region !== nb.region;
        const path = isLit ? lit : e.style === 'member' ? hubs : apart ? between : inside;
        path.moveTo(A[0], A[1]);
        if (apart && !isLit && path === between) {
          // Bundled: the curve is drawn toward each region's middle, so threads leave and arrive together like a ribbon.
          const ca = toScreen(regions[na.region!].x, regions[na.region!].y), cb = toScreen(regions[nb.region!].x, regions[nb.region!].y);
          path.bezierCurveTo(A[0] + (ca[0] - A[0]) * 0.55, A[1] + (ca[1] - A[1]) * 0.55, B[0] + (cb[0] - B[0]) * 0.55, B[1] + (cb[1] - B[1]) * 0.55, B[0], B[1]);
        } else {
          const c = bendOf(A, B);
          path.quadraticCurveTo(c[0], c[1], B[0], B[1]);
        }
      }
      const dim = hover >= 0 ? fade : hoverFrom >= 0 ? 1 - fade : 0;
      ctx.lineCap = 'round';
      ctx.strokeStyle = tokens.soft;
      ctx.lineWidth = Math.min(1.2, Math.max(0.5, 0.75 * cam.k));
      // Zoomed out the threads soften, the bundles between regions most, so the regions read first.
      const near = Math.min(1, Math.max(0.35, cam.k / 0.6)), far = Math.min(1, Math.max(0, (cam.k - 0.12) / 0.6));
      ctx.globalAlpha = 0.3 * near * (1 - 0.7 * dim);
      ctx.stroke(inside);
      ctx.globalAlpha = 0.12 * far * (1 - 0.7 * dim);
      ctx.stroke(between);
      ctx.globalAlpha = 0.14 * (1 - 0.7 * dim);
      ctx.stroke(hubs);
      if (hover >= 0) {
        ctx.globalAlpha = 0.9 * fade;
        ctx.strokeStyle = tokens.ink;
        ctx.lineWidth = 1.2;
        ctx.stroke(lit);
      }
      // Dots, batched by state and ink: size from how common the word is, ink from how likely it is remembered.
      const sizeOf = (i: number) => {
        const rank = s.nodes[i].rank, c = rank ? Math.max(0, 1 - Math.log(rank) / Math.log(maxRank * 1.2)) : 0.15;
        return (1.5 + 3.8 * c) * Math.min(1.6, Math.max(0.7, Math.sqrt(cam.k)));
      };
      const buckets = new Map<string, Path2D>();
      for (const i of byRank) {
        const n = s.nodes[i], p = P[i];
        if (!inView(p, 8)) continue;
        // A word in no region (a loose thread) is drawn lighter, so the band around the map doesn't read as a wall.
        const ink = n.region === undefined ? 0.5 : n.memory === undefined || n.memory > 0.85 ? 1 : n.memory > 0.65 ? 0.75 : n.memory > 0.45 ? 0.55 : 0.4;
        const linked = hover < 0 || i === hover || adj[hover].has(i);
        const key = `${n.state ?? 0}|${ink}|${linked ? 1 : 0}`;
        if (!buckets.has(key)) buckets.set(key, new Path2D());
        const r = sizeOf(i), path = buckets.get(key)!;
        path.moveTo(p[0] + r, p[1]);
        path.arc(p[0], p[1], r, 0, Math.PI * 2);
      }
      for (const [key, path] of buckets) {
        const [state, ink, linked] = key.split('|').map(Number);
        ctx.globalAlpha = ink * (linked ? 1 : 1 - 0.65 * fade);
        if (state === 1) {
          ctx.fillStyle = tokens.sage;
          ctx.fill(path);
        } else {
          ctx.fillStyle = tokens.bg;
          ctx.fill(path);
          ctx.strokeStyle = state === 2 ? tokens.ink : tokens.faint;
          ctx.lineWidth = 1.1;
          ctx.stroke(path);
        }
      }
      if (fine) {
        ctx.globalAlpha = 1 - 0.6 * dim;
        ctx.strokeStyle = tokens.soft;
        ctx.fillStyle = tokens.bg;
        ctx.lineWidth = 1;
        s.nodes.forEach((n, i) => {
          if (n.kind !== 'hub' || !inView(P[i], 8)) return;
          ctx.save();
          ctx.translate(P[i][0], P[i][1]);
          ctx.rotate(Math.PI / 4);
          ctx.fillRect(-3, -3, 6, 6);
          ctx.strokeRect(-3, -3, 6, 6);
          ctx.restore();
        });
      }
      const chosen = s.nodes.findIndex((n) => n.id === sel);
      if (chosen >= 0) {
        ctx.globalAlpha = 1;
        ctx.strokeStyle = tokens.accent;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(P[chosen][0], P[chosen][1], sizeOf(chosen) + 5, 0, Math.PI * 2);
        ctx.stroke();
      }
      // Labels: the regions' names, then the hovered and chosen words, then the most common, each only where it has room.
      const placed: Array<[number, number, number, number]> = [];
      const free = (r: [number, number, number, number]) => !placed.some((o) => r[0] < o[2] && r[2] > o[0] && r[1] < o[3] && r[3] > o[1]);
      const halo = (text: string, x: number, y: number, colour: string) => {
        ctx.lineJoin = 'round';
        ctx.lineWidth = 4;
        ctx.strokeStyle = tokens.bg;
        ctx.strokeText(text, x, y);
        ctx.fillStyle = colour;
        ctx.fillText(text, x, y);
      };
      ctx.font = `700 11.5px ${tokens.sans}`;
      ctx.textAlign = 'center';
      ctx.globalAlpha = 1 - 0.5 * dim;
      for (const r of regions) {
        const [cx, cy] = toScreen(r.x, r.y - r.r), text = r.label.toUpperCase(), tw = ctx.measureText(text).width;
        const rect: [number, number, number, number] = [cx - tw / 2 - 4, cy - 18, cx + tw / 2 + 4, cy - 2];
        if (cx < -tw || cx > w + tw || cy < 0 || cy > h + 20 || !free(rect)) continue;
        placed.push(rect);
        halo(text, cx, cy - 6, tokens.faint);
      }
      ctx.textAlign = 'left';
      drawn = [];
      const now2 = new Set<string>();
      let fading = false;
      const order = [hover, chosen, ...byRank].filter((i, k, all) => i >= 0 && all.indexOf(i) === k);
      for (const i of order) {
        // Zoomed out, only the landmarks; each step in brings more names into room.
        if (drawn.length >= Math.min(LABELS_MAX, Math.round(12 + 220 * cam.k ** 1.5))) break;
        const n = s.nodes[i], p = P[i];
        if (n.kind !== 'word' || !inView(p, 0)) continue;
        const rank = n.rank, c = rank ? Math.max(0, 1 - Math.log(rank) / Math.log(maxRank * 1.2)) : 0.15;
        const size = 12.5 + 4.5 * c, b = labelBox(n, p, size);
        const rect: [number, number, number, number] = [b.lx - 3, b.ly - size, b.lx + b.tw + 3, b.ly + 4];
        if (i !== hover && i !== chosen && !free(rect)) continue;
        placed.push(rect);
        drawn.push({ i, r: rect });
        now2.add(n.id);
        // A label coming into view fades in.
        if (!seen.has(n.id)) seen.set(n.id, now);
        const appear = reduced ? 1 : easeOut((now - seen.get(n.id)!) / FADE);
        if (appear < 1) fading = true;
        const linked = hover < 0 || i === hover || adj[hover].has(i);
        ctx.globalAlpha = appear * (linked ? 1 : 1 - 0.6 * fade);
        ctx.font = b.font;
        ctx.direction = /[\u0600-\u06ff]/.test(b.text) ? 'rtl' : 'ltr';
        ctx.textAlign = ctx.direction === 'rtl' ? 'right' : 'left';
        halo(b.text, ctx.direction === 'rtl' ? b.lx + b.tw : b.lx, b.ly, i === chosen ? tokens.ink : tokens.ink);
        ctx.direction = 'ltr';
        ctx.textAlign = 'left';
      }
      for (const id of [...seen.keys()]) if (!now2.has(id)) seen.delete(id);
      ctx.globalAlpha = 1;
      return fading;
    };

    // The minimap: the whole atlas small, the window drawn on it.
    const drawMini = () => {
      const s = live.current.scene;
      const mw = 180, mh = 120, b = s.box;
      if (!miniImage) {
        miniImage = document.createElement('canvas');
        miniImage.width = mw * dpr;
        miniImage.height = mh * dpr;
        const m = miniImage.getContext('2d')!;
        m.scale(dpr, dpr);
        const sc = Math.min((mw - 12) / (b.x1 - b.x0), (mh - 12) / (b.y1 - b.y0));
        miniView = { x0: b.x0 - (mw / sc - (b.x1 - b.x0)) / 2, y0: b.y0 - (mh / sc - (b.y1 - b.y0)) / 2, s: sc };
        for (const r of s.regions ?? []) {
          m.fillStyle = rgba(tokens.sage, 0.12);
          m.beginPath();
          m.arc((r.x - miniView.x0) * sc, (r.y - miniView.y0) * sc, Math.max(2, r.r * sc), 0, Math.PI * 2);
          m.fill();
        }
        for (const n of s.nodes) {
          if (n.kind !== 'word') continue;
          m.fillStyle = n.state === 1 ? tokens.sage : tokens.soft;
          m.fillRect((n.x - miniView.x0) * sc, (n.y - miniView.y0) * sc, 1.2, 1.2);
        }
      }
      mctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      mctx.clearRect(0, 0, mw, mh);
      mctx.drawImage(miniImage, 0, 0, mw, mh);
      const [x0, y0] = toWorld(0, 0), [x1, y1] = toWorld(w, h), sc = miniView.s;
      mctx.strokeStyle = tokens.ink;
      mctx.lineWidth = 1;
      mctx.strokeRect((x0 - miniView.x0) * sc, (y0 - miniView.y0) * sc, (x1 - x0) * sc, (y1 - y0) * sc);
    };

    // The atlas remembers where it was left, a moment after it stops moving.
    const keepCamera = () => {
      window.clearTimeout(cameraTimer);
      cameraTimer = window.setTimeout(() => live.current.onCamera?.({ x: cam.x, y: cam.y, k: cam.k }), 300);
    };
    const kick = () => {
      if (!frame) frame = requestAnimationFrame(draw);
    };

    // What is under the pointer: a dot within 16 px, or a label.
    const hit = (sx: number, sy: number) => {
      const s = live.current.scene;
      let best = -1, bestD = 16;
      s.nodes.forEach((n, i) => {
        const p = toScreen(n.x, n.y);
        const d = Math.hypot(p[0] - sx, p[1] - sy);
        if (d < bestD) (best = i), (bestD = d);
      });
      if (best >= 0) return best;
      // Else a label drawn in the last frame.
      return drawn.find(({ r }) => sx >= r[0] && sx <= r[2] && sy >= r[1] && sy <= r[3])?.i ?? -1;
    };
    const setHover = (i: number) => {
      if (i === hover) return;
      hoverFrom = hover;
      hover = i;
      hoverAt = performance.now();
      el.style.cursor = i >= 0 && (live.current.scene.nodes[i].key || live.current.scene.nodes[i].kind === 'centre') ? 'pointer' : 'grab';
      kick();
    };

    let drag: { x: number; y: number; cx: number; cy: number; moved: boolean } | null = null;
    const local = (e: PointerEvent | WheelEvent | MouseEvent): Point => {
      const r = el.getBoundingClientRect();
      return [e.clientX - r.left, e.clientY - r.top];
    };
    const down = (e: PointerEvent) => {
      el.setPointerCapture(e.pointerId);
      drag = { x: e.clientX, y: e.clientY, cx: cam.x, cy: cam.y, moved: false };
    };
    const move = (e: PointerEvent) => {
      if (drag) {
        const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
        if (Math.hypot(dx, dy) > 3) drag.moved = true;
        if (drag.moved) {
          cam.x = drag.cx - dx / cam.k;
          cam.y = drag.cy - dy / cam.k;
          el.style.cursor = 'grabbing';
          kick();
          return;
        }
      }
      setHover(hit(...local(e)));
    };
    const up = (e: PointerEvent) => {
      const wasDrag = drag?.moved;
      drag = null;
      if (wasDrag) return setHover(hit(...local(e)));
      const i = hit(...local(e));
      if (i >= 0) live.current.onSelect(live.current.scene.nodes[i]);
    };
    const dbl = (e: MouseEvent) => {
      const i = hit(...local(e));
      if (i >= 0) live.current.onOpen(live.current.scene.nodes[i]);
    };
    // A pinch arrives as a wheel with ctrlKey; a mouse wheel moves in lines or big steps with nothing sideways; the rest is
    // a trackpad's two fingers, which move the page.
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      const at = local(e);
      if (e.ctrlKey) return zoomAt(Math.exp(-e.deltaY * 0.01), at, false);
      const mouse = e.deltaMode === 1 || (e.deltaX === 0 && Math.abs(e.deltaY) >= 50 && Number.isInteger(e.deltaY));
      if (mouse) return zoomAt(e.deltaY < 0 ? 1.25 : 0.8, at, true);
      cam.x += e.deltaX / cam.k;
      cam.y += e.deltaY / cam.k;
      kick();
    };
    const leave = () => setHover(-1);

    const resize = () => {
      const r = wrap.getBoundingClientRect();
      const first = !w;
      w = r.width;
      h = r.height;
      dpr = window.devicePixelRatio || 1;
      map.width = 180 * dpr;
      map.height = 120 * dpr;
      el.width = Math.round(w * dpr);
      el.height = Math.round(h * dpr);
      el.style.width = `${w}px`;
      el.style.height = `${h}px`;
      if (first) place();
      miniImage = null;
      kick();
    };
    // Where a scene opens: the atlas where it was left, anything else fitted to the window.
    const place = () => {
      const saved = live.current.camera;
      if (live.current.scene.kind === 'atlas' && saved) Object.assign(cam, saved);
      // A kept view with no word in it (the words moved, or it was left over empty paper) opens fitted instead.
      if (live.current.scene.kind !== 'atlas' || !saved || !live.current.scene.nodes.some((n) => { const [x, y] = toScreen(n.x, n.y); return x > 0 && x < w && y > 0 && y < h; })) fit();
    };
    // The minimap moves the camera: click or drag it.
    const miniMove = (e: PointerEvent) => {
      if (e.type === 'pointermove' && !e.buttons) return;
      const r = map.getBoundingClientRect();
      cam.x = (e.clientX - r.left) / miniView.s + miniView.x0;
      cam.y = (e.clientY - r.top) / miniView.s + miniView.y0;
      kick();
    };
    map.addEventListener('pointerdown', miniMove);
    map.addEventListener('pointermove', miniMove);
    const observer = new ResizeObserver(resize);
    observer.observe(wrap);
    // A palette or the light changing swaps the tokens; the canvas reads them again.
    const theme = new MutationObserver(() => {
      tokens = readTokens();
      widths.clear();
      kick();
    });
    theme.observe(document.documentElement, { attributes: true });
    void document.fonts.ready.then(() => {
      widths.clear();
      kick();
    });
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointerleave', leave);
    el.addEventListener('dblclick', dbl);
    el.addEventListener('wheel', wheel, { passive: false });
    api.current = {
      redraw: () => {
        index();
        kick();
      },
      restart: () => {
        index();
        shownAt = performance.now();
        hover = hoverFrom = -1;
        seen.clear();
        if (w) place();
        kick();
      },
      flyTo: (id, k = 1.6) =>
        new Promise<void>((done) => {
          const n = live.current.scene.nodes.find((m) => m.id === id);
          if (!n) return done();
          const to = { x: n.x, y: n.y, k: Math.max(cam.k, k) };
          if (motionIsReduced()) {
            Object.assign(cam, to);
            kick();
            return done();
          }
          fly = { from: { ...cam }, to, start: performance.now(), done };
          kick();
        }),
      zoom: (f) => zoomAt(f, [w / 2, h / 2], true),
      fit: () => {
        fit();
        kick();
      },
    };
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      theme.disconnect();
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointerleave', leave);
      el.removeEventListener('dblclick', dbl);
      el.removeEventListener('wheel', wheel);
      map.removeEventListener('pointerdown', miniMove);
      map.removeEventListener('pointermove', miniMove);
      window.clearTimeout(cameraTimer);
    };
  }, []);

  // A new scene draws itself out again; a new selection only moves the bookmark.
  // A new scene draws itself out again; the same scene with new data (the worker's update) is only redrawn, where it was.
  useEffect(() => {
    if (scene.key === shownKey.current) return api.current?.redraw();
    shownKey.current = scene.key;
    api.current?.restart();
  }, [scene]);
  useEffect(() => api.current?.redraw(), [selected, quarterLabels]);
  useEffect(() => {
    if (!handle) return;
    const value: AtlasCanvasHandle = { zoom: (f) => api.current?.zoom(f), fit: () => api.current?.fit(), flyTo: (id, k) => api.current?.flyTo(id, k) ?? Promise.resolve() };
    if (typeof handle === 'function') handle(value);
    else (handle as { current: AtlasCanvasHandle | null }).current = value;
  }, [handle]);

  return (
    <div ref={box} className="absolute inset-0">
      <canvas ref={canvas} role="img" aria-label={label} className="block touch-none" />
      <canvas ref={mini} width={180 * 2} height={120 * 2} aria-hidden className={`absolute right-3 bottom-3 h-[120px] w-[180px] cursor-crosshair rounded-xl border border-line bg-surface/90 ${scene.kind === 'atlas' ? '' : 'hidden'}`} />
    </div>
  );
}

/** The neighbour in the direction of an arrow key: the nearest node within 60° of it. */
export function nodeTowards(scene: Scene, from: string, dx: number, dy: number): SceneNode | undefined {
  const a = scene.nodes.find((n) => n.id === from) ?? scene.nodes[0];
  let best: SceneNode | undefined, bestScore = Infinity;
  for (const n of scene.nodes) {
    if (n === a || n.kind === 'more') continue;
    const vx = n.x - a.x, vy = n.y - a.y, d = Math.hypot(vx, vy);
    const cos = (vx * dx + vy * dy) / d;
    if (cos < 0.5) continue;
    const score = d * (2 - cos);
    if (score < bestScore) (bestScore = score), (best = n);
  }
  return best;
}
