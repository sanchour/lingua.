// The canvas: drawing the document, the view (pan and zoom), the tools, selecting, moving, resizing, snapping, text
// editing, history and saving. The panels and menus around it are in ui.ts.
import { DEVICES, WIDGETS, loadFont } from './library';
import { bounds, cloneNodes, contains, descendants, domAt, domBox, frameAt, newDoc, normalize, overlaps, uid, union } from './model';
import type { Box, Doc, DomBox, ImageNode, LineNode, PathNode, PinNode, SNode, TextNode } from './model';
import { PIN, clipFrame, esc, nodeSvg, pathD, textCss } from './render';
import { saveDoc, setLastDocId } from './store';

export type Tool = 'select' | 'hand' | 'frame' | 'rect' | 'ellipse' | 'line' | 'arrow' | 'pen' | 'highlighter' | 'eraser' | 'text' | 'sticky' | 'pin' | 'widget' | 'icon' | 'cut';

/** Tools that stay chosen after use; the others go back to Select. */
const STAYS = new Set<Tool>(['pen', 'highlighter', 'eraser', 'pin', 'hand']);

const SVG = 'http://www.w3.org/2000/svg';
const HANDLES = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'] as const;
type Handle = (typeof HANDLES)[number];

type Gesture =
  | { kind: 'pan'; sx: number; sy: number; px: number; py: number }
  | { kind: 'marquee'; x: number; y: number; keep: Set<string>; box?: Box }
  | { kind: 'pending-frame'; id: string; sx: number; sy: number; x: number; y: number }
  | { kind: 'move'; sx: number; sy: number; x: number; y: number; start: Map<string, { x: number; y: number }>; area: Box; moved: boolean; alt: boolean; lift?: { img: ImageNode; dom: DomBox }; toggle?: string }
  | { kind: 'resize'; handle: Handle; area: Box; start: Map<string, SNode> }
  | { kind: 'end'; id: string; which: 1 | 2 }
  | { kind: 'create'; id: string; x: number; y: number; sx: number; sy: number }
  | { kind: 'draw'; points: number[] }
  | { kind: 'erase' }
  | { kind: 'cut'; x: number; y: number; box?: Box };

export interface Hooks {
  /** Something changed: the panels catch up. `full` when the document or selection changed, not just the view. */
  changed(full: boolean): void;
  toast(message: string): void;
  /** Double-click on a pin: its words are edited in the side panel. */
  focusNote(): void;
}

const snapshot = (nodes: SNode[]) => JSON.stringify(nodes);

export class Editor {
  doc: Doc = newDoc();
  sel = new Set<string>();
  tool: Tool = 'select';
  view = { x: 0, y: 0, zoom: 1 };
  /** Options for the next thing made with a tool. */
  widget = 'button';
  icon = 'star';
  device = 'desktop';
  pen = { color: '#e11d48', width: 3 };
  marker = { color: '#facc15', width: 18 };
  saved = true;

  private undoStack: string[] = [];
  private redoStack: string[] = [];
  private before: string | null = null;
  private gesture: Gesture | null = null;
  private hover: string | null = null;
  private hoverDom: Box | null = null;
  private guides: { x?: number; y?: number }[] = [];
  private space = false;
  private alt = false;
  private els = new Map<string, { outer: SVGGElement; inner: SVGGElement; sig: string }>();
  private order = '';
  private saveTimer = 0;
  private editing: { id: string; el: HTMLElement } | null = null;
  readonly measureBox: HTMLDivElement;

  readonly world: SVGSVGElement;
  readonly content: SVGGElement;
  readonly live: SVGGElement;
  readonly defs: SVGDefsElement;
  readonly over: SVGSVGElement;
  readonly editLayer: HTMLDivElement;

  constructor(
    readonly stage: HTMLElement,
    private hooks: Hooks,
  ) {
    stage.innerHTML = `<svg class="world"><defs><pattern id="sd-grid" patternUnits="userSpaceOnUse" width="8" height="8"><path d="M8 0H0V8" fill="none" class="grid-line"/></pattern></defs><rect class="grid" width="100%" height="100%" fill="url(#sd-grid)"/><g class="content"></g><g class="live"></g></svg><svg class="over"></svg><div class="edit-layer"></div><div class="measure"></div>`;
    this.world = stage.querySelector('svg.world')!;
    this.defs = this.world.querySelector('defs')!;
    this.content = this.world.querySelector('g.content')!;
    this.live = this.world.querySelector('g.live')!;
    this.over = stage.querySelector('svg.over')!;
    this.editLayer = stage.querySelector('.edit-layer')!;
    this.measureBox = stage.querySelector('.measure')!;
    stage.addEventListener('pointerdown', this.onDown);
    stage.addEventListener('pointermove', this.onMove);
    stage.addEventListener('pointerup', this.onUp);
    stage.addEventListener('pointercancel', this.onUp);
    stage.addEventListener('wheel', this.onWheel, { passive: false });
    stage.addEventListener('dblclick', this.onDouble);
    new ResizeObserver(() => this.paintView()).observe(stage);
    document.fonts?.addEventListener?.('loadingdone', () => this.refit());
  }

  // ——— The document ———

  load(doc: Doc) {
    this.finishEditing();
    doc.nodes = normalize(doc.nodes);
    doc.settings ??= { grid: false, snap: true, notesText: true };
    this.doc = doc;
    this.sel.clear();
    this.undoStack = [];
    this.redoStack = [];
    for (const { outer } of this.els.values()) outer.remove();
    this.els.clear();
    this.order = '';
    for (const n of doc.nodes) if (n.type === 'text') loadFont(n.font);
    setLastDocId(doc.id);
    this.render();
    if (doc.view) this.view = { ...doc.view };
    else this.fit();
    this.paintView();
    this.hooks.changed(true);
  }

  get selected(): SNode[] {
    return this.doc.nodes.filter((n) => this.sel.has(n.id));
  }

  byId = (id: string | undefined) => (id ? this.doc.nodes.find((n) => n.id === id) : undefined);

  /** Makes a change that can be undone. */
  change(f: () => void) {
    const before = snapshot(this.doc.nodes);
    f();
    this.doc.nodes = normalize(this.doc.nodes);
    if (snapshot(this.doc.nodes) !== before) this.pushUndo(before);
    this.afterChange();
  }

  private pushUndo(before: string) {
    this.undoStack.push(before);
    if (this.undoStack.length > 150) this.undoStack.shift();
    this.redoStack = [];
  }

  private begin() {
    this.before = snapshot(this.doc.nodes);
  }

  /** For changes typed in a panel: hold before, then change the nodes directly (render as you go), then release. */
  hold() {
    if (this.before === null) this.begin();
  }

  release() {
    if (this.before !== null) this.commit();
  }

  private commit() {
    this.doc.nodes = normalize(this.doc.nodes);
    if (this.before !== null && snapshot(this.doc.nodes) !== this.before) this.pushUndo(this.before);
    this.before = null;
    this.afterChange();
  }

  private afterChange() {
    for (const id of [...this.sel]) if (!this.byId(id)) this.sel.delete(id);
    this.render();
    this.scheduleSave();
    this.hooks.changed(true);
  }

  undo() {
    const prev = this.undoStack.pop();
    if (!prev) return;
    this.redoStack.push(snapshot(this.doc.nodes));
    this.doc.nodes = JSON.parse(prev);
    this.afterChange();
  }

  redo() {
    const next = this.redoStack.pop();
    if (!next) return;
    this.undoStack.push(snapshot(this.doc.nodes));
    this.doc.nodes = JSON.parse(next);
    this.afterChange();
  }

  scheduleSave() {
    this.saved = false;
    clearTimeout(this.saveTimer);
    this.saveTimer = window.setTimeout(() => void this.saveNow(), 500);
  }

  async saveNow() {
    clearTimeout(this.saveTimer);
    this.doc.updated = Date.now();
    this.doc.view = { ...this.view };
    try {
      await saveDoc(this.doc);
      this.saved = true;
    } catch {
      this.hooks.toast('Couldn’t save in this browser. Save a copy (Ctrl S) to keep it.');
    }
    this.hooks.changed(false);
  }

  update(ids: Iterable<string>, patch: Partial<SNode> | ((n: SNode) => void)) {
    this.change(() => {
      for (const id of ids) {
        const n = this.byId(id);
        if (!n) continue;
        if (typeof patch === 'function') patch(n);
        else Object.assign(n, patch);
        if (n.type === 'text') this.fitText(n);
      }
    });
  }

  select(ids: Iterable<string>, add = false) {
    if (!add) this.sel.clear();
    for (const id of ids) this.sel.add(id);
    this.paintOver();
    this.hooks.changed(true);
  }

  setTool(tool: Tool) {
    this.finishEditing();
    this.tool = tool;
    this.stage.dataset.tool = tool;
    this.paintOver();
    this.hooks.changed(true);
  }

  /** Adds nodes (already placed), selects them and goes back to Select. */
  add(nodes: SNode[], select = true) {
    this.change(() => {
      for (const n of nodes) {
        if (n.type === 'text') loadFont(n.font), this.fitText(n);
        if (!n.parent) {
          const c = bounds(n);
          const f = frameAt(this.doc.nodes, c.x + c.w / 2, c.y + c.h / 2, new Set(nodes.map((m) => m.id)));
          if (f && n.type !== 'frame') n.parent = f.id;
        }
      }
      this.doc.nodes.push(...nodes);
    });
    if (select) this.select(nodes.filter((n) => !nodes.some((m) => m.id === n.parent)).map((n) => n.id));
  }

  remove(ids: Iterable<string>) {
    const gone = new Set<string>();
    for (const id of ids) {
      const n = this.byId(id);
      if (!n || n.locked) continue;
      gone.add(id);
      if (n.type === 'frame') for (const d of descendants(this.doc.nodes, id)) gone.add(d.id);
    }
    if (!gone.size) return;
    this.change(() => (this.doc.nodes = this.doc.nodes.filter((n) => !gone.has(n.id))));
    this.renumber();
  }

  /** Notes are numbered 1, 2, 3 … in the order they were made. */
  renumber() {
    let i = 1;
    for (const n of this.doc.nodes) if (n.type === 'pin') n.n = i++;
    this.render();
  }

  nextPin = () => this.doc.nodes.filter((n) => n.type === 'pin').length + 1;

  // ——— The view ———

  toWorld(cx: number, cy: number) {
    const r = this.stage.getBoundingClientRect();
    return { x: (cx - r.left - this.view.x) / this.view.zoom, y: (cy - r.top - this.view.y) / this.view.zoom };
  }

  toScreen(x: number, y: number) {
    return { x: x * this.view.zoom + this.view.x, y: y * this.view.zoom + this.view.y };
  }

  /** The middle of what can be seen, in canvas coordinates. */
  centre() {
    const r = this.stage.getBoundingClientRect();
    return this.toWorld(r.left + r.width / 2, r.top + r.height / 2);
  }

  zoomTo(zoom: number, cx?: number, cy?: number) {
    const r = this.stage.getBoundingClientRect();
    const px = cx ?? r.left + r.width / 2, py = cy ?? r.top + r.height / 2;
    const w = this.toWorld(px, py);
    const z = Math.min(16, Math.max(0.03, zoom));
    this.view = { x: px - r.left - w.x * z, y: py - r.top - w.y * z, zoom: z };
    this.paintView();
  }

  fit(box?: Box | null) {
    box ??= union(this.doc.nodes.filter((n) => !n.hidden).map(bounds));
    const r = this.stage.getBoundingClientRect();
    if (!box || !r.width) {
      this.view = { x: r.width / 2, y: r.height / 2, zoom: 1 };
      return this.paintView();
    }
    const pad = 64;
    const z = Math.min(4, Math.max(0.03, Math.min((r.width - pad * 2) / Math.max(box.w, 1), (r.height - pad * 2) / Math.max(box.h, 1))));
    this.view = { zoom: z, x: r.width / 2 - (box.x + box.w / 2) * z, y: r.height / 2 - (box.y + box.h / 2) * z };
    this.paintView();
  }

  paintView() {
    const { x, y, zoom } = this.view;
    const t = `translate(${x} ${y}) scale(${zoom})`;
    this.content.setAttribute('transform', t);
    this.live.setAttribute('transform', t);
    const grid = this.doc.settings?.grid;
    const pat = this.world.querySelector('pattern')!;
    // The grid shows 8 px squares when they are big enough to see, else 64 px ones.
    const step = zoom * 8 >= 6 ? 8 : 64;
    pat.setAttribute('width', String(step * zoom));
    pat.setAttribute('height', String(step * zoom));
    pat.setAttribute('x', String(x));
    pat.setAttribute('y', String(y));
    pat.querySelector('path')!.setAttribute('d', `M${step * zoom} 0H0V${step * zoom}`);
    (this.world.querySelector('rect.grid') as SVGRectElement).style.display = grid ? '' : 'none';
    this.positionEditor();
    this.paintOver();
    this.hooks.changed(false);
  }

  // ——— Drawing ———

  render() {
    const notesText = this.doc.settings?.notesText ?? true;
    const opts = { asset: (id: string) => this.doc.assets[id], notesText };
    const alive = new Set<string>();
    const clips: string[] = [];
    for (const n of this.doc.nodes) {
      alive.add(n.id);
      let el = this.els.get(n.id);
      if (!el) {
        const outer = document.createElementNS(SVG, 'g');
        const inner = document.createElementNS(SVG, 'g');
        outer.dataset.id = n.id;
        outer.appendChild(inner);
        el = { outer, inner, sig: '' };
        this.els.set(n.id, el);
      }
      const sig = JSON.stringify({ ...n, x: 0, y: 0, notesText: n.type === 'pin' && notesText });
      if (sig !== el.sig) {
        el.inner.innerHTML = nodeSvg(n, opts);
        el.sig = sig;
      }
      el.inner.setAttribute('transform', `translate(${n.x} ${n.y})`);
      el.inner.style.opacity = n.opacity !== undefined && n.opacity < 1 ? String(n.opacity) : '';
      el.outer.style.display = n.hidden ? 'none' : '';
      const f = clipFrame(this.doc.nodes, n);
      if (f) el.outer.setAttribute('clip-path', `url(#sd-clip-${f.id})`);
      else el.outer.removeAttribute('clip-path');
      if (n.type === 'frame' && n.clip) clips.push(`<clipPath id="sd-clip-${n.id}"><rect x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" rx="${n.radius ?? 0}"/></clipPath>`);
    }
    for (const [id, el] of this.els) if (!alive.has(id)) el.outer.remove(), this.els.delete(id);
    const order = this.doc.nodes.map((n) => n.id).join();
    if (order !== this.order) {
      for (const n of this.doc.nodes) this.content.appendChild(this.els.get(n.id)!.outer);
      this.order = order;
    }
    this.defs.querySelectorAll('clipPath').forEach((c) => c.remove());
    this.defs.insertAdjacentHTML('beforeend', clips.join(''));
    if (this.editing) this.els.get(this.editing.id)?.inner.style.setProperty('visibility', 'hidden');
    this.paintOver();
  }

  /** Moves nodes without rebuilding their drawing (dragging). */
  private place(n: SNode) {
    this.els.get(n.id)?.inner.setAttribute('transform', `translate(${n.x} ${n.y})`);
  }

  private drawn(n: SNode) {
    const el = this.els.get(n.id);
    if (!el) return;
    el.inner.innerHTML = nodeSvg(n, { asset: (id) => this.doc.assets[id], notesText: this.doc.settings?.notesText ?? true });
    el.sig = '';
    this.place(n);
  }

  /** The selection, its handles, guides, the marquee and the frames' names, drawn in screen pixels. */
  paintOver() {
    const z = this.view.zoom;
    const s = (x: number, y: number) => this.toScreen(x, y);
    const rect = (b: Box, cls: string, extra = '') => {
      const a = s(b.x, b.y);
      return `<rect class="${cls}" x="${a.x}" y="${a.y}" width="${b.w * z}" height="${b.h * z}" ${extra}/>`;
    };
    let out = '';
    // The frames' names, above each frame.
    for (const n of this.doc.nodes) {
      if (n.type !== 'frame' || n.hidden) continue;
      const a = s(n.x, n.y);
      out += `<text class="frame-name${this.sel.has(n.id) ? ' on' : ''}" data-frame="${n.id}" x="${a.x}" y="${a.y - 7}">${esc(n.name ?? 'Frame')}${n.device ? ` · ${n.w} × ${n.h}` : ''}</text>`;
    }
    if (this.hoverDom) out += rect(this.hoverDom, 'dom-hover');
    const hover = this.byId(this.hover ?? undefined);
    if (hover && !this.sel.has(hover.id) && !this.gesture) out += rect(bounds(hover), 'hover');
    const chosen = this.selected.filter((n) => !n.hidden);
    for (const n of chosen) {
      if (n.type === 'line') {
        const a = s(n.x, n.y), b = s(n.x + n.w, n.y + n.h);
        out += `<line class="sel-line" x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}"/>`;
        if (chosen.length === 1 && !n.locked) out += `<circle class="handle" data-end="1" cx="${a.x}" cy="${a.y}" r="5"/><circle class="handle" data-end="2" cx="${b.x}" cy="${b.y}" r="5"/>`;
      } else out += rect(bounds(n), 'sel');
    }
    const area = union(chosen.filter((n) => n.type !== 'line' || chosen.length > 1).map(bounds));
    const resizable = chosen.length && !(chosen.length === 1 && (chosen[0].type === 'line' || chosen[0].type === 'pin')) && !chosen.some((n) => n.locked);
    if (area && resizable && this.tool === 'select') {
      if (chosen.length > 1) out += rect(area, 'sel-area');
      const a = s(area.x, area.y);
      const w = area.w * z, h = area.h * z;
      const at: Record<Handle, [number, number]> = { nw: [0, 0], n: [w / 2, 0], ne: [w, 0], e: [w, h / 2], se: [w, h], s: [w / 2, h], sw: [0, h], w: [0, h / 2] };
      for (const hd of HANDLES) {
        if ((hd === 'n' || hd === 's') && w < 24) continue;
        if ((hd === 'e' || hd === 'w') && h < 24) continue;
        out += `<rect class="handle" data-handle="${hd}" x="${a.x + at[hd][0] - 4}" y="${a.y + at[hd][1] - 4}" width="8" height="8" rx="1.5"/>`;
      }
      if (chosen.length === 1 || area) out += `<text class="size-tag" x="${a.x + w / 2}" y="${a.y + h + 18}">${Math.round(area.w)} × ${Math.round(area.h)}</text>`;
    }
    const g = this.gesture;
    if (g?.kind === 'marquee' && g.box) out += rect(g.box, 'marquee');
    if (g?.kind === 'cut' && g.box) out += rect(g.box, 'cut-box');
    for (const gd of this.guides) {
      if (gd.x !== undefined) out += `<line class="guide" x1="${s(gd.x, 0).x}" x2="${s(gd.x, 0).x}" y1="0" y2="100%"/>`;
      if (gd.y !== undefined) out += `<line class="guide" y1="${s(0, gd.y).y}" y2="${s(0, gd.y).y}" x1="0" x2="100%"/>`;
    }
    this.over.innerHTML = out;
  }

  // ——— Text ———

  /** Text nodes take the size of their words. */
  fitText(n: TextNode) {
    const m = this.measureBox;
    m.style.cssText = textCss(n, n.auto) + (n.auto ? 'width:max-content;' : `width:${n.w}px;`) + 'position:absolute;visibility:hidden;left:-99999px;top:0;';
    m.textContent = n.text || ' ';
    const r = m.getBoundingClientRect();
    if (n.auto) n.w = Math.ceil(r.width) + 1;
    n.h = Math.ceil(r.height);
  }

  private refit() {
    let any = false;
    for (const n of this.doc.nodes)
      if (n.type === 'text') {
        const { w, h } = n;
        this.fitText(n);
        if (n.w !== w || n.h !== h) any = true;
      }
    if (any) this.render();
  }

  edit(n: SNode) {
    if (n.locked) return;
    if (n.type === 'pin') return this.select([n.id]), this.hooks.focusNote();
    if (n.type !== 'text' && n.type !== 'sticky' && n.type !== 'widget') return;
    this.finishEditing();
    this.select([n.id]);
    const el = document.createElement('div');
    el.className = 'editing';
    el.contentEditable = 'plaintext-only';
    if (el.contentEditable !== 'plaintext-only') el.contentEditable = 'true';
    el.spellcheck = true;
    el.textContent = n.type === 'widget' ? n.label : n.text;
    if (n.type === 'text') el.style.cssText = textCss(n, n.auto) + (n.auto ? 'min-width:4px;' : `width:${n.w}px;`);
    else if (n.type === 'sticky') el.style.cssText = `font:500 16px/1.4 system-ui,-apple-system,'Segoe UI',sans-serif;color:#1f2937;white-space:pre-wrap;width:${n.w - 28}px;min-height:${n.h - 28}px;padding:14px;background:${n.fill};border-radius:4px;`;
    else el.style.cssText = `font:600 13px/1.3 system-ui,sans-serif;color:#334155;background:#ffffff;padding:2px 6px;border-radius:6px;min-width:${n.w}px;`;
    this.editLayer.appendChild(el);
    this.editing = { id: n.id, el };
    this.begin();
    this.positionEditor();
    this.els.get(n.id)?.inner.style.setProperty('visibility', 'hidden');
    el.focus();
    const range = document.createRange();
    range.selectNodeContents(el);
    const sel = (this.stage.getRootNode() as ShadowRoot & { getSelection?: () => Selection | null }).getSelection?.() ?? getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
    el.addEventListener('blur', () => this.finishEditing());
    el.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Escape' || (e.key === 'Enter' && (e.ctrlKey || e.metaKey || n.type === 'widget'))) e.preventDefault(), this.finishEditing();
    });
  }

  private positionEditor() {
    if (!this.editing) return;
    const n = this.byId(this.editing.id);
    if (!n) return;
    const a = this.toScreen(n.x, n.y);
    Object.assign(this.editing.el.style, { left: `${a.x}px`, top: `${a.y}px`, transform: `scale(${this.view.zoom})` });
  }

  finishEditing() {
    const ed = this.editing;
    if (!ed) return;
    this.editing = null;
    const n = this.byId(ed.id);
    const words = (ed.el.innerText ?? '').replace(/\n$/, '');
    ed.el.remove();
    this.els.get(ed.id)?.inner.style.removeProperty('visibility');
    if (!n) return;
    if (n.type === 'text') {
      if (!words.trim()) {
        this.doc.nodes = this.doc.nodes.filter((m) => m.id !== n.id);
        this.sel.delete(n.id);
      } else (n.text = words), this.fitText(n);
    } else if (n.type === 'sticky') n.text = words;
    else if (n.type === 'widget') n.label = words.trim() || n.label;
    this.commit();
  }

  get isEditing() {
    return this.editing !== null;
  }

  // ——— Finding things ———

  /** The top node under a point, leaving out locked and hidden ones unless asked. */
  hit(x: number, y: number, opts: { skip?: Set<string>; pins?: boolean } = {}): SNode | undefined {
    const tol = 5 / this.view.zoom;
    for (let i = this.doc.nodes.length - 1; i >= 0; i--) {
      const n = this.doc.nodes[i];
      if (n.hidden || n.locked || opts.skip?.has(n.id) || (opts.pins === false && n.type === 'pin')) continue;
      const f = clipFrame(this.doc.nodes, n);
      if (f && !contains(f, x, y)) continue;
      if (n.type === 'line') {
        if (distToSegment(x, y, n.x, n.y, n.x + n.w, n.y + n.h) <= Math.max(n.strokeWidth / 2, tol)) return n;
      } else if (n.type === 'path') {
        if (contains(bounds(n), x, y, n.strokeWidth + tol) && nearPath(n, x, y, Math.max(n.strokeWidth / 2, tol))) return n;
      } else if (contains(bounds(n), x, y)) return n;
    }
  }

  /** What a note at this point is about: a page element in a screenshot, or a node. */
  targetAt(x: number, y: number, skip: Set<string>): PinNode['target'] {
    const under = this.hit(x, y, { skip, pins: false });
    if (!under) return;
    if (under.type === 'image') {
      const d = domAt(under, this.doc.dom?.[under.asset], x, y);
      if (d) return { name: d.name, selector: d.selector, component: d.component, page: under.source };
    }
    if (under.type === 'frame') return { name: `frame “${under.name ?? 'Frame'}”` };
    return { name: `${under.type === 'widget' ? `${under.widget} outline` : under.type} “${(under.type === 'text' || under.type === 'sticky' ? under.text : under.type === 'widget' ? under.label : under.name ?? '').slice(0, 40)}”`.replace(/ “”$/, '') };
  }

  // ——— Pointer ———

  private onDown = (e: PointerEvent) => {
    if ((e.target as Element).closest('.editing')) return;
    this.finishEditing();
    // The canvas takes the keys from any field, and keeps the focus a new text or note is given below.
    ((this.stage.getRootNode() as ShadowRoot).activeElement as HTMLElement | null)?.blur();
    this.stage.focus({ preventScroll: true });
    e.preventDefault();
    const w = this.toWorld(e.clientX, e.clientY);
    this.stage.setPointerCapture(e.pointerId);
    if (e.button === 1 || this.space || this.tool === 'hand') {
      e.preventDefault();
      this.gesture = { kind: 'pan', sx: e.clientX, sy: e.clientY, px: this.view.x, py: this.view.y };
      this.stage.classList.add('panning');
      return;
    }
    if (e.button !== 0) return;
    const t = e.target as Element;
    switch (this.tool) {
      case 'select': {
        const handle = t.getAttribute('data-handle') as Handle | null;
        const end = t.getAttribute('data-end');
        const frameName = t.getAttribute('data-frame');
        if (handle) return this.startResize(handle);
        if (end) return this.begin(), (this.gesture = { kind: 'end', id: [...this.sel][0], which: end === '1' ? 1 : 2 });
        const n = frameName ? this.byId(frameName) : this.hit(w.x, w.y);
        if (!n) {
          this.gesture = { kind: 'marquee', x: w.x, y: w.y, keep: e.shiftKey ? new Set(this.sel) : new Set() };
          if (!e.shiftKey) this.select([]);
          return;
        }
        // A frame that is not chosen yet: a drag on it draws a marquee, a click chooses it.
        if (!frameName && n.type === 'frame' && !this.sel.has(n.id) && descendants(this.doc.nodes, n.id).length) {
          this.gesture = { kind: 'pending-frame', id: n.id, sx: e.clientX, sy: e.clientY, x: w.x, y: w.y };
          return;
        }
        let toggle: string | undefined;
        if (e.shiftKey) {
          if (this.sel.has(n.id)) toggle = n.id;
          else this.select([n.id], true);
        } else if (!this.sel.has(n.id)) this.select([n.id]);
        const lift = e.altKey && n.type === 'image' ? domAt(n, this.doc.dom?.[n.asset], w.x, w.y) : undefined;
        this.startMove(e, w, e.altKey, lift && n.type === 'image' ? { img: n, dom: lift } : undefined, toggle);
        return;
      }
      case 'pen':
      case 'highlighter':
        this.gesture = { kind: 'draw', points: [w.x, w.y] };
        this.paintLive();
        return;
      case 'eraser':
        this.begin();
        this.gesture = { kind: 'erase' };
        this.erase(w.x, w.y);
        return;
      case 'cut':
        this.gesture = { kind: 'cut', x: w.x, y: w.y };
        return;
      case 'text':
      case 'sticky':
      case 'pin':
        return this.placeAt(w.x, w.y);
      default:
        return this.startCreate(w.x, w.y, e);
    }
  };

  private startMove(e: PointerEvent, w: { x: number; y: number }, alt: boolean, lift?: { img: ImageNode; dom: DomBox }, toggle?: string) {
    const start = new Map<string, { x: number; y: number }>();
    for (const n of this.selected) {
      if (n.locked) continue;
      start.set(n.id, { x: n.x, y: n.y });
      if (n.type === 'frame') for (const d of descendants(this.doc.nodes, n.id)) start.set(d.id, { x: d.x, y: d.y });
    }
    const area = union(this.selected.map(bounds)) ?? { x: w.x, y: w.y, w: 0, h: 0 };
    this.begin();
    this.gesture = { kind: 'move', sx: e.clientX, sy: e.clientY, x: w.x, y: w.y, start, area, moved: false, alt, lift, toggle };
  }

  private startResize(handle: Handle) {
    const area = union(this.selected.map(bounds));
    if (!area) return;
    const start = new Map<string, SNode>();
    for (const n of this.selected) {
      start.set(n.id, structuredClone(n));
      if (n.type === 'frame') for (const d of descendants(this.doc.nodes, n.id)) start.set(d.id, structuredClone(d));
    }
    this.begin();
    this.gesture = { kind: 'resize', handle, area, start };
  }

  private startCreate(x: number, y: number, e: PointerEvent) {
    const id = uid();
    let n: SNode;
    const at = { id, x, y, w: 0, h: 0 };
    switch (this.tool) {
      case 'frame':
        n = { ...at, type: 'frame', name: `Frame ${this.doc.nodes.filter((m) => m.type === 'frame').length + 1}`, fill: '#ffffff', clip: true };
        break;
      case 'rect':
        n = { ...at, type: 'rect', fill: '#e2e8f0', radius: 8 };
        break;
      case 'ellipse':
        n = { ...at, type: 'ellipse', fill: '#c7d2fe' };
        break;
      case 'line':
      case 'arrow':
        n = { ...at, type: 'line', stroke: '#0f172a', strokeWidth: 2, end: this.tool === 'arrow' ? 'arrow' : 'none' };
        break;
      case 'widget': {
        const kind = WIDGETS.find((k) => k.id === this.widget) ?? WIDGETS[0];
        n = { ...at, type: 'widget', widget: kind.id, label: kind.name };
        break;
      }
      case 'icon':
        n = { ...at, type: 'icon', icon: this.icon, color: '#0f172a' };
        break;
      default:
        return;
    }
    this.begin();
    this.doc.nodes.push(n);
    this.sel = new Set([id]);
    this.render();
    this.gesture = { kind: 'create', id, x, y, sx: e.clientX, sy: e.clientY };
  }

  /** Text, a sticky note or a note pin where the click was. */
  private placeAt(x: number, y: number) {
    let n: SNode;
    if (this.tool === 'text') n = { id: uid(), type: 'text', x, y: y - 12, w: 10, h: 26, text: '', font: 'Inter', size: 20, weight: 400, color: '#0f172a', align: 'left', lineHeight: 1.3, auto: true };
    else if (this.tool === 'sticky') n = { id: uid(), type: 'sticky', x: x - 100, y: y - 100, w: 200, h: 200, text: '', fill: '#fef08a' };
    else {
      const id = uid();
      n = { id, type: 'pin', x: x - PIN / 2, y: y - PIN / 2, w: PIN, h: PIN, n: this.nextPin(), text: '', kinds: [], target: this.targetAt(x, y, new Set([id])) };
    }
    loadFont('Inter');
    this.add([n]);
    if (!STAYS.has(this.tool)) this.setTool('select');
    if (n.type === 'pin') this.hooks.focusNote();
    else this.edit(n);
  }

  private onMove = (e: PointerEvent) => {
    const w = this.toWorld(e.clientX, e.clientY);
    const g = this.gesture;
    this.alt = e.altKey;
    if (!g) return this.updateHover(w.x, w.y, e.altKey);
    switch (g.kind) {
      case 'pan':
        this.view.x = g.px + e.clientX - g.sx;
        this.view.y = g.py + e.clientY - g.sy;
        return this.paintView();
      case 'pending-frame':
        if (Math.hypot(e.clientX - g.sx, e.clientY - g.sy) > 4) {
          this.select([]);
          this.gesture = { kind: 'marquee', x: g.x, y: g.y, keep: new Set() };
          this.onMove(e);
        }
        return;
      case 'marquee': {
        const box = { x: Math.min(g.x, w.x), y: Math.min(g.y, w.y), w: Math.abs(w.x - g.x), h: Math.abs(w.y - g.y) };
        g.box = box;
        const hit = this.doc.nodes.filter((n) => !n.hidden && !n.locked && overlaps(bounds(n), box) && (n.type !== 'frame' || (contains(box, n.x, n.y) && contains(box, n.x + n.w, n.y + n.h))));
        // Inside a frame that is all chosen, its children aren't chosen separately.
        const ids = new Set(hit.map((n) => n.id));
        this.sel = new Set([...g.keep, ...hit.filter((n) => !n.parent || !ids.has(n.parent)).map((n) => n.id)]);
        this.paintOver();
        return;
      }
      case 'move':
        return this.moveTo(g, e, w);
      case 'resize':
        return this.resizeTo(g, w, e.shiftKey, e.altKey);
      case 'end': {
        const n = this.byId(g.id) as LineNode | undefined;
        if (!n) return;
        let p = this.snapPoint(w.x, w.y, new Set([n.id]));
        const fx = g.which === 1 ? n.x + n.w : n.x, fy = g.which === 1 ? n.y + n.h : n.y;
        if (e.shiftKey) p = angleSnap(fx, fy, p.x, p.y);
        if (g.which === 1) Object.assign(n, { x: p.x, y: p.y, w: fx - p.x, h: fy - p.y });
        else Object.assign(n, { w: p.x - n.x, h: p.y - n.y });
        this.drawn(n);
        return this.paintOver();
      }
      case 'create':
        return this.createTo(g, w, e.shiftKey, e.altKey);
      case 'draw': {
        const pts = g.points;
        const lx = pts[pts.length - 2], ly = pts[pts.length - 1];
        if (Math.hypot(w.x - lx, w.y - ly) * this.view.zoom < 1.5) return;
        pts.push(w.x, w.y);
        return this.paintLive();
      }
      case 'erase':
        return this.erase(w.x, w.y);
      case 'cut':
        g.box = { x: Math.min(g.x, w.x), y: Math.min(g.y, w.y), w: Math.abs(w.x - g.x), h: Math.abs(w.y - g.y) };
        return this.paintOver();
    }
  };

  private updateHover(x: number, y: number, alt: boolean) {
    const n = this.tool === 'select' ? this.hit(x, y) : undefined;
    let dom: Box | null = null;
    if ((alt || this.tool === 'pin') && !n?.locked) {
      const img = this.hit(x, y, { pins: false });
      if (img?.type === 'image') {
        const d = domAt(img, this.doc.dom?.[img.asset], x, y);
        if (d) dom = domBox(img, d);
      }
    }
    const id = n?.id ?? null;
    if (id === this.hover && JSON.stringify(dom) === JSON.stringify(this.hoverDom)) return;
    this.hover = id;
    this.hoverDom = dom;
    this.paintOver();
  }

  private moveTo(g: Extract<Gesture, { kind: 'move' }>, e: PointerEvent, w: { x: number; y: number }) {
    if (!g.moved) {
      if (Math.hypot(e.clientX - g.sx, e.clientY - g.sy) < 3) return;
      g.moved = true;
      g.toggle = undefined;
      // Alt and drag: a copy moves and the original stays, or a lifted part of a screenshot.
      if (g.lift) {
        const cut = this.cutOut(g.lift.img, domBox(g.lift.img, g.lift.dom), g.lift.dom.name);
        if (!cut) return;
        g.start = new Map([[cut.id, { x: cut.x, y: cut.y }]]);
        g.area = bounds(cut);
      } else if (g.alt) {
        const top = this.selected.filter((n) => !n.locked);
        const copies = cloneNodes([...top, ...top.flatMap((n) => (n.type === 'frame' ? descendants(this.doc.nodes, n.id) : []))]);
        this.doc.nodes.push(...copies);
        this.doc.nodes = normalize(this.doc.nodes);
        const tops = copies.slice(0, top.length);
        this.sel = new Set(tops.map((n) => n.id));
        g.start = new Map(copies.map((n) => [n.id, { x: n.x, y: n.y }]));
        this.render();
      }
    }
    let dx = w.x - g.x, dy = w.y - g.y;
    if (e.shiftKey) Math.abs(dx) > Math.abs(dy) ? (dy = 0) : (dx = 0);
    const moved = { ...g.area, x: g.area.x + dx, y: g.area.y + dy };
    const snap = this.snapBox(moved, new Set(g.start.keys()));
    dx += snap.dx;
    dy += snap.dy;
    for (const [id, p] of g.start) {
      const n = this.byId(id);
      if (!n) continue;
      n.x = p.x + dx;
      n.y = p.y + dy;
      this.place(n);
    }
    this.paintOver();
  }

  private resizeTo(g: Extract<Gesture, { kind: 'resize' }>, w: { x: number; y: number }, keep: boolean, fromCentre: boolean) {
    const a = g.area;
    const h = g.handle;
    let x1 = a.x, y1 = a.y, x2 = a.x + a.w, y2 = a.y + a.h;
    const p = this.snapPoint(w.x, w.y, new Set(g.start.keys()));
    if (h.includes('w')) x1 = p.x;
    if (h.includes('e')) x2 = p.x;
    if (h.includes('n')) y1 = p.y;
    if (h.includes('s')) y2 = p.y;
    if (fromCentre) {
      const cx = a.x + a.w / 2, cy = a.y + a.h / 2;
      if (h.includes('w') || h.includes('e')) (x1 = cx - Math.abs(p.x - cx)), (x2 = cx + Math.abs(p.x - cx));
      if (h.includes('n') || h.includes('s')) (y1 = cy - Math.abs(p.y - cy)), (y2 = cy + Math.abs(p.y - cy));
    }
    let nw = Math.max(1, Math.abs(x2 - x1)), nh = Math.max(1, Math.abs(y2 - y1));
    const onlyText = [...g.start.values()].every((n) => n.type === 'text');
    // Pictures and icons keep their shape from a corner; Shift does the same for everything.
    const pictures = [...g.start.values()].every((n) => n.type === 'image' || n.type === 'icon');
    if (keep || (pictures && h.length === 2)) {
      const k = h.length === 2 ? Math.max(nw / Math.max(a.w, 1), nh / Math.max(a.h, 1)) : h === 'n' || h === 's' ? nh / Math.max(a.h, 1) : nw / Math.max(a.w, 1);
      nw = a.w * k;
      nh = a.h * k;
      if (h.includes('w')) x1 = x2 - nw;
      if (h.includes('n')) y1 = y2 - nh;
    }
    const box = { x: Math.min(x1, x2), y: Math.min(y1, y2), w: nw, h: nh };
    const kx = box.w / Math.max(a.w, 1), ky = box.h / Math.max(a.h, 1);
    for (const [id, s] of g.start) {
      const n = this.byId(id);
      if (!n) continue;
      if (n.type === 'pin') {
        n.x = box.x + (s.x + PIN / 2 - a.x) * kx - PIN / 2;
        n.y = box.y + (s.y + PIN / 2 - a.y) * ky - PIN / 2;
      } else {
        n.x = box.x + (s.x - a.x) * kx;
        n.y = box.y + (s.y - a.y) * ky;
        n.w = s.w * kx;
        n.h = s.h * ky;
        if (n.type === 'text') {
          if (onlyText && (h === 'e' || h === 'w')) (n.auto = false), this.fitText(n);
          else if (s.type === 'text') (n.size = Math.max(1, Math.round(s.size * Math.min(kx, ky) * 10) / 10)), this.fitText(n);
        }
      }
      this.drawn(n);
    }
    this.paintOver();
  }

  private createTo(g: Extract<Gesture, { kind: 'create' }>, w: { x: number; y: number }, square: boolean, fromCentre: boolean) {
    const n = this.byId(g.id);
    if (!n) return;
    let p = this.snapPoint(w.x, w.y, new Set([n.id]));
    if (n.type === 'line') {
      if (square) p = angleSnap(g.x, g.y, p.x, p.y);
      Object.assign(n, { x: g.x, y: g.y, w: p.x - g.x, h: p.y - g.y });
    } else {
      let dx = p.x - g.x, dy = p.y - g.y;
      if (square || n.type === 'icon') {
        const s = Math.max(Math.abs(dx), Math.abs(dy));
        dx = Math.sign(dx || 1) * s;
        dy = Math.sign(dy || 1) * s;
      }
      if (fromCentre) Object.assign(n, { x: g.x - Math.abs(dx), y: g.y - Math.abs(dy), w: Math.abs(dx) * 2, h: Math.abs(dy) * 2 });
      else Object.assign(n, { x: Math.min(g.x, g.x + dx), y: Math.min(g.y, g.y + dy), w: Math.abs(dx), h: Math.abs(dy) });
    }
    this.drawn(n);
    this.paintOver();
  }

  private paintLive() {
    const g = this.gesture;
    if (g?.kind !== 'draw') return (this.live.innerHTML = '');
    const st = this.tool === 'highlighter' ? this.marker : this.pen;
    this.live.innerHTML = `<path d="${pathD(g.points)}" fill="none" stroke="${st.color}" stroke-width="${st.width}" stroke-linecap="round" stroke-linejoin="round"${this.tool === 'highlighter' ? ' stroke-opacity="0.38"' : ''}/>`;
  }

  private erase(x: number, y: number) {
    const tol = 8 / this.view.zoom;
    const gone = this.doc.nodes.filter((n) => (n.type === 'path' && !n.locked && contains(bounds(n), x, y, tol + n.strokeWidth) && nearPath(n, x, y, tol + n.strokeWidth / 2)) || (n.type === 'line' && !n.locked && distToSegment(x, y, n.x, n.y, n.x + n.w, n.y + n.h) < tol));
    if (!gone.length) return;
    const ids = new Set(gone.map((n) => n.id));
    this.doc.nodes = this.doc.nodes.filter((n) => !ids.has(n.id));
    this.render();
  }

  private onUp = (e: PointerEvent) => {
    const g = this.gesture;
    this.gesture = null;
    this.guides = [];
    this.stage.classList.remove('panning');
    if (this.stage.hasPointerCapture(e.pointerId)) this.stage.releasePointerCapture(e.pointerId);
    if (!g) return;
    switch (g.kind) {
      case 'pan':
        this.scheduleSave();
        break;
      case 'pending-frame':
        this.select([g.id]);
        break;
      case 'marquee':
        this.paintOver();
        this.hooks.changed(true);
        break;
      case 'move': {
        if (!g.moved) {
          if (g.toggle) this.sel.delete(g.toggle), this.hooks.changed(true);
          // Alt and a click on a screenshot: the element under it comes out as a cut-out.
          else if (g.lift) {
            const cut = this.cutOut(g.lift.img, domBox(g.lift.img, g.lift.dom), g.lift.dom.name);
            if (cut) this.hooks.toast(`Lifted ${g.lift.dom.name}. Drag it anywhere.`);
          }
          this.before = null;
          this.paintOver();
          return;
        }
        // Whatever moved into or out of a frame changes frame.
        const moving = new Set(g.start.keys());
        for (const n of this.selected) {
          if (n.locked) continue;
          const b = bounds(n);
          const f = frameAt(this.doc.nodes, b.x + b.w / 2, b.y + b.h / 2, new Set([...moving, ...(n.type === 'frame' ? [n.id] : [])]));
          if (n.type === 'frame' && f && !(contains(f, b.x, b.y) && contains(f, b.x + b.w, b.y + b.h))) delete n.parent;
          else if (f) n.parent = f.id;
          else delete n.parent;
          if (n.type === 'pin') n.target = this.targetAt(n.x + PIN / 2, n.y + PIN / 2, new Set([n.id]));
        }
        this.commit();
        break;
      }
      case 'resize':
      case 'end':
        this.commit();
        break;
      case 'create': {
        const n = this.byId(g.id);
        if (n && Math.hypot(e.clientX - g.sx, e.clientY - g.sy) < 4) this.sizeByClick(n);
        if (n) {
          const b = bounds(n);
          const f = frameAt(this.doc.nodes, b.x + b.w / 2, b.y + b.h / 2, new Set([n.id]));
          if (f && n.type !== 'frame') n.parent = f.id;
          // A new frame drawn around loose things takes them in.
          if (n.type === 'frame') for (const m of this.doc.nodes) if (m !== n && !m.parent && m.type !== 'frame' && contains(b, bounds(m).x, bounds(m).y) && contains(b, bounds(m).x + bounds(m).w, bounds(m).y + bounds(m).h)) m.parent = n.id;
        }
        this.commit();
        if (!STAYS.has(this.tool)) this.setTool('select');
        break;
      }
      case 'draw': {
        this.live.innerHTML = '';
        const pts = g.points;
        if (pts.length < 2) return;
        const st = this.tool === 'highlighter' ? this.marker : this.pen;
        let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
        for (let i = 0; i < pts.length; i += 2) (x1 = Math.min(x1, pts[i])), (y1 = Math.min(y1, pts[i + 1])), (x2 = Math.max(x2, pts[i])), (y2 = Math.max(y2, pts[i + 1]));
        const w = Math.max(x2 - x1, 1), h = Math.max(y2 - y1, 1);
        const rel = pts.map((v, i) => Math.round((v - (i % 2 ? y1 : x1)) * 10) / 10);
        const n: PathNode = { id: uid(), type: 'path', x: x1, y: y1, w, h, bw: w, bh: h, points: rel, stroke: st.color, strokeWidth: st.width, highlight: this.tool === 'highlighter' || undefined };
        this.add([n], false);
        break;
      }
      case 'erase':
        this.commit();
        break;
      case 'cut': {
        if (!g.box || g.box.w < 4 || g.box.h < 4) return this.paintOver();
        const img = this.hit(g.box.x + g.box.w / 2, g.box.y + g.box.h / 2, { pins: false });
        const under = img?.type === 'image' ? img : this.doc.nodes.findLast((n): n is ImageNode => n.type === 'image' && !n.hidden && overlaps(bounds(n), g.box!));
        if (!under) {
          this.hooks.toast('Draw the cut-out over a picture.');
          return this.paintOver();
        }
        this.cutOut(under, g.box);
        this.setTool('select');
        break;
      }
    }
  };

  /** A click without a drag makes a thing of its usual size. */
  private sizeByClick(n: SNode) {
    if (n.type === 'frame') {
      const d = DEVICES.find((v) => v.id === this.device) ?? DEVICES[0];
      Object.assign(n, { w: d.w, h: d.h, device: d.id, name: d.name });
    } else if (n.type === 'widget') {
      const k = WIDGETS.find((v) => v.id === n.widget) ?? WIDGETS[0];
      Object.assign(n, { w: k.w, h: k.h });
    } else if (n.type === 'icon') Object.assign(n, { x: n.x - 16, y: n.y - 16, w: 32, h: 32 });
    else if (n.type === 'line') Object.assign(n, { w: 160, h: 0 });
    else Object.assign(n, { x: n.x - 50, y: n.y - 50, w: 100, h: 100 });
  }

  /** A part of a picture as a new picture on top of it, sharing the same pixels. */
  cutOut(img: ImageNode, area: Box, name?: string): ImageNode | null {
    const b = bounds(img);
    const x1 = Math.max(area.x, b.x), y1 = Math.max(area.y, b.y), x2 = Math.min(area.x + area.w, b.x + b.w), y2 = Math.min(area.y + area.h, b.y + b.h);
    if (x2 - x1 < 2 || y2 - y1 < 2) return null;
    const crop = img.crop ?? { x: 0, y: 0, w: img.nw, h: img.nh };
    const kx = crop.w / img.w, ky = crop.h / img.h;
    const n: ImageNode = { ...structuredClone(img), id: uid(), name, x: x1, y: y1, w: x2 - x1, h: y2 - y1, crop: { x: crop.x + (x1 - img.x) * kx, y: crop.y + (y1 - img.y) * ky, w: (x2 - x1) * kx, h: (y2 - y1) * ky } };
    delete n.locked;
    this.add([n]);
    return n;
  }

  // ——— Snapping ———

  private snapLines(skip: Set<string>) {
    const xs: number[] = [], ys: number[] = [];
    const r = this.stage.getBoundingClientRect();
    const a = this.toWorld(r.left, r.top), b = this.toWorld(r.right, r.bottom);
    const seen = { x: a.x, y: a.y, w: b.x - a.x, h: b.y - a.y };
    for (const n of this.doc.nodes) {
      if (skip.has(n.id) || n.hidden || n.type === 'pin') continue;
      const o = bounds(n);
      if (!overlaps(o, seen)) continue;
      xs.push(o.x, o.x + o.w / 2, o.x + o.w);
      ys.push(o.y, o.y + o.h / 2, o.y + o.h);
    }
    return { xs, ys };
  }

  private snapBox(box: Box, skip: Set<string>) {
    this.guides = [];
    if (this.doc.settings?.snap === false) return { dx: 0, dy: 0 };
    const tol = 6 / this.view.zoom;
    const { xs, ys } = this.snapLines(skip);
    const best = (vals: number[], lines: number[]) => {
      let d = Infinity, at: number | undefined;
      for (const v of vals) for (const l of lines) if (Math.abs(l - v) < Math.abs(d) && Math.abs(l - v) <= tol) (d = l - v), (at = l);
      return { d: at === undefined ? 0 : d, at };
    };
    const bx = best([box.x, box.x + box.w / 2, box.x + box.w], xs);
    const by = best([box.y, box.y + box.h / 2, box.y + box.h], ys);
    let { d: dx } = bx, { d: dy } = by;
    if (this.doc.settings?.grid && bx.at === undefined) dx = Math.round(box.x / 8) * 8 - box.x;
    if (this.doc.settings?.grid && by.at === undefined) dy = Math.round(box.y / 8) * 8 - box.y;
    if (bx.at !== undefined) this.guides.push({ x: bx.at });
    if (by.at !== undefined) this.guides.push({ y: by.at });
    return { dx, dy };
  }

  private snapPoint(x: number, y: number, skip: Set<string>) {
    const s = this.snapBox({ x, y, w: 0, h: 0 }, skip);
    return { x: x + s.dx, y: y + s.dy };
  }

  // ——— Wheel, double-click, keys ———

  private onWheel = (e: WheelEvent) => {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) this.zoomTo(this.view.zoom * Math.exp(-e.deltaY * (e.deltaMode ? 0.05 : 0.0025) * 4), e.clientX, e.clientY);
    else {
      const k = e.deltaMode ? 16 : 1;
      this.view.x -= (e.shiftKey && !e.deltaX ? e.deltaY : e.deltaX) * k;
      this.view.y -= (e.shiftKey && !e.deltaX ? 0 : e.deltaY) * k;
      this.paintView();
    }
    clearTimeout(this.saveTimer);
    this.saveTimer = window.setTimeout(() => void this.saveNow(), 800);
  };

  private onDouble = (e: MouseEvent) => {
    const t = e.target as Element;
    const frameName = t.getAttribute('data-frame');
    if (frameName) return this.hooks.focusNote();
    const w = this.toWorld(e.clientX, e.clientY);
    const n = this.hit(w.x, w.y);
    if (!n) return;
    // Into a frame: the thing inside it under the pointer.
    if (n.type === 'frame') return;
    this.edit(n);
  };

  setSpace(down: boolean) {
    this.space = down;
    this.stage.classList.toggle('space', down);
  }

  setAlt(down: boolean) {
    if (this.alt === down) return;
    this.alt = down;
    if (!down && this.hoverDom) (this.hoverDom = null), this.paintOver();
  }

  nudge(dx: number, dy: number) {
    this.update(
      this.selected.flatMap((n) => [n, ...(n.type === 'frame' ? descendants(this.doc.nodes, n.id) : [])]).filter((n) => !n.locked).map((n) => n.id),
      (n) => ((n.x += dx), (n.y += dy)),
    );
  }
}

const distToSegment = (px: number, py: number, x1: number, y1: number, x2: number, y2: number) => {
  const dx = x2 - x1, dy = y2 - y1;
  const len = dx * dx + dy * dy;
  const t = len ? Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / len)) : 0;
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
};

const nearPath = (n: PathNode, x: number, y: number, tol: number) => {
  const kx = n.bw ? n.w / n.bw : 1, ky = n.bh ? n.h / n.bh : 1;
  const p = n.points;
  if (p.length === 2) return Math.hypot(n.x + p[0] * kx - x, n.y + p[1] * ky - y) <= tol;
  for (let i = 0; i < p.length - 2; i += 2) if (distToSegment(x, y, n.x + p[i] * kx, n.y + p[i + 1] * ky, n.x + p[i + 2] * kx, n.y + p[i + 3] * ky) <= tol) return true;
  return false;
};

/** Holds a line to 0°, 45°, 90° … */
const angleSnap = (x0: number, y0: number, x: number, y: number) => {
  const a = Math.round(Math.atan2(y - y0, x - x0) / (Math.PI / 4)) * (Math.PI / 4);
  const d = Math.hypot(x - x0, y - y0);
  return { x: x0 + Math.cos(a) * d, y: y0 + Math.sin(a) * d };
};
