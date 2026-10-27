// The studio around the canvas: the top bar, the tool bar, layers, notes and the library on the left, the properties
// on the right, menus, the command palette, the shortcuts, copy and paste, pictures, capture, export and import.
import { toBrief, slug } from './brief';
import { captureTab } from './capture';
import type { Capture } from './capture';
import { Editor } from './editor';
import type { Tool } from './editor';
import { ICONS, ICON_GROUPS } from './iconData';
import { comboOf, kbd } from './keys';
import { DEVICES, SYSTEM_FONTS, TEMPLATES, WEB_FONTS, WIDGETS, loadFont } from './library';
import { KINDS, PRIORITIES, VERSION, bounds, cloneNodes, descendants, domAt, domBox, isDoc, label, newDoc, overlaps, uid, union } from './model';
import type { Doc, DomBox, FrameNode, ImageNode, PinNode, Priority, SNode, Target, TextNode } from './model';
import { PIN, PRIORITY_COLOUR, esc, toPng, toSvg } from './render';
import { CSS } from './styles';
import { deleteDoc, deleteItem, lastDocId, listDocs, listItems, loadDoc, saveDoc, saveItem } from './store';

export interface PinInput {
  /** Where on the captured window, in CSS pixels. */
  x: number;
  y: number;
  text: string;
  kinds?: string[];
  priority?: Priority;
  done?: boolean;
  target?: Target;
}

export interface StudioOptions {
  /** The page is Sandesigning itself (no close button, no capture). */
  standalone?: boolean;
  /** Where sandesigning.html, sandesigning.js and SANDESIGNING.md are served from, ending in '/'. */
  base?: string;
  onClose?: () => void;
}

const icon = (name: string, size = 16) => `<svg class="i" viewBox="0 0 24 24" width="${size}" height="${size}">${ICONS[name] ?? ''}</svg>`;

interface Action {
  id: string;
  label: string;
  group: string;
  keys?: string[];
  run: () => void;
  /** Only offered when this says so. */
  when?: () => boolean;
}

const TOOLS: { tool: Tool; icon: string; label: string; key: string; hint: string; more?: boolean }[] = [
  { tool: 'select', icon: 'mouse-pointer-2', label: 'Select', key: 'v', hint: '' },
  { tool: 'hand', icon: 'hand', label: 'Hand', key: 'h', hint: 'Drag to move around. Space does the same with any tool.' },
  { tool: 'frame', icon: 'frame', label: 'Frame', key: 'f', hint: 'Drag a frame, or click for a {device}. Click the tool again for other sizes.', more: true },
  { tool: 'rect', icon: 'square', label: 'Rectangle', key: 'r', hint: 'Drag a rectangle. Shift makes a square, Alt draws from the middle.' },
  { tool: 'ellipse', icon: 'circle', label: 'Ellipse', key: 'o', hint: 'Drag an ellipse. Shift makes a circle.' },
  { tool: 'line', icon: 'minus', label: 'Line', key: 'l', hint: 'Drag a line. Shift keeps it straight or at 45°.' },
  { tool: 'arrow', icon: 'move-up-right', label: 'Arrow', key: 'shift+l', hint: 'Drag an arrow to point at something.' },
  { tool: 'pen', icon: 'pen-line', label: 'Pen', key: 'p', hint: 'Draw freely. The colour and width are on the right.' },
  { tool: 'highlighter', icon: 'highlighter', label: 'Highlighter', key: 'shift+p', hint: 'Mark over anything, see-through.' },
  { tool: 'eraser', icon: 'eraser', label: 'Eraser', key: 'e', hint: 'Drag over drawings and lines to take them away.' },
  { tool: 'text', icon: 'type', label: 'Text', key: 't', hint: 'Click and type. Ctrl Enter or Esc to finish.' },
  { tool: 'sticky', icon: 'sticky-note', label: 'Sticky note', key: 's', hint: 'Click to stick a note anywhere.' },
  { tool: 'pin', icon: 'message-square-plus', label: 'Design note', key: 'n', hint: 'Click to pin a numbered note. On a captured screenshot it knows which element it’s on.' },
  { tool: 'widget', icon: 'layout-template', label: 'Widget outline', key: 'w', hint: 'Drag or click to lay out a {widget}. Click the tool again for others.', more: true },
  { tool: 'icon', icon: 'smile', label: 'Icon', key: 'k', hint: 'Click or drag to place the {icon} icon. Click the tool again to choose another.', more: true },
  { tool: 'cut', icon: 'scissors', label: 'Cut out', key: 'c', hint: 'Drag over a picture to cut a part out of it, then move it. Alt-click lifts a captured element.' },
];
const GROUPS_AFTER = new Set<Tool>(['hand', 'arrow', 'eraser', 'pin']);

const STICKY_COLOURS = ['#fef08a', '#fed7aa', '#fecdd3', '#e9d5ff', '#bfdbfe', '#bbf7d0', '#e5e7eb'];
const SWATCHES = ['#0f172a', '#475569', '#94a3b8', '#e2e8f0', '#ffffff', '#e11d48', '#f97316', '#facc15', '#16a34a', '#0ea5e9', '#4f46e5', '#a855f7'];

const download = (blob: Blob, name: string) => {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
};

const readAsDataUrl = (file: Blob) =>
  new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = () => rej(r.error);
    r.readAsDataURL(file);
  });

const ago = (t: number) => {
  const m = Math.round((Date.now() - t) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  if (m < 60 * 24) return `${Math.round(m / 60)} h ago`;
  return new Date(t).toLocaleDateString();
};

export class Studio {
  readonly el: HTMLDivElement;
  readonly ed: Editor;
  private left: HTMLElement;
  private right: HTMLElement;
  private leftTab: 'layers' | 'notes' | 'library' = 'layers';
  private iconQuery = '';
  private pointer: { x: number; y: number } | null = null;
  private clip: { nodes: SNode[]; assets: Record<string, string>; dom: Record<string, DomBox[]> } | null = null;
  private actions: Action[] = [];
  private menuEl: HTMLElement | null = null;
  private veil: HTMLElement | null = null;
  private tip: HTMLElement;
  private bound = new Map<string, (v: string, el: HTMLInputElement) => void>();
  private lastSel = '';
  private renaming: string | null = null;
  private press: (d: DOMStringMap) => void = () => {};

  constructor(
    readonly root: ShadowRoot,
    readonly opts: StudioOptions = {},
  ) {
    const style = document.createElement('style');
    style.textContent = CSS;
    root.appendChild(style);
    this.el = document.createElement('div');
    this.el.className = 'sd';
    this.el.dataset.theme = this.theme;
    this.el.innerHTML = `
      <header class="top">
        <div class="brand"><b>S</b>sandesigning</div>
        <button class="btn" data-menu="file">File ${icon('chevron-down', 14)}</button>
        <input class="title" aria-label="Canvas name" spellcheck="false">
        <span class="spacer"></span>
        <span class="status"></span>
        ${opts.standalone ? '' : `<button class="btn" data-act="capture" title="Capture this page">${icon('camera')} Capture page</button>`}
        <button class="btn icon" data-act="palette" title="Find any action (${comboTitle('mod+k')})">${icon('search')}</button>
        <button class="btn icon" data-act="keys" title="Every shortcut (?)">${icon('keyboard')}</button>
        <button class="btn icon" data-act="theme" title="Light or dark">${icon('moon')}</button>
        <button class="btn primary" data-menu="export">${icon('download', 15)} Export</button>
        ${opts.standalone ? '' : `<button class="btn icon" data-act="close" title="Close (saved)">${icon('x')}</button>`}
      </header>
      <aside class="left"><div class="tabs" role="tablist"></div><div class="lp"></div></aside>
      <main class="stage" tabindex="0"></main>
      <aside class="right"></aside>
      <div class="toasts"></div>`;
    root.appendChild(this.el);
    this.left = this.el.querySelector('.left')!;
    this.right = this.el.querySelector('.right')!;
    const stage = this.el.querySelector<HTMLElement>('.stage')!;
    this.ed = new Editor(stage, { changed: (full) => this.refresh(full), toast: (m) => this.toast(m), focusNote: () => requestAnimationFrame(() => this.right.querySelector<HTMLElement>('[data-focus]')?.focus()) });
    stage.insertAdjacentHTML('beforeend', `<div class="toolbar" role="toolbar" aria-label="Tools"></div><div class="hint"></div><div class="zoomer"><button class="btn icon" data-act="zoom-out" title="Zoom out (−)">${icon('zoom-out')}</button><button class="btn zoom" data-act="zoom-menu"></button><button class="btn icon" data-act="zoom-in" title="Zoom in (+)">${icon('zoom-in')}</button></div><div class="drop">Drop pictures or a .sandesign file</div>`);
    this.tip = document.createElement('div');
    this.tip.className = 'tip';
    this.tip.hidden = true;
    this.el.appendChild(this.tip);
    this.buildToolbar();
    this.actions = this.makeActions();
    this.wire(stage);
  }

  // ——— Starting ———

  async start(doc?: Doc) {
    if (doc) return this.ed.load(doc);
    const id = lastDocId();
    const last = id ? await loadDoc(id).catch(() => undefined) : undefined;
    this.ed.load(last ?? newDoc('Untitled canvas'));
  }

  destroy() {
    window.removeEventListener('keydown', this.onKey, true);
    window.removeEventListener('keyup', this.onKeyUp, true);
    window.removeEventListener('paste', this.onPaste, true);
    window.removeEventListener('copy', this.onCopy, true);
    window.removeEventListener('cut', this.onCut, true);
    void this.ed.saveNow();
  }

  private get theme() {
    try {
      return localStorage.getItem('sandesigning:theme') ?? 'auto';
    } catch {
      return 'auto';
    }
  }

  // ——— Wiring ———

  private wire(stage: HTMLElement) {
    window.addEventListener('keydown', this.onKey, true);
    window.addEventListener('keyup', this.onKeyUp, true);
    window.addEventListener('paste', this.onPaste, true);
    window.addEventListener('copy', this.onCopy, true);
    window.addEventListener('cut', this.onCut, true);
    stage.addEventListener('pointermove', (e) => (this.pointer = { x: e.clientX, y: e.clientY }));
    stage.addEventListener('pointerleave', () => (this.pointer = null));
    stage.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      this.contextMenu(e);
    });
    stage.addEventListener('dragover', (e) => {
      e.preventDefault();
      stage.classList.add('dropping');
    });
    stage.addEventListener('dragleave', () => stage.classList.remove('dropping'));
    stage.addEventListener('drop', (e) => {
      e.preventDefault();
      stage.classList.remove('dropping');
      void this.onDrop(e);
    });
    const title = this.el.querySelector<HTMLInputElement>('.title')!;
    title.addEventListener('change', () => {
      this.ed.doc.title = title.value.trim() || 'Untitled canvas';
      this.ed.scheduleSave();
    });
    title.addEventListener('keydown', (e) => e.key === 'Enter' && title.blur());
    this.el.addEventListener('click', (e) => {
      const t = (e.target as Element).closest<HTMLElement>('[data-act],[data-menu]');
      if (!t) return;
      if (t.dataset.menu) return this.openMenu(t.dataset.menu, t);
      this.run(t.dataset.act!);
    });
    // Tooltips with the shortcut.
    this.el.addEventListener('pointerover', (e) => {
      const t = (e.target as Element).closest<HTMLElement>('[data-tip]');
      if (!t) return void (this.tip.hidden = true);
      this.tip.innerHTML = t.dataset.tip!;
      this.tip.hidden = false;
      const r = t.getBoundingClientRect();
      const tr = this.tip.getBoundingClientRect();
      Object.assign(this.tip.style, { left: `${Math.max(8, r.left + r.width / 2 - tr.width / 2)}px`, top: `${r.top - tr.height - 8}px` });
    });
    this.el.addEventListener('pointerdown', () => (this.tip.hidden = true));
    // Panels: any field with data-b is bound to a setter made when the panel was drawn.
    const onField = (e: Event) => {
      const t = e.target as HTMLInputElement;
      const key = t.dataset?.b;
      if (key) this.bound.get(key)?.(t.type === 'checkbox' ? String(t.checked) : t.value, t);
    };
    this.right.addEventListener('pointerdown', (e) => {
      const b = (e.target as Element).closest<HTMLElement>('[data-swatch],[data-swatch-stroke],[data-swatch-color],[data-swatch-pen],[data-kind],[data-prio],[data-device],[data-talign]');
      if (!b || e.button !== 0) return;
      e.preventDefault();
      this.press(b.dataset);
    });
    this.right.addEventListener('change', onField);
    this.right.addEventListener('input', (e) => {
      const t = e.target as HTMLInputElement;
      if (t.dataset.live !== undefined) onField(e);
    });
    this.left.addEventListener('change', onField);
    this.left.addEventListener('input', (e) => {
      const t = e.target as HTMLInputElement;
      if (t.classList.contains('icon-search')) {
        this.iconQuery = t.value;
        this.drawIconGrid();
      }
    });
    this.left.querySelector('.tabs')!.addEventListener('click', (e) => {
      const t = (e.target as Element).closest<HTMLElement>('[data-tab]');
      if (!t) return;
      this.leftTab = t.dataset.tab as typeof this.leftTab;
      this.drawLeft();
    });
    this.wireLayers();
    this.wireLibrary();
  }

  private onKey = (e: KeyboardEvent) => {
    const path = e.composedPath();
    const target = path[0] as HTMLElement;
    const typing = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement || target?.isContentEditable;
    if (!path.includes(this.el) && !path.includes(this.root.host) && path[0] !== document.body && path[0] !== document.documentElement) return;
    const combo = comboOf(e);
    if (e.key === 'Escape' && (this.menuEl || this.veil)) {
      e.preventDefault();
      e.stopPropagation();
      return this.closeMenu(), this.closeDialog();
    }
    if (this.veil) return;
    if (typing) {
      if (e.key === 'Escape') target.blur();
      return;
    }
    if (e.code === 'Space') {
      e.preventDefault();
      this.ed.setSpace(true);
      return;
    }
    if (e.key === 'Alt') this.ed.setAlt(true);
    // Copy, cut and paste go through the browser's own events (so pictures can be pasted).
    if (combo === 'mod+c' || combo === 'mod+x' || combo === 'mod+v') return;
    const a = this.actions.find((x) => x.keys?.includes(combo) && (!x.when || x.when()));
    if (!a) return;
    e.preventDefault();
    e.stopPropagation();
    this.closeMenu();
    a.run();
  };

  private onKeyUp = (e: KeyboardEvent) => {
    if (e.code === 'Space') this.ed.setSpace(false);
    if (e.key === 'Alt') this.ed.setAlt(false);
  };

  private inside(e: Event) {
    const t = e.composedPath()[0] as HTMLElement;
    if (t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement || t?.isContentEditable) return false;
    return !this.veil;
  }

  private onCopy = (e: ClipboardEvent) => {
    if (!this.inside(e) || !this.ed.sel.size) return;
    e.preventDefault();
    const text = JSON.stringify(this.copyPayload());
    e.clipboardData?.setData('text/plain', text);
    this.toast(`Copied ${this.ed.sel.size === 1 ? 'it' : `${this.ed.sel.size} things`}. Paste here or in any Sandesigning canvas.`);
  };

  private onCut = (e: ClipboardEvent) => {
    if (!this.inside(e) || !this.ed.sel.size) return;
    this.onCopy(e);
    this.ed.remove([...this.ed.sel]);
  };

  private onPaste = (e: ClipboardEvent) => {
    if (!this.inside(e)) return;
    e.preventDefault();
    const data = e.clipboardData;
    const files = [...(data?.files ?? [])].filter((f) => f.type.startsWith('image/'));
    if (files.length) return void this.addFiles(files);
    const text = data?.getData('text/plain') ?? '';
    if (text.trim().startsWith('{')) {
      try {
        const v = JSON.parse(text);
        if (v?.sandesigning) return this.paste(v);
        if (isDoc(v)) return this.paste({ nodes: v.nodes, assets: v.assets, dom: v.dom ?? {} });
      } catch {
        // Not ours: it becomes text.
      }
    }
    if (text.trim()) return this.addText(text.trim());
    if (this.clip) this.paste(this.clip);
  };

  // ——— Running actions ———

  run(id: string) {
    if (id.startsWith('img-') || id === 'icon-swap') return this.extra(id);
    const a = this.actions.find((x) => x.id === id);
    if (a) return a.run();
    if (id.startsWith('tool:')) this.chooseTool(id.slice(5) as Tool);
  }

  private chooseTool(tool: Tool) {
    if (this.ed.tool === tool && (tool === 'frame' || tool === 'widget' || tool === 'icon')) {
      if (tool === 'icon') return (this.leftTab = 'library'), this.drawLeft(), this.left.querySelector<HTMLInputElement>('.icon-search')?.focus();
      const btn = this.el.querySelector<HTMLElement>(`[data-act="tool:${tool}"]`)!;
      return this.openMenu(tool, btn);
    }
    this.ed.setTool(tool);
  }

  private makeActions(): Action[] {
    const ed = this.ed;
    const has = () => ed.sel.size > 0;
    const many = () => ed.sel.size > 1;
    const tools: Action[] = TOOLS.map((t) => ({ id: `tool:${t.tool}`, label: t.label, group: 'Tools', keys: [t.key], run: () => this.chooseTool(t.tool) }));
    return [
      ...tools,
      { id: 'picture', label: 'Add a picture…', group: 'Tools', keys: ['i'], run: () => this.pickFiles('image/*', true) },
      { id: 'capture', label: 'Capture this page', group: 'Tools', keys: ['shift+s'], run: () => void this.capture(), when: () => !this.opts.standalone },
      { id: 'undo', label: 'Undo', group: 'Edit', keys: ['mod+z'], run: () => ed.undo() },
      { id: 'redo', label: 'Redo', group: 'Edit', keys: ['mod+shift+z', 'mod+y'], run: () => ed.redo() },
      { id: 'copy', label: 'Copy', group: 'Edit', keys: ['mod+c'], run: () => void this.copyToClipboard(), when: has },
      { id: 'cut', label: 'Cut', group: 'Edit', keys: ['mod+x'], run: () => void this.copyToClipboard().then(() => ed.remove([...ed.sel])), when: has },
      { id: 'paste', label: 'Paste', group: 'Edit', keys: ['mod+v'], run: () => void this.pasteFromClipboard() },
      { id: 'duplicate', label: 'Duplicate', group: 'Edit', keys: ['mod+d'], run: () => this.duplicate(), when: has },
      { id: 'delete', label: 'Delete', group: 'Edit', keys: ['delete', 'backspace'], run: () => ed.remove([...ed.sel]), when: has },
      { id: 'select-all', label: 'Select all', group: 'Edit', keys: ['mod+a'], run: () => ed.select(ed.doc.nodes.filter((n) => !n.parent && !n.hidden && !n.locked).map((n) => n.id)) },
      { id: 'escape', label: 'Deselect, or back to Select', group: 'Edit', keys: ['escape'], run: () => (ed.tool !== 'select' ? ed.setTool('select') : ed.select([])) },
      { id: 'enter', label: 'Edit text, or go into a frame', group: 'Edit', keys: ['enter'], run: () => this.enter(), when: () => ed.sel.size === 1 },
      { id: 'parent', label: 'Select the frame around', group: 'Edit', keys: ['shift+enter'], run: () => this.selectParent(), when: has },
      { id: 'next', label: 'Select the next layer', group: 'Edit', keys: ['tab'], run: () => this.selectSibling(1) },
      { id: 'prev', label: 'Select the layer before', group: 'Edit', keys: ['shift+tab'], run: () => this.selectSibling(-1) },
      ...([['arrowleft', -1, 0], ['arrowright', 1, 0], ['arrowup', 0, -1], ['arrowdown', 0, 1]] as const).flatMap(([k, dx, dy]) => [
        { id: `nudge-${k}`, label: `Move 1 px ${k.slice(5)}`, group: 'Arrange', keys: [k], run: () => ed.nudge(dx, dy), when: has },
        { id: `nudge10-${k}`, label: `Move 10 px ${k.slice(5)}`, group: 'Arrange', keys: [`shift+${k}`], run: () => ed.nudge(dx * 10, dy * 10), when: has },
      ]),
      { id: 'front', label: 'Bring to front', group: 'Arrange', keys: ['mod+]'], run: () => this.reorder('front'), when: has },
      { id: 'forward', label: 'Bring forward', group: 'Arrange', keys: [']'], run: () => this.reorder('forward'), when: has },
      { id: 'backward', label: 'Send backward', group: 'Arrange', keys: ['['], run: () => this.reorder('backward'), when: has },
      { id: 'back', label: 'Send to back', group: 'Arrange', keys: ['mod+['], run: () => this.reorder('back'), when: has },
      { id: 'frame-sel', label: 'Put the selection in a frame', group: 'Arrange', keys: ['mod+alt+g'], run: () => this.frameSelection(), when: has },
      { id: 'align-left', label: 'Align left', group: 'Arrange', keys: ['alt+a'], run: () => this.align('left'), when: has },
      { id: 'align-hc', label: 'Align centres across', group: 'Arrange', keys: ['alt+h'], run: () => this.align('hcentre'), when: has },
      { id: 'align-right', label: 'Align right', group: 'Arrange', keys: ['alt+d'], run: () => this.align('right'), when: has },
      { id: 'align-top', label: 'Align top', group: 'Arrange', keys: ['alt+w'], run: () => this.align('top'), when: has },
      { id: 'align-vc', label: 'Align middles', group: 'Arrange', keys: ['alt+v'], run: () => this.align('vcentre'), when: has },
      { id: 'align-bottom', label: 'Align bottom', group: 'Arrange', keys: ['alt+s'], run: () => this.align('bottom'), when: has },
      { id: 'dist-h', label: 'Space out evenly across', group: 'Arrange', keys: ['alt+shift+h'], run: () => this.distribute('x'), when: many },
      { id: 'dist-v', label: 'Space out evenly down', group: 'Arrange', keys: ['alt+shift+v'], run: () => this.distribute('y'), when: many },
      { id: 'lock', label: 'Lock or unlock', group: 'Arrange', keys: ['mod+shift+l'], run: () => this.toggle('locked'), when: has },
      { id: 'hide', label: 'Hide or show', group: 'Arrange', keys: ['mod+shift+h'], run: () => this.toggle('hidden'), when: has },
      ...Array.from({ length: 10 }, (_, i) => ({ id: `opacity-${i}`, label: `Opacity ${i ? i * 10 : 100}%`, group: 'Arrange', keys: [String(i)], run: () => ed.update(ed.sel, { opacity: i ? i / 10 : 1 }), when: has })),
      { id: 'fit', label: 'Zoom to everything', group: 'View', keys: ['shift+1'], run: () => ed.fit() },
      { id: 'fit-sel', label: 'Zoom to the selection', group: 'View', keys: ['shift+2'], run: () => ed.fit(union(ed.selected.map(bounds))), when: has },
      { id: 'zoom-100', label: 'Zoom to 100%', group: 'View', keys: ['shift+0'], run: () => ed.zoomTo(1) },
      { id: 'zoom-in', label: 'Zoom in', group: 'View', keys: ['mod+=', '='], run: () => ed.zoomTo(ed.view.zoom * 1.25) },
      { id: 'zoom-out', label: 'Zoom out', group: 'View', keys: ['mod+-', '-'], run: () => ed.zoomTo(ed.view.zoom / 1.25) },
      { id: 'zoom-menu', label: 'Zoom options', group: 'View', run: () => this.openMenu('zoom', this.el.querySelector('[data-act="zoom-menu"]')!) },
      { id: 'grid', label: 'Show or hide the grid', group: 'View', keys: ["mod+'"], run: () => this.setting('grid') },
      { id: 'snap', label: 'Snapping on or off', group: 'View', keys: ["mod+shift+'"], run: () => this.setting('snap') },
      { id: 'notes-text', label: 'Show or hide the notes’ words', group: 'View', keys: ['shift+n'], run: () => this.setting('notesText') },
      { id: 'panels', label: 'Hide or show the panels', group: 'View', keys: ['mod+\\'], run: () => this.el.classList.toggle('bare') },
      { id: 'theme', label: 'Light, dark or as the system', group: 'View', run: () => this.cycleTheme() },
      { id: 'palette', label: 'Find an action', group: 'Help', keys: ['mod+k', 'mod+/'], run: () => this.palette() },
      { id: 'keys', label: 'Every shortcut', group: 'Help', keys: ['shift+/'], run: () => this.shortcuts() },
      { id: 'setup', label: 'Use Sandesigning in other projects', group: 'Help', run: () => this.setup() },
      { id: 'new', label: 'New canvas', group: 'File', keys: ['mod+alt+n'], run: () => void this.newCanvas() },
      { id: 'open', label: 'Open a canvas…', group: 'File', keys: ['mod+o'], run: () => void this.openDocs() },
      { id: 'import', label: 'Open a .sandesign file…', group: 'File', keys: ['mod+shift+o'], run: () => this.pickFiles('.sandesign,.json,application/json', false) },
      { id: 'save', label: 'Save a copy (.sandesign)', group: 'File', keys: ['mod+s'], run: () => this.saveCopy() },
      { id: 'template', label: 'Save the selection as a template', group: 'File', keys: ['mod+alt+t'], run: () => void this.saveTemplate(), when: has },
      { id: 'png', label: 'Export a PNG', group: 'Export', keys: ['mod+shift+e'], run: () => void this.exportPng(false) },
      { id: 'png-sel', label: 'Export the selection as PNG', group: 'Export', run: () => void this.exportPng(true), when: has },
      { id: 'png-frames', label: 'Export each frame as PNG', group: 'Export', run: () => void this.exportFrames() },
      { id: 'svg', label: 'Export an SVG', group: 'Export', run: () => this.exportSvg() },
      { id: 'copy-png', label: 'Copy as a picture', group: 'Export', keys: ['mod+shift+x'], run: () => void this.copyPicture() },
      { id: 'brief', label: 'Brief for AI…', group: 'Export', keys: ['mod+b'], run: () => this.briefDialog() },
      { id: 'copy-brief', label: 'Copy the brief for AI', group: 'Export', keys: ['mod+shift+c'], run: () => void this.copyBrief() },
      { id: 'brief-files', label: 'Download the brief and its picture', group: 'Export', run: () => void this.briefFiles() },
      { id: 'close', label: 'Close Sandesigning', group: 'File', run: () => this.opts.onClose?.(), when: () => !this.opts.standalone },
    ];
  }

  // ——— Drawing the studio ———

  private buildToolbar() {
    const bar = this.el.querySelector('.toolbar')!;
    bar.innerHTML = TOOLS.map((t) => `<button class="tool" data-act="tool:${t.tool}" aria-label="${t.label}" data-tip="${esc(t.label)} ${kbd(t.key)}">${icon(t.icon, 18)}${t.more ? '<i class="more"></i>' : ''}</button>${GROUPS_AFTER.has(t.tool) ? '<span class="sepv"></span>' : ''}`).join('') + `<span class="sepv"></span><button class="tool" data-act="picture" aria-label="Add a picture" data-tip="Add a picture ${kbd('i')}">${icon('image', 18)}</button>`;
  }

  private refresh(full: boolean) {
    const ed = this.ed;
    const title = this.el.querySelector<HTMLInputElement>('.title')!;
    if (this.root.activeElement !== title) title.value = ed.doc.title;
    this.el.querySelector('.status')!.textContent = ed.saved ? 'Saved on this device' : 'Saving…';
    this.el.querySelector('[data-act="zoom-menu"]')!.textContent = `${Math.round(ed.view.zoom * 100)}%`;
    if (!full) return;
    for (const b of this.el.querySelectorAll<HTMLElement>('.toolbar [data-act^="tool:"]')) b.setAttribute('aria-pressed', String(b.dataset.act === `tool:${ed.tool}`));
    const t = TOOLS.find((x) => x.tool === ed.tool);
    this.el.querySelector('.hint')!.textContent = (t?.hint ?? '')
      .replace('{device}', DEVICES.find((d) => d.id === ed.device)?.name.toLowerCase() + ' frame')
      .replace('{widget}', (WIDGETS.find((w) => w.id === ed.widget)?.name ?? '').toLowerCase())
      .replace('{icon}', ed.icon);
    this.drawLeft();
    const sel = [...ed.sel].join() + ed.tool;
    // While a field on the right has focus, it isn't redrawn under the typing.
    const picking = (this.root.activeElement as HTMLInputElement | null)?.type === 'color';
    if (sel !== this.lastSel || !picking) this.drawRight();
    this.lastSel = sel;
  }

  private drawLeft() {
    const tabs = this.left.querySelector('.tabs')!;
    const pins = this.ed.doc.nodes.filter((n) => n.type === 'pin').length;
    tabs.innerHTML = (['layers', 'notes', 'library'] as const).map((t) => `<button data-tab="${t}" role="tab" aria-selected="${this.leftTab === t}">${t === 'layers' ? 'Layers' : t === 'notes' ? `Notes${pins ? ` ${pins}` : ''}` : 'Library'}</button>`).join('');
    const lp = this.left.querySelector('.lp')!;
    if (this.leftTab === 'layers') lp.innerHTML = this.layersHtml();
    else if (this.leftTab === 'notes') lp.innerHTML = this.notesHtml();
    else if (!lp.querySelector('.library')) {
      lp.innerHTML = this.libraryHtml();
      void this.drawYours();
      this.drawIconGrid();
    } else this.markLibrary();
  }

  private layersHtml() {
    const nodes = this.ed.doc.nodes;
    if (!nodes.length) return `<p class="empty">Nothing here yet. Pick a tool below, paste a screenshot (Ctrl V), or start from a template in the Library.</p>`;
    const typeIcon: Record<string, string> = { frame: 'frame', rect: 'square', ellipse: 'circle', line: 'minus', path: 'pen-line', text: 'type', sticky: 'sticky-note', pin: 'message-square-plus', image: 'image', widget: 'layout-template', icon: 'smile' };
    // Top of the list is the top of the canvas: children under their frame, last drawn first.
    const out: string[] = [];
    const walk = (pid: string | undefined, depth: number) => {
      const kids = nodes.filter((n) => n.parent === pid);
      for (let i = kids.length - 1; i >= 0; i--) {
        const n = kids[i];
        const on = this.ed.sel.has(n.id);
        const nm = this.renaming === n.id ? `<input value="${esc(label(n))}" data-rename="${n.id}">` : esc(label(n));
        out.push(`<div class="layer${on ? ' on' : ''}${n.hidden ? ' dim' : ''}" data-layer="${n.id}" draggable="true" style="padding-left:${8 + depth * 14}px"><span class="t">${icon(n.type === 'line' && n.end === 'arrow' ? 'move-up-right' : (typeIcon[n.type] ?? 'square'), 14)}</span><span class="nm">${nm}</span><button class="act${n.locked ? ' keep' : ''}" data-lock="${n.id}" title="${n.locked ? 'Unlock' : 'Lock'}">${icon(n.locked ? 'lock' : 'lock-open', 13)}</button><button class="act${n.hidden ? ' keep' : ''}" data-hide="${n.id}" title="${n.hidden ? 'Show' : 'Hide'}">${icon(n.hidden ? 'eye-off' : 'eye', 13)}</button></div>`);
        if (n.type === 'frame') walk(n.id, depth + 1);
      }
    };
    walk(undefined, 0);
    return `<div style="padding:6px 0">${out.join('')}</div>`;
  }

  private notesHtml() {
    const pins = this.ed.doc.nodes.filter((n): n is PinNode => n.type === 'pin');
    if (!pins.length) return `<p class="empty">No notes yet. Choose Design note (${kbd('n')}) and click anywhere: on a screenshot, on a box, on a word. Each note gets a number, a priority and what it’s about, and they all go into the brief for AI.</p>`;
    const rows = pins
      .map((p) => `<div class="ln${this.ed.sel.has(p.id) ? ' on' : ''}" data-note="${p.id}"><span class="dot" style="background:${p.done ? '#94a3b8' : (PRIORITY_COLOUR[p.priority ?? ''] ?? '#7c3aed')}">${p.n}</span><span><b>${esc(p.priority ?? '')}${p.kinds.length ? ` · ${esc(p.kinds.join(', '))}` : ''}</b>${p.priority || p.kinds.length ? '<br>' : ''}${esc(p.text || 'No words yet')}${p.target ? `<br><span style="color:var(--faint)">on ${esc(p.target.name)}</span>` : ''}</span></div>`)
      .join('');
    return `<div class="sec list-notes">${rows}</div><div class="sec"><div class="row"><button class="btn primary" data-act="copy-brief">${icon('copy', 14)} Copy brief for AI</button></div><div class="row"><button class="btn" data-act="brief">See the brief</button></div></div>`;
  }

  private libraryHtml() {
    const tpl = TEMPLATES.map((t) => `<button class="card" data-template="${t.id}" draggable="true" data-drag="template:${t.id}"><b>${esc(t.name)}</b><span>${esc(t.note)}</span></button>`).join('');
    const widgets = WIDGETS.map((w) => `<button class="chip" data-widget="${w.id}" draggable="true" data-drag="widget:${w.id}" aria-pressed="false">${esc(w.name)}</button>`).join('');
    return `<div class="library">
      <div class="sec"><h3>Pictures</h3><div class="row"><button class="btn" data-act="picture">${icon('image', 14)} Add…</button>${this.opts.standalone ? '' : `<button class="btn" data-act="capture">${icon('camera', 14)} Capture</button>`}</div><p style="color:var(--faint);margin:8px 0 0">Or paste a screenshot (${kbd('mod+v')}) of any app, phone or website, or drop files here.</p></div>
      <div class="sec"><h3>Templates</h3><div class="cards">${tpl}</div></div>
      <div class="sec yours"><h3>Yours</h3><div class="thumbs"></div></div>
      <div class="sec"><h3>Widget outlines <kbd>W</kbd></h3><div class="chips widgets">${widgets}</div></div>
      <div class="sec"><h3>Icons <kbd>K</kbd></h3><input class="search icon-search" placeholder="Search ${Object.keys(ICONS).length} icons" value="${esc(this.iconQuery)}"><div class="icons"></div></div>
    </div>`;
  }

  private markLibrary() {
    for (const b of this.left.querySelectorAll<HTMLElement>('[data-widget]')) b.setAttribute('aria-pressed', String(this.ed.tool === 'widget' && this.ed.widget === b.dataset.widget));
    for (const b of this.left.querySelectorAll<HTMLElement>('[data-icon]')) b.setAttribute('aria-pressed', String(this.ed.tool === 'icon' && this.ed.icon === b.dataset.icon));
  }

  private drawIconGrid() {
    const grid = this.left.querySelector('.icons');
    if (!grid) return;
    const q = this.iconQuery.trim().toLowerCase();
    const names = q ? Object.keys(ICONS).filter((n) => n.includes(q)) : [...new Set(Object.values(ICON_GROUPS).flat())];
    grid.innerHTML = names.map((n) => `<button data-icon="${n}" title="${n}" draggable="true" data-drag="icon:${n}" aria-pressed="false">${icon(n, 18)}</button>`).join('') || `<p class="empty" style="grid-column:1/-1">No icon called that.</p>`;
    this.markLibrary();
  }

  private async drawYours() {
    const box = this.left.querySelector('.yours .thumbs');
    if (!box) return;
    const items = await listItems().catch(() => []);
    box.innerHTML = items.length
      ? items.map((i) => `<div class="card" data-item="${i.id}" draggable="true" data-drag="item:${i.id}" style="cursor:pointer">${i.kind === 'picture' && Object.values(i.assets)[0] ? `<img alt="" src="${Object.values(i.assets)[0]}">` : ''}<b>${esc(i.name)}</b><span>${i.kind === 'picture' ? 'Picture' : `${i.nodes.length} things`}</span><button class="x" data-unsave="${i.id}" title="Remove from the library">${icon('trash-2', 13)}</button></div>`).join('')
      : `<p style="color:var(--faint);grid-column:1/-1;margin:0">Select things and choose Save as template (${kbd('mod+alt+t')}), or save a picture from its panel. They stay in this browser.</p>`;
  }

  // ——— The right panel ———

  private drawRight() {
    this.bound.clear();
    const ed = this.ed;
    const chosen = ed.selected;
    let html = '';
    const bind = (key: string, f: (v: string, el: HTMLInputElement) => void) => (this.bound.set(key, f), key);
    const num = (lbl: string, value: number, key: string, f: (v: number) => void, step = 1) => `<label class="f"><span>${lbl}</span><input type="number" step="${step}" value="${Math.round(value * 100) / 100}" data-b="${bind(key, (v) => Number.isFinite(parseFloat(v)) && f(parseFloat(v)))}"></label>`;
    const colour = (lbl: string, value: string | undefined, key: string, f: (v: string) => void) => {
      const v = value && value !== 'none' && value.startsWith('#') ? value.slice(0, 7) : '#000000';
      bind(key, (x) => f(x));
      bind(`${key}-hex`, (x) => /^#?[0-9a-f]{3,8}$/i.test(x.trim()) && f(x.trim().startsWith('#') ? x.trim() : `#${x.trim()}`));
      return `<label class="f"><input type="color" value="${v}" data-b="${key}" data-live><input value="${esc(value ?? 'none')}" data-b="${key}-hex" aria-label="${lbl}"></label>`;
    };
    const sec = (title: string, body: string, extra = '') => `<div class="sec"><h3>${title}${extra}</h3>${body}</div>`;
    const ids = () => [...ed.sel];
    const set = (patch: Record<string, unknown>) => ed.update(ids(), patch as Partial<SNode>);

    if (!chosen.length) {
      const s = ed.doc.settings ?? {};
      html += sec('Canvas', `<label class="check"><input type="checkbox" ${s.grid ? 'checked' : ''} data-b="${bind('grid', () => this.setting('grid'))}"> Grid ${kbd("mod+'")}</label><label class="check"><input type="checkbox" ${s.snap !== false ? 'checked' : ''} data-b="${bind('snap', () => this.setting('snap'))}"> Snap to other things</label><label class="check"><input type="checkbox" ${s.notesText !== false ? 'checked' : ''} data-b="${bind('notesText', () => this.setting('notesText'))}"> Show the notes’ words ${kbd('shift+n')}</label>`);
      if (ed.tool === 'pen' || ed.tool === 'highlighter') {
        const st = ed.tool === 'pen' ? ed.pen : ed.marker;
        html += sec(ed.tool === 'pen' ? 'Pen' : 'Highlighter', `<div class="grid2">${colour('Colour', st.color, 'pen-c', (v) => ((st.color = v), this.drawRight()))}${num('W', st.width, 'pen-w', (v) => (st.width = Math.max(1, v)))}</div><div class="swatches">${SWATCHES.map((c) => `<button style="background:${c}" data-swatch-pen="${c}" title="${c}"></button>`).join('')}</div>`);
      }
      if (ed.tool === 'frame') html += sec('Frame size', `<div class="chips">${DEVICES.map((d) => `<button class="chip" data-device="${d.id}" aria-pressed="${ed.device === d.id}">${d.name} <span style="opacity:.6">${d.w}×${d.h}</span></button>`).join('')}</div>`);
      const pins = ed.doc.nodes.filter((n) => n.type === 'pin');
      html += sec('For AI', `<p style="margin:0 0 8px;color:var(--soft)">${ed.doc.nodes.length} things, ${pins.length} ${pins.length === 1 ? 'note' : 'notes'}. The brief writes them all down, with every position, for any AI model to build from.</p><div class="row"><button class="btn primary" data-act="copy-brief">${icon('copy', 14)} Copy brief</button><button class="btn" data-act="copy-png">${icon('image', 14)} Copy picture</button></div>`);
      html += sec('Quick keys', `<div class="keys" style="columns:1">${['v Select', 'f Frame', 'r Rectangle', 't Text', 'n Design note', 'w Widget outline', 'p Pen', 'mod+k Find any action', 'shift+/ Every shortcut'].map((s) => {
        const [k, ...l] = s.split(' ');
        return `<div class="kr"><span>${l.join(' ')}</span><span>${kbd(k)}</span></div>`;
      }).join('')}</div>`);
      this.right.innerHTML = html;
      return;
    }

    const first = chosen[0];
    const same = chosen.every((n) => n.type === first.type);
    const area = union(chosen.map(bounds))!;
    const kindName = same ? (first.type === 'pin' ? 'Note' : first.type === 'widget' ? 'Widget outline' : first.type[0].toUpperCase() + first.type.slice(1)) : 'Mixed';
    const head = `<div class="row" style="margin:0 0 10px"><b style="flex:1;font-size:13px">${chosen.length > 1 ? `${chosen.length} chosen · ${kindName}` : esc(label(first))}</b><button class="btn icon" data-act="duplicate" title="Duplicate (${comboTitle('mod+d')})" style="flex:none">${icon('copy', 15)}</button><button class="btn icon" data-act="front" title="Bring to front" style="flex:none">${icon('bring-to-front', 15)}</button><button class="btn icon" data-act="back" title="Send to back" style="flex:none">${icon('send-to-back', 15)}</button><button class="btn icon" data-act="delete" title="Delete" style="flex:none">${icon('trash-2', 15)}</button></div>`;
    const moveBy = (dx: number, dy: number) => ed.nudge(dx, dy);
    let pos = `<div class="grid2">${num('X', area.x, 'x', (v) => moveBy(v - area.x, 0))}${num('Y', area.y, 'y', (v) => moveBy(0, v - area.y))}`;
    if (!(chosen.length === 1 && first.type === 'pin'))
      pos += `${num('W', area.w, 'w', (v) => this.resizeSel(Math.max(1, v), area.h))}${num('H', area.h, 'h', (v) => this.resizeSel(area.w, Math.max(1, v)))}`;
    pos += `</div><div class="row">${num('%', Math.round((first.opacity ?? 1) * 100), 'opacity', (v) => set({ opacity: Math.max(0, Math.min(100, v)) / 100 }))}</div>`;
    html += sec('', head + pos).replace('<h3></h3>', '');
    const alignBtns = ([['align-left', 'align-start-vertical'], ['align-hc', 'align-center-vertical'], ['align-right', 'align-end-vertical'], ['align-top', 'align-start-horizontal'], ['align-vc', 'align-center-horizontal'], ['align-bottom', 'align-end-horizontal']] as const)
      .map(([a, i]) => `<button data-act="${a}" title="${this.actions.find((x) => x.id === a)?.label}">${icon(i, 15)}</button>`)
      .join('');
    html += sec('Align', `<div class="seg">${alignBtns}${chosen.length > 2 ? `<button data-act="dist-h" title="Space out across">${icon('align-horizontal-distribute-center', 15)}</button><button data-act="dist-v" title="Space out down">${icon('align-vertical-distribute-center', 15)}</button>` : ''}</div>`);

    const fillStroke = (n: { fill?: string; stroke?: string; strokeWidth?: number; dash?: boolean }, withFill = true) =>
      (withFill ? `<div class="row">${colour('Fill', n.fill, 'fill', (v) => set({ fill: v }))}<label class="check" style="flex:none;margin:0"><input type="checkbox" ${!n.fill || n.fill === 'none' ? 'checked' : ''} data-b="${bind('nofill', (v) => set({ fill: v === 'true' ? 'none' : '#e2e8f0' }))}"> None</label></div>` : '') +
      `<div class="row">${colour('Stroke', n.stroke, 'stroke', (v) => set({ stroke: v, strokeWidth: n.strokeWidth || 1 }))}${num('px', n.strokeWidth ?? 0, 'sw', (v) => set({ strokeWidth: Math.max(0, v), stroke: n.stroke ?? '#0f172a' }))}</div>` +
      `<div class="swatches">${SWATCHES.map((c) => `<button style="background:${c}" data-swatch="${c}" title="${c}"></button>`).join('')}</div>`;

    if (same) {
      switch (first.type) {
        case 'frame':
          html += sec('Frame', `<label class="f"><span>Name</span><input value="${esc(first.name ?? '')}" data-focus data-b="${bind('name', (v) => set({ name: v }))}"></label><div class="row"><label class="f"><select data-b="${bind('device', (v) => this.setDevice(v))}"><option value="">Any size</option>${DEVICES.map((d) => `<option value="${d.id}" ${first.device === d.id ? 'selected' : ''}>${d.name} · ${d.w}×${d.h}</option>`).join('')}</select></label>${num('◜', first.radius ?? 0, 'radius', (v) => set({ radius: Math.max(0, v) }))}</div><label class="check"><input type="checkbox" ${first.clip ? 'checked' : ''} data-b="${bind('clip', (v) => set({ clip: v === 'true' }))}"> Cut off what spills out</label>`);
          html += sec('Background', fillStroke(first));
          break;
        case 'rect':
        case 'ellipse':
          html += sec('Look', (first.type === 'rect' ? `<div class="row">${num('◜', first.radius ?? 0, 'radius', (v) => set({ radius: Math.max(0, v) }))}<label class="check" style="margin:0"><input type="checkbox" ${first.dash ? 'checked' : ''} data-b="${bind('dash', (v) => set({ dash: v === 'true' }))}"> Dashed</label></div>` : '') + fillStroke(first));
          break;
        case 'line': {
          const ends = (k: 'start' | 'end', v?: string) => `<label class="f"><span>${k === 'start' ? 'From' : 'To'}</span><select data-b="${bind(k, (x) => set({ [k]: x }))}">${['none', 'arrow', 'dot'].map((o) => `<option ${(v ?? 'none') === o ? 'selected' : ''}>${o}</option>`).join('')}</select></label>`;
          html += sec('Line', `<div class="row">${colour('Colour', first.stroke, 'stroke', (v) => set({ stroke: v }))}${num('px', first.strokeWidth, 'sw', (v) => set({ strokeWidth: Math.max(0.5, v) }))}</div><div class="grid2" style="margin-top:6px">${ends('start', first.start)}${ends('end', first.end)}</div><label class="check"><input type="checkbox" ${first.dash ? 'checked' : ''} data-b="${bind('dash', (v) => set({ dash: v === 'true' }))}"> Dashed</label><div class="swatches">${SWATCHES.map((c) => `<button style="background:${c}" data-swatch-stroke="${c}"></button>`).join('')}</div>`);
          break;
        }
        case 'path':
          html += sec(first.highlight ? 'Highlight' : 'Drawing', `<div class="row">${colour('Colour', first.stroke, 'stroke', (v) => set({ stroke: v }))}${num('px', first.strokeWidth, 'sw', (v) => set({ strokeWidth: Math.max(0.5, v) }))}</div><div class="swatches">${SWATCHES.map((c) => `<button style="background:${c}" data-swatch-stroke="${c}"></button>`).join('')}</div>`);
          break;
        case 'text':
          html += sec('Text', this.textFields(first, bind, num, colour, set));
          break;
        case 'sticky':
          html += sec('Sticky note', `<div class="swatches">${STICKY_COLOURS.map((c) => `<button style="background:${c};width:26px;height:26px" data-swatch="${c}"></button>`).join('')}</div><p style="color:var(--faint);margin:10px 0 0">Double-click it to write.</p>`);
          break;
        case 'pin':
          html += chosen.length === 1 ? sec(`Note ${first.n}`, this.noteFields(first, bind)) : sec('Notes', `<div class="seg">${PRIORITIES.map((p) => `<button data-prio="${p}">${p}</button>`).join('')}</div>`);
          break;
        case 'image': {
          const doms = ed.doc.dom?.[first.asset]?.length ?? 0;
          html += sec(first.crop ? 'Cut-out' : 'Picture', `${first.source ? `<p style="margin:0 0 8px;color:var(--soft);word-break:break-all">${esc(first.source)}</p>` : ''}<p style="margin:0 0 8px;color:var(--faint)">${first.nw} × ${first.nh} px${doms ? ` · ${doms} elements known: hold Alt to see them, Alt-click to lift one out` : ''}</p><div class="row"><button class="btn" data-act="img-real">Real size</button><button class="btn" data-act="img-save">${icon('library', 14)} To library</button></div><div class="row"><button class="btn" data-act="tool:cut">${icon('scissors', 14)} Cut out a part</button>${first.crop ? `<button class="btn" data-act="img-uncrop">Whole picture</button>` : ''}</div>`);
          break;
        }
        case 'widget':
          html += sec('Widget outline', `<label class="f"><span>Label</span><input value="${esc(first.label)}" data-focus data-b="${bind('label', (v) => set({ label: v }))}"></label><div class="row"><label class="f"><select data-b="${bind('widget', (v) => set({ widget: v }))}">${WIDGETS.map((w) => `<option value="${w.id}" ${first.widget === w.id ? 'selected' : ''}>${w.name}</option>`).join('')}</select></label>${num('◜', first.radius ?? 0, 'radius', (v) => set({ radius: Math.max(0, v) }))}</div><p style="color:var(--faint);margin:8px 0">Outlines are placeholders: the brief tells the AI to put a real ${esc(first.widget)} there.</p>` + fillStroke(first));
          break;
        case 'icon':
          html += sec('Icon', `<p style="margin:0 0 8px"><code>${esc(first.icon)}</code> <span style="color:var(--faint)">(Lucide)</span></p><div class="row">${colour('Colour', first.color, 'color', (v) => set({ color: v }))}${num('px', first.strokeWidth ?? 2, 'sw', (v) => set({ strokeWidth: Math.max(0.5, v) }), 0.25)}</div><div class="swatches">${SWATCHES.map((c) => `<button style="background:${c}" data-swatch-color="${c}"></button>`).join('')}</div><div class="row"><button class="btn" data-act="icon-swap">Choose another in the library</button></div>`);
          break;
      }
    }
    // The field being typed in keeps its focus (and caret) when the panel is drawn again.
    const was = this.root.activeElement as HTMLInputElement | null;
    const key = was && this.right.contains(was) ? (was.dataset.b ?? (was.classList.contains('note') ? 'note' : null)) : null;
    const caret = key && was && 'selectionStart' in was ? [was.selectionStart, was.selectionEnd] : null;
    this.right.innerHTML = html;
    if (key) {
      const again = this.right.querySelector<HTMLInputElement>(key === 'note' ? 'textarea.note' : `[data-b="${key}"]`);
      again?.focus({ preventScroll: true });
      if (again && caret) try { again.setSelectionRange(caret[0], caret[1]); } catch { /* number fields have no caret */ }
    }
    // Buttons act on press, so a field that loses its focus to them can't redraw them away first.
    this.press = (d: DOMStringMap) => {
      if (d.swatch) set(chosen.every((n) => n.type === 'text') ? { color: d.swatch } : { fill: d.swatch });
      if (d.swatchStroke) set({ stroke: d.swatchStroke });
      if (d.swatchColor) set({ color: d.swatchColor });
      if (d.swatchPen) ((ed.tool === 'pen' ? ed.pen : ed.marker).color = d.swatchPen), this.drawRight();
      if (d.device) (ed.device = d.device), this.refresh(true);
      if (d.talign) set({ align: d.talign });
      if (d.prio) set({ priority: (first as PinNode).priority === d.prio && chosen.length === 1 ? undefined : d.prio });
      if (d.kind) {
        const p = first as PinNode;
        set({ kinds: p.kinds.includes(d.kind) ? p.kinds.filter((k) => k !== d.kind) : [...p.kinds, d.kind] });
      }
    };
    const note = this.right.querySelector<HTMLTextAreaElement>('textarea.note');
    if (note) {
      note.addEventListener('focus', () => ed.hold());
      note.addEventListener('input', () => {
        const p = ed.byId(first.id) as PinNode | undefined;
        if (!p) return;
        p.text = note.value;
        ed.render();
        this.drawLeft();
      });
      note.addEventListener('blur', () => ed.release());
    }
  }

  private textFields(
    n: TextNode,
    bind: (k: string, f: (v: string, el: HTMLInputElement) => void) => string,
    num: (l: string, v: number, k: string, f: (v: number) => void, step?: number) => string,
    colour: (l: string, v: string | undefined, k: string, f: (v: string) => void) => string,
    set: (p: Record<string, unknown>) => void,
  ) {
    const fonts = [...SYSTEM_FONTS, ...Object.keys(WEB_FONTS)];
    const known = fonts.includes(n.font);
    const fontSel = `<label class="f"><select data-b="${bind('font', (v) => {
      if (v === '__other') {
        const name = prompt('A font installed on this computer, by name:', '')?.trim();
        if (name) set({ font: name });
        else this.drawRight();
        return;
      }
      loadFont(v);
      set({ font: v });
    })}"><optgroup label="On every computer">${SYSTEM_FONTS.map((f) => `<option ${f === n.font ? 'selected' : ''}>${f}</option>`).join('')}</optgroup><optgroup label="Google Fonts (loaded when online)">${Object.keys(WEB_FONTS).map((f) => `<option ${f === n.font ? 'selected' : ''}>${f}</option>`).join('')}</optgroup>${known ? '' : `<option selected>${esc(n.font)}</option>`}<option value="__other">Another font on this computer…</option></select></label>`;
    const weights = [300, 400, 500, 600, 700, 800];
    const align = (['left', 'center', 'right'] as const).map((a) => `<button data-talign="${a}" aria-pressed="${n.align === a}">${icon(a === 'left' ? 'align-start-vertical' : a === 'center' ? 'align-center-vertical' : 'align-end-vertical', 15)}</button>`).join('');
    return `${fontSel}<div class="grid2" style="margin-top:6px">${num('Size', n.size, 'size', (v) => set({ size: Math.max(1, v) }))}<label class="f"><select data-b="${bind('weight', (v) => set({ weight: Number(v) }))}">${weights.map((w) => `<option value="${w}" ${n.weight === w ? 'selected' : ''}>${{ 300: 'Light', 400: 'Regular', 500: 'Medium', 600: 'Semibold', 700: 'Bold', 800: 'Extra bold' }[w]}</option>`).join('')}</select></label>${num('↕', n.lineHeight, 'lh', (v) => set({ lineHeight: Math.max(0.5, v) }), 0.05)}${colour('Colour', n.color, 'color', (v) => set({ color: v }))}</div><div class="row"><div class="seg">${align}</div></div><label class="check"><input type="checkbox" ${n.italic ? 'checked' : ''} data-b="${bind('italic', (v) => set({ italic: v === 'true' }))}"> Italic</label><label class="check"><input type="checkbox" ${n.auto ? 'checked' : ''} data-b="${bind('auto', (v) => set({ auto: v === 'true' }))}"> Width follows the words</label><div class="swatches">${SWATCHES.map((c) => `<button style="background:${c}" data-swatch="${c}"></button>`).join('')}</div>`;
  }

  private noteFields(p: PinNode, bind: (k: string, f: (v: string, el: HTMLInputElement) => void) => string) {
    const kinds = KINDS.map((k) => `<button class="chip" data-kind="${k}" aria-pressed="${p.kinds.includes(k)}">${k}</button>`).join('');
    const prios = PRIORITIES.map((k) => `<button data-prio="${k}" aria-pressed="${p.priority === k}" style="${p.priority === k ? `color:${PRIORITY_COLOUR[k]}` : ''}">${k}</button>`).join('');
    const t = p.target;
    return `<textarea class="note" data-focus placeholder="What should change here?">${esc(p.text)}</textarea><div class="seg" style="margin-top:8px">${prios}</div><div class="chips" style="margin-top:8px">${kinds}</div><label class="check"><input type="checkbox" ${p.done ? 'checked' : ''} data-b="${bind('done', (v) => this.ed.update([p.id], { done: v === 'true' }))}"> Done</label>${t ? `<div class="target">On <b>${esc(t.name)}</b>${t.selector ? `<br><code>${esc(t.selector)}</code>` : ''}${t.component ? `<br>Component <code>${esc(t.component)}</code>` : ''}${t.page ? `<br>${esc(t.page)}` : ''}</div>` : `<div class="target">Not on anything in particular. Move it onto a screenshot or a shape to point at it.</div>`}`;
  }

  // ——— Layers and library events ———

  private wireLayers() {
    const lp = this.left.querySelector<HTMLElement>('.lp')!;
    let dragId: string | null = null;
    lp.addEventListener('click', (e) => {
      const t = e.target as Element;
      const lock = t.closest<HTMLElement>('[data-lock]')?.dataset.lock;
      const hide = t.closest<HTMLElement>('[data-hide]')?.dataset.hide;
      if (lock) return this.ed.update([lock], (n) => (n.locked = !n.locked || undefined));
      if (hide) return this.ed.update([hide], (n) => (n.hidden = !n.hidden || undefined));
      const row = t.closest<HTMLElement>('[data-layer]');
      if (row && !t.closest('input')) {
        const id = row.dataset.layer!;
        const add = (e as MouseEvent).shiftKey || (e as MouseEvent).ctrlKey || (e as MouseEvent).metaKey;
        if (add && this.ed.sel.has(id)) this.ed.sel.delete(id), this.ed.select([], true);
        else this.ed.select([id], add);
      }
      const note = t.closest<HTMLElement>('[data-note]')?.dataset.note;
      if (note) {
        const n = this.ed.byId(note)!;
        this.ed.select([note]);
        if (this.ed.view.zoom < 0.6) this.ed.zoomTo(1);
        const r = this.ed.stage.getBoundingClientRect();
        const s = this.ed.toScreen(n.x, n.y);
        this.ed.view.x += r.width / 2 - s.x;
        this.ed.view.y += r.height / 2 - s.y;
        this.ed.paintView();
        this.ed.stage.focus();
      }
    });
    lp.addEventListener('dblclick', (e) => {
      const row = (e.target as Element).closest<HTMLElement>('[data-layer]');
      if (!row) return;
      this.renaming = row.dataset.layer!;
      this.drawLeft();
      const input = lp.querySelector<HTMLInputElement>('[data-rename]');
      input?.focus();
      input?.select();
    });
    lp.addEventListener('keydown', (e) => {
      const input = e.target as HTMLInputElement;
      if (!input.dataset?.rename) return;
      if (e.key === 'Enter') input.blur();
      if (e.key === 'Escape') (this.renaming = null), this.drawLeft();
    });
    lp.addEventListener(
      'blur',
      (e) => {
        const input = e.target as HTMLInputElement;
        if (!input.dataset?.rename) return;
        const id = input.dataset.rename;
        this.renaming = null;
        const v = input.value.trim();
        this.ed.update([id], (n) => (n.name = v || undefined));
      },
      true,
    );
    lp.addEventListener('dragstart', (e) => {
      const row = (e.target as Element).closest<HTMLElement>('[data-layer]');
      const drag = (e.target as Element).closest<HTMLElement>('[data-drag]');
      if (drag) return e.dataTransfer?.setData('text/x-sandesigning', drag.dataset.drag!);
      if (!row) return;
      dragId = row.dataset.layer!;
      e.dataTransfer?.setData('text/plain', dragId);
    });
    const where = (e: DragEvent, row: HTMLElement) => {
      const r = row.getBoundingClientRect();
      const f = (e.clientY - r.top) / r.height;
      const n = this.ed.byId(row.dataset.layer);
      return n?.type === 'frame' && f > 0.3 && f < 0.7 ? 'in' : f < 0.5 ? 'before' : 'after';
    };
    const clear = () => lp.querySelectorAll('.drop-before,.drop-after,.drop-in').forEach((r) => r.classList.remove('drop-before', 'drop-after', 'drop-in'));
    lp.addEventListener('dragover', (e) => {
      const row = (e.target as Element).closest<HTMLElement>('[data-layer]');
      if (!row || !dragId) return;
      e.preventDefault();
      clear();
      row.classList.add(`drop-${where(e, row)}`);
    });
    lp.addEventListener('drop', (e) => {
      const row = (e.target as Element).closest<HTMLElement>('[data-layer]');
      clear();
      if (!row || !dragId) return;
      e.preventDefault();
      const target = this.ed.byId(row.dataset.layer)!;
      const id = dragId;
      dragId = null;
      if (id === target.id || descendants(this.ed.doc.nodes, id).some((d) => d.id === target.id)) return;
      const how = where(e, row);
      this.ed.change(() => {
        const nodes = this.ed.doc.nodes;
        const n = nodes.find((m) => m.id === id)!;
        nodes.splice(nodes.indexOf(n), 1);
        if (how === 'in') {
          n.parent = target.id;
          nodes.push(n);
        } else {
          n.parent = target.parent;
          // The list shows the top first, so "before" in the list is after in drawing order.
          const at = nodes.indexOf(target) + (how === 'before' ? 1 : 0);
          nodes.splice(at, 0, n);
        }
      });
    });
    lp.addEventListener('dragend', () => ((dragId = null), clear()));
  }

  private wireLibrary() {
    const lp = this.left.querySelector<HTMLElement>('.lp')!;
    lp.addEventListener('click', (e) => {
      const t = e.target as Element;
      const d = (k: string) => t.closest<HTMLElement>(`[data-${k}]`)?.getAttribute(`data-${k}`);
      const unsave = d('unsave');
      if (unsave) return void deleteItem(unsave).then(() => this.drawYours());
      const tpl = d('template');
      if (tpl) return this.insertTemplate(tpl);
      const item = d('item');
      if (item) return void this.insertItem(item);
      const w = d('widget');
      if (w) return (this.ed.widget = w), this.ed.setTool('widget');
      const ic = d('icon');
      if (ic) {
        // With an icon chosen on the canvas, a click swaps it; otherwise the Icon tool takes it.
        const chosen = this.ed.selected.filter((n) => n.type === 'icon');
        if (chosen.length) return this.ed.update(chosen.map((n) => n.id), { icon: ic });
        this.ed.icon = ic;
        this.ed.setTool('icon');
      }
    });
  }

  // ——— Placing things ———

  /** Where new things go: under the pointer, or the middle of the view. */
  private spot() {
    return this.pointer ? this.ed.toWorld(this.pointer.x, this.pointer.y) : this.ed.centre();
  }

  /** A free place to the right of everything, for things as big as a frame. */
  private freeSpot(w: number, h: number) {
    const all = union(this.ed.doc.nodes.filter((n) => !n.parent).map(bounds));
    if (!all) return { x: 0, y: 0 };
    const c = this.ed.centre();
    const view = this.ed.stage.getBoundingClientRect();
    const seen = { w: view.width / this.ed.view.zoom, h: view.height / this.ed.view.zoom };
    // If the middle of the view is empty enough, put it there.
    const here = { x: c.x - w / 2, y: c.y - h / 2, w, h };
    const busy = this.ed.doc.nodes.some((n) => !n.parent && !n.hidden && overlaps(bounds(n), here));
    if (!busy && w < seen.w && h < seen.h) return { x: Math.round(here.x), y: Math.round(here.y) };
    return { x: Math.round(all.x + all.w + 120), y: Math.round(all.y) };
  }

  private place(nodes: SNode[], at?: { x: number; y: number }, fit = false) {
    const box = union(nodes.filter((n) => !nodes.some((m) => m.id === n.parent)).map(bounds));
    if (!box) return;
    const big = nodes.some((n) => n.type === 'frame' && !n.parent);
    const to = at ? { x: at.x - box.w / 2, y: at.y - box.h / 2 } : big ? this.freeSpot(box.w, box.h) : { x: this.ed.centre().x - box.w / 2, y: this.ed.centre().y - box.h / 2 };
    const dx = Math.round(to.x - box.x), dy = Math.round(to.y - box.y);
    for (const n of nodes) (n.x += dx), (n.y += dy);
    this.ed.add(nodes);
    if (fit) this.ed.fit(union(nodes.map(bounds)));
  }

  private insertTemplate(id: string, at?: { x: number; y: number }) {
    const t = TEMPLATES.find((x) => x.id === id);
    if (!t) return;
    loadFont('Inter');
    this.place(t.make(), at, !at);
  }

  private async insertItem(id: string, at?: { x: number; y: number }) {
    const item = (await listItems()).find((i) => i.id === id);
    if (!item) return;
    Object.assign(this.ed.doc.assets, item.assets);
    this.place(cloneNodes(item.nodes), at, !at && item.nodes.some((n) => n.type === 'frame'));
  }

  private insertWidget(id: string, at: { x: number; y: number }) {
    const k = WIDGETS.find((w) => w.id === id) ?? WIDGETS[0];
    this.place([{ id: uid(), type: 'widget', widget: k.id, label: k.name, x: 0, y: 0, w: k.w, h: k.h }], at);
  }

  private insertIcon(name: string, at: { x: number; y: number }) {
    this.place([{ id: uid(), type: 'icon', icon: name, color: '#0f172a', x: 0, y: 0, w: 32, h: 32 }], at);
  }

  private addText(text: string) {
    const n: TextNode = { id: uid(), type: 'text', text, x: 0, y: 0, w: 10, h: 10, font: 'Inter', size: 18, weight: 400, color: '#0f172a', align: 'left', lineHeight: 1.4, auto: text.length < 60 };
    if (!n.auto) n.w = 420;
    this.ed.fitText(n);
    this.place([n], this.spot());
  }

  /** A picture from a file, the clipboard or a capture, shown at its size on screen. */
  async addPicture(dataUrl: string, opts: { name?: string; source?: string; at?: { x: number; y: number }; scale?: number; dom?: DomBox[] } = {}) {
    const img = new Image();
    img.src = dataUrl;
    await img.decode();
    const nw = img.naturalWidth || 400, nh = img.naturalHeight || 300;
    let scale = opts.scale ?? (dataUrl.startsWith('data:image/svg') ? 1 : window.devicePixelRatio || 1);
    if (nw / scale > 2400) scale = nw / 2400;
    const asset = uid();
    this.ed.doc.assets[asset] = dataUrl;
    if (opts.dom?.length) (this.ed.doc.dom ??= {})[asset] = opts.dom;
    const n: ImageNode = { id: uid(), type: 'image', asset, nw, nh, x: 0, y: 0, w: Math.round(nw / scale), h: Math.round(nh / scale), name: opts.name, source: opts.source, scale };
    this.place([n], opts.at);
    return n;
  }

  private async addFiles(files: File[], at?: { x: number; y: number }) {
    let i = 0;
    for (const f of files) {
      if (f.name.endsWith('.sandesign') || f.type === 'application/json' || f.name.endsWith('.json')) {
        await this.importFile(f);
        continue;
      }
      if (!f.type.startsWith('image/')) {
        this.toast(`${f.name} isn’t a picture or a .sandesign file.`);
        continue;
      }
      const p = at ? { x: at.x + i * 40, y: at.y + i * 40 } : undefined;
      await this.addPicture(await readAsDataUrl(f), { name: f.name === 'image.png' ? undefined : f.name.replace(/\.[^.]+$/, ''), at: p });
      i++;
    }
  }

  private pickFiles(accept: string, many: boolean) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.multiple = many;
    input.onchange = () => void this.addFiles([...(input.files ?? [])]);
    input.click();
  }

  private async onDrop(e: DragEvent) {
    const at = this.ed.toWorld(e.clientX, e.clientY);
    const drag = e.dataTransfer?.getData('text/x-sandesigning');
    if (drag) {
      const [kind, id] = drag.split(':');
      if (kind === 'template') return this.insertTemplate(id, at);
      if (kind === 'widget') return this.insertWidget(id, at);
      if (kind === 'icon') return this.insertIcon(id, at);
      if (kind === 'item') return this.insertItem(id, at);
    }
    const files = [...(e.dataTransfer?.files ?? [])];
    if (files.length) return this.addFiles(files, at);
    const url = e.dataTransfer?.getData('text/uri-list');
    if (url && /^https?:/.test(url)) this.toast('Drag the picture itself, or copy it and paste here.');
  }

  // ——— Capture ———

  async capture(pins: PinInput[] = []): Promise<void> {
    const host = this.root.host as HTMLElement;
    let shot: Capture;
    try {
      shot = await captureTab(
        () => {
          const was = host.style.display;
          host.style.display = 'none';
          return () => (host.style.display = was);
        },
        // Sandesigning's own parts (the walk doesn't go inside what it skips).
        (el) => el === host || el.hasAttribute('data-sandesigning'),
      );
    } catch (err) {
      const msg = (err as Error).name === 'NotAllowedError' ? 'Capture was cancelled.' : (err as Error).message;
      return this.toast(msg);
    }
    // If another tab or window was shared, the page's elements don't match the picture.
    const sameShape = Math.abs(shot.nw / shot.nh - shot.w / shot.h) < 0.03;
    const at = this.freeSpot(shot.w, shot.h);
    const frame: FrameNode = { id: uid(), type: 'frame', name: shot.title || shot.page, x: at.x, y: at.y, w: shot.w, h: shot.h, fill: '#ffffff', clip: true };
    const asset = uid();
    this.ed.doc.assets[asset] = shot.dataUrl;
    if (sameShape) (this.ed.doc.dom ??= {})[asset] = shot.dom;
    const img: ImageNode = { id: uid(), type: 'image', asset, nw: shot.nw, nh: shot.nh, x: at.x, y: at.y, w: shot.w, h: shot.h, source: shot.page, scale: shot.nw / shot.w, parent: frame.id, locked: true };
    const made: SNode[] = [frame, img];
    let n = this.ed.nextPin();
    for (const p of pins) made.push({ id: uid(), type: 'pin', n: n++, x: at.x + p.x - PIN / 2, y: at.y + p.y - PIN / 2, w: PIN, h: PIN, text: p.text, kinds: p.kinds ?? [], priority: p.priority, done: p.done, target: p.target, parent: frame.id });
    this.ed.add(made);
    this.ed.select([frame.id]);
    this.ed.fit(bounds(frame));
    if (this.ed.doc.title === 'Untitled canvas' && shot.title) this.ed.doc.title = shot.title;
    this.toast(sameShape ? `Captured, with ${shot.dom.length} elements. The screenshot is locked so you can draw on it; hold Alt to see the elements, Alt-click to lift one.` : 'Captured. Another tab or window was shared, so notes won’t know the elements.');
  }

  // ——— Edit actions ———

  private copyPayload() {
    const chosen = this.ed.selected;
    const all = [...chosen, ...chosen.flatMap((n) => (n.type === 'frame' ? descendants(this.ed.doc.nodes, n.id) : []))];
    const unique = [...new Map(all.map((n) => [n.id, n])).values()];
    const assets: Record<string, string> = {};
    const dom: Record<string, DomBox[]> = {};
    for (const n of unique)
      if (n.type === 'image') {
        assets[n.asset] = this.ed.doc.assets[n.asset];
        if (this.ed.doc.dom?.[n.asset]) dom[n.asset] = this.ed.doc.dom[n.asset];
      }
    const nodes = structuredClone(unique);
    // Children whose frame isn't copied stand on their own.
    for (const n of nodes) if (n.parent && !nodes.some((m) => m.id === n.parent)) delete n.parent;
    return { sandesigning: 1, nodes, assets, dom };
  }

  private async copyToClipboard() {
    const payload = this.copyPayload();
    this.clip = payload;
    try {
      await navigator.clipboard.writeText(JSON.stringify(payload));
    } catch {
      // The copy still works inside this canvas.
    }
  }

  private async pasteFromClipboard() {
    try {
      const text = await navigator.clipboard.readText();
      const v = JSON.parse(text);
      if (v?.sandesigning) return this.paste(v);
    } catch {
      // Fall back to what was copied here.
    }
    if (this.clip) this.paste(this.clip);
  }

  private paste(v: { nodes: SNode[]; assets: Record<string, string>; dom?: Record<string, DomBox[]> }) {
    if (!Array.isArray(v.nodes) || !v.nodes.length) return;
    Object.assign(this.ed.doc.assets, v.assets ?? {});
    if (v.dom && Object.keys(v.dom).length) Object.assign((this.ed.doc.dom ??= {}), v.dom);
    const nodes = cloneNodes(v.nodes);
    let n = this.ed.nextPin();
    for (const p of nodes) if (p.type === 'pin') p.n = n++;
    const box = union(nodes.filter((m) => !m.parent).map(bounds))!;
    // Pasting where the pointer is, or just beside the original if the pointer is off the canvas.
    const at = this.pointer ? this.ed.toWorld(this.pointer.x, this.pointer.y) : { x: box.x + box.w / 2 + 24, y: box.y + box.h / 2 + 24 };
    this.place(nodes, at);
  }

  private duplicate() {
    const p = this.copyPayload();
    const nodes = cloneNodes(p.nodes, 24, 24);
    let n = this.ed.nextPin();
    for (const m of nodes) if (m.type === 'pin') m.n = n++;
    const parents = new Map(this.ed.selected.map((m) => [m.id, m.parent]));
    // A copy stays in the frame its original was in.
    p.nodes.forEach((orig, i) => {
      if (!orig.parent && parents.get(orig.id)) nodes[i].parent = parents.get(orig.id);
    });
    this.ed.add(nodes);
  }

  private enter() {
    const n = this.ed.selected[0];
    if (n.type === 'frame') {
      const kids = this.ed.doc.nodes.filter((m) => m.parent === n.id);
      if (kids.length) this.ed.select(kids.map((k) => k.id));
    } else this.ed.edit(n);
  }

  private selectParent() {
    const p = this.ed.selected[0]?.parent;
    if (p) this.ed.select([p]);
  }

  private selectSibling(step: 1 | -1) {
    const cur = this.ed.selected[0];
    const sibs = this.ed.doc.nodes.filter((n) => n.parent === cur?.parent && !n.hidden);
    if (!sibs.length) return;
    const i = cur ? sibs.indexOf(cur) : -1;
    this.ed.select([sibs[(i + step + sibs.length) % sibs.length].id]);
  }

  private reorder(how: 'front' | 'forward' | 'backward' | 'back') {
    this.ed.change(() => {
      const nodes = this.ed.doc.nodes;
      const chosen = nodes.filter((n) => this.ed.sel.has(n.id));
      const order = how === 'front' || how === 'backward' ? chosen : [...chosen].reverse();
      for (const n of order) {
        const sibs = nodes.filter((m) => m.parent === n.parent);
        const i = sibs.indexOf(n);
        const to = how === 'front' ? sibs.length - 1 : how === 'back' ? 0 : how === 'forward' ? Math.min(i + 1, sibs.length - 1) : Math.max(i - 1, 0);
        if (to === i) continue;
        const other = sibs[to];
        nodes.splice(nodes.indexOf(n), 1);
        nodes.splice(nodes.indexOf(other) + (to > i ? 1 : 0), 0, n);
      }
    });
  }

  private frameSelection() {
    const chosen = this.ed.selected.filter((n) => !n.locked);
    const box = union(chosen.map(bounds));
    if (!box) return;
    const parent = chosen.every((n) => n.parent === chosen[0].parent) ? chosen[0].parent : undefined;
    const f: FrameNode = { id: uid(), type: 'frame', name: 'Frame', x: Math.floor(box.x), y: Math.floor(box.y), w: Math.ceil(box.w), h: Math.ceil(box.h), fill: '#ffffff', clip: false, parent };
    this.ed.change(() => {
      const nodes = this.ed.doc.nodes;
      nodes.splice(nodes.indexOf(chosen[0]), 0, f);
      for (const n of chosen) n.parent = f.id;
    });
    this.ed.select([f.id]);
  }

  private shift(n: SNode, dx: number, dy: number) {
    for (const m of [n, ...(n.type === 'frame' ? descendants(this.ed.doc.nodes, n.id) : [])]) (m.x += dx), (m.y += dy);
  }

  private align(how: 'left' | 'hcentre' | 'right' | 'top' | 'vcentre' | 'bottom') {
    const chosen = this.ed.selected.filter((n) => !n.locked);
    const one = chosen.length === 1 ? this.ed.byId(chosen[0].parent) : undefined;
    const area = one ? bounds(one) : union(chosen.map(bounds));
    if (!area || (chosen.length < 2 && !one)) return this.toast('Choose two or more things, or one inside a frame.');
    this.ed.change(() => {
      for (const n of chosen) {
        const b = bounds(n);
        const dx = how === 'left' ? area.x - b.x : how === 'right' ? area.x + area.w - b.x - b.w : how === 'hcentre' ? area.x + area.w / 2 - b.x - b.w / 2 : 0;
        const dy = how === 'top' ? area.y - b.y : how === 'bottom' ? area.y + area.h - b.y - b.h : how === 'vcentre' ? area.y + area.h / 2 - b.y - b.h / 2 : 0;
        this.shift(n, dx, dy);
      }
    });
  }

  private distribute(axis: 'x' | 'y') {
    const chosen = this.ed.selected.filter((n) => !n.locked);
    if (chosen.length < 3) return this.toast('Choose three or more things to space out.');
    const size = axis === 'x' ? 'w' : 'h';
    const sorted = [...chosen].sort((a, b) => bounds(a)[axis] - bounds(b)[axis]);
    const area = union(chosen.map(bounds))!;
    const gap = (area[size] - sorted.reduce((s, n) => s + bounds(n)[size], 0)) / (sorted.length - 1);
    this.ed.change(() => {
      let at = area[axis];
      for (const n of sorted) {
        const b = bounds(n);
        this.shift(n, axis === 'x' ? at - b.x : 0, axis === 'y' ? at - b.y : 0);
        at += b[size] + gap;
      }
    });
  }

  private toggle(key: 'locked' | 'hidden') {
    const on = !this.ed.selected.every((n) => n[key]);
    this.ed.update(this.ed.sel, (n) => (n[key] = on || undefined));
    if (key === 'hidden' && on) this.ed.select([]);
  }

  private resizeSel(w: number, h: number) {
    const chosen = this.ed.selected;
    const area = union(chosen.map(bounds))!;
    const kx = w / Math.max(area.w, 1), ky = h / Math.max(area.h, 1);
    this.ed.update(
      chosen.flatMap((n) => [n.id, ...(n.type === 'frame' ? descendants(this.ed.doc.nodes, n.id).map((d) => d.id) : [])]),
      (n) => {
        if (n.type === 'pin') return;
        n.x = area.x + (n.x - area.x) * kx;
        n.y = area.y + (n.y - area.y) * ky;
        n.w *= kx;
        n.h *= ky;
        if (n.type === 'text' && kx !== 1) n.auto = false;
      },
    );
  }

  private setDevice(id: string) {
    const d = DEVICES.find((v) => v.id === id);
    this.ed.update(this.ed.sel, (n) => {
      if (n.type !== 'frame') return;
      n.device = d?.id;
      if (d) (n.w = d.w), (n.h = d.h);
    });
  }

  private setting(key: 'grid' | 'snap' | 'notesText') {
    const s = (this.ed.doc.settings ??= {});
    s[key] = key === 'grid' ? !s.grid : s[key] === false;
    this.ed.render();
    this.ed.paintView();
    this.ed.scheduleSave();
    this.refresh(true);
    this.drawRight();
  }

  private cycleTheme() {
    const next = { auto: 'light', light: 'dark', dark: 'auto' }[this.theme] ?? 'auto';
    try {
      localStorage.setItem('sandesigning:theme', next);
    } catch {
      // Kept for this visit only.
    }
    this.el.dataset.theme = next;
    this.toast(next === 'auto' ? 'Light or dark as the system is' : next === 'light' ? 'Light' : 'Dark');
  }

  // ——— Files ———

  private async newCanvas() {
    await this.ed.saveNow();
    this.ed.load(newDoc('Untitled canvas'));
    this.toast('A new canvas. The last one is in File › Open.');
  }

  private saveCopy() {
    const doc = this.trimmed();
    download(new Blob([JSON.stringify(doc)], { type: 'application/json' }), `${slug(doc.title)}.sandesign`);
  }

  /** The document with only the pictures it still uses. */
  private trimmed(): Doc {
    const doc = structuredClone(this.ed.doc);
    const used = new Set(doc.nodes.flatMap((n) => (n.type === 'image' ? [n.asset] : [])));
    for (const k of Object.keys(doc.assets)) if (!used.has(k)) delete doc.assets[k];
    for (const k of Object.keys(doc.dom ?? {})) if (!used.has(k)) delete doc.dom![k];
    doc.view = { ...this.ed.view };
    return doc;
  }

  private async importFile(f: File) {
    try {
      const v = JSON.parse(await f.text());
      if (!isDoc(v)) throw new Error();
      await this.ed.saveNow();
      v.id = uid();
      v.updated = Date.now();
      await saveDoc(v);
      this.ed.load(v);
      this.toast(`Opened “${v.title}”. It’s kept in this browser now too.`);
    } catch {
      this.toast(`${f.name} isn’t a Sandesigning file.`);
    }
  }

  private async saveTemplate() {
    const p = this.copyPayload();
    const box = union(p.nodes.filter((n) => !n.parent).map(bounds))!;
    for (const n of p.nodes) (n.x -= box.x), (n.y -= box.y);
    const first = this.ed.selected[0];
    const name = prompt('Name the template:', first.type === 'frame' ? label(first) : 'My template')?.trim();
    if (!name) return;
    await saveItem({ id: uid(), kind: 'template', name, created: Date.now(), nodes: p.nodes, assets: p.assets });
    this.toast(`“${name}” is in Library › Yours.`);
    this.leftTab = 'library';
    this.drawLeft();
    void this.drawYours();
  }

  private async savePicture() {
    const n = this.ed.selected.find((m): m is ImageNode => m.type === 'image');
    if (!n) return;
    const node = { ...structuredClone(n), x: 0, y: 0 };
    delete node.parent;
    delete node.locked;
    await saveItem({ id: uid(), kind: 'picture', name: n.name ?? (n.source ? new URL(n.source, location.href).hostname : 'Picture'), created: Date.now(), nodes: [node], assets: { [n.asset]: this.ed.doc.assets[n.asset] } });
    this.toast('Saved to Library › Yours.');
    void this.drawYours();
  }

  // ——— Export ———

  private async exportPng(selection: boolean) {
    try {
      const doc = this.ed.doc;
      const blob = await toPng(doc, selection ? this.withChildren() : undefined);
      download(blob, `${slug(doc.title)}${selection ? '-selection' : ''}.png`);
    } catch (e) {
      this.toast(`The PNG couldn’t be made: ${(e as Error).message}`);
    }
  }

  private withChildren() {
    return new Set(this.ed.selected.flatMap((n) => [n.id, ...(n.type === 'frame' ? descendants(this.ed.doc.nodes, n.id).map((d) => d.id) : [])]));
  }

  private async exportFrames() {
    const frames = this.ed.doc.nodes.filter((n) => n.type === 'frame' && !n.parent && !n.hidden);
    if (!frames.length) return this.toast('There are no frames. Export a PNG of everything instead.');
    for (const f of frames) {
      const ids = new Set([f.id, ...descendants(this.ed.doc.nodes, f.id).map((d) => d.id)]);
      download(await toPng(this.ed.doc, ids), `${slug(label(f))}.png`);
    }
  }

  private exportSvg() {
    const { svg } = toSvg(this.ed.doc, this.ed.sel.size ? this.withChildren() : undefined);
    download(new Blob([svg], { type: 'image/svg+xml' }), `${slug(this.ed.doc.title)}.svg`);
  }

  private async copyPicture() {
    try {
      const blob = toPng(this.ed.doc, this.ed.sel.size ? this.withChildren() : undefined);
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      this.toast(`Copied as a picture${this.ed.sel.size ? ' (the selection)' : ''}. Paste it into any chat.`);
    } catch {
      this.toast('This browser won’t copy pictures. Export a PNG instead.');
    }
  }

  private async copyBrief() {
    const md = toBrief(this.ed.doc);
    try {
      await navigator.clipboard.writeText(md);
      this.toast('The brief is copied. Paste it into any AI chat, with the picture (Ctrl ⇧ X copies that).');
    } catch {
      this.briefDialog();
    }
  }

  private async briefFiles() {
    const name = slug(this.ed.doc.title);
    download(new Blob([toBrief(this.ed.doc, `${name}.png`)], { type: 'text/markdown' }), `${name}.md`);
    download(await toPng(this.ed.doc), `${name}.png`);
  }

  // ——— Menus and dialogs ———

  private openMenu(which: string, anchor: HTMLElement, at?: { x: number; y: number }) {
    if (this.menuEl?.dataset.which === which && !at) return this.closeMenu();
    this.closeMenu();
    const item = (id: string, lbl?: string, ic?: string) => {
      const a = this.actions.find((x) => x.id === id);
      if (a?.when && !a.when()) return '';
      return `<button data-run="${id}">${ic ? icon(ic, 15) : ''}<span>${esc(lbl ?? a?.label ?? id)}</span><span class="k">${a?.keys ? kbd(a.keys[0]) : ''}</span></button>`;
    };
    let html = '';
    if (which === 'file')
      html = [item('new', 'New canvas', 'file-plus'), item('open', 'Open a canvas…', 'folder-open'), item('import', 'Open a .sandesign file…', 'upload'), '<hr>', item('save', 'Save a copy (.sandesign)', 'save'), item('template', undefined, 'library'), item('picture', 'Add a picture…', 'image'), '<hr>', `<button data-run="delete-doc">${icon('trash-2', 15)}<span>Delete this canvas…</span></button>`, '<hr>', item('setup', 'Use it in other projects…', 'sparkles'), item('keys', undefined, 'keyboard'), `<div class="lbl">Sandesigning ${VERSION}</div>`].join('');
    else if (which === 'export')
      html = [`<div class="lbl">For AI</div>`, item('brief', 'Brief for AI…', 'sparkles'), item('copy-brief', undefined, 'copy'), item('copy-png', undefined, 'image'), item('brief-files', undefined, 'download'), '<hr><div class="lbl">Pictures</div>', item('png', 'PNG of everything', 'image'), item('png-sel', 'PNG of the selection'), item('png-frames'), item('svg', this.ed.sel.size ? 'SVG of the selection' : 'SVG of everything'), '<hr><div class="lbl">The canvas</div>', item('save', 'Sandesigning file (.sandesign)', 'save')].join('');
    else if (which === 'zoom') html = [item('zoom-in'), item('zoom-out'), item('zoom-100'), item('fit'), item('fit-sel'), '<hr>', item('grid'), item('snap'), item('notes-text'), item('panels')].join('');
    else if (which === 'frame') html = `<div class="lbl">Frame size</div>` + DEVICES.map((d) => `<button data-device="${d.id}" class="${this.ed.device === d.id ? 'on' : ''}">${icon(d.w < 500 ? 'smartphone' : d.w < 1000 ? 'tablet' : d.id === 'laptop' ? 'laptop' : 'monitor', 15)}<span>${d.name}</span><span class="k">${d.w} × ${d.h}</span></button>`).join('');
    else if (which === 'widget') html = `<div class="lbl">Widget outline</div>` + WIDGETS.map((w) => `<button data-widget-pick="${w.id}" class="${this.ed.widget === w.id ? 'on' : ''}"><span>${w.name}</span><span class="k">${w.w} × ${w.h}</span></button>`).join('');
    else if (which === 'context') html = this.contextHtml(item);
    const m = document.createElement('div');
    m.className = 'menu';
    m.dataset.which = which;
    m.innerHTML = html;
    this.el.appendChild(m);
    const r = anchor.getBoundingClientRect();
    const mr = m.getBoundingClientRect();
    let x = at?.x ?? (which === 'export' || which === 'zoom' ? r.right - mr.width : r.left);
    let y = at?.y ?? (anchor.closest('.toolbar') ? r.top - mr.height - 8 : r.bottom + 6);
    x = Math.max(8, Math.min(x, innerWidth - mr.width - 8));
    y = Math.max(8, Math.min(y, innerHeight - mr.height - 8));
    Object.assign(m.style, { left: `${x}px`, top: `${y}px` });
    this.menuEl = m;
    m.addEventListener('click', (e) => {
      const b = (e.target as Element).closest<HTMLElement>('button');
      if (!b) return;
      this.closeMenu();
      if (b.dataset.run === 'delete-doc') return void this.deleteCurrent();
      if (b.dataset.run) return this.run(b.dataset.run);
      if (b.dataset.device) return (this.ed.device = b.dataset.device), this.ed.setTool('frame');
      if (b.dataset.widgetPick) return (this.ed.widget = b.dataset.widgetPick), this.ed.setTool('widget');
      if (b.dataset.lift) return this.liftAt(at!);
    });
    setTimeout(() => {
      const away = (e: PointerEvent) => {
        if (!e.composedPath().includes(m)) this.closeMenu();
      };
      window.addEventListener('pointerdown', away, { capture: true, once: true });
    });
  }

  private contextHtml(item: (id: string, lbl?: string, ic?: string) => string) {
    if (!this.ed.sel.size) return [item('paste', 'Paste here', 'clipboard-paste'), item('picture', 'Add a picture…', 'image'), '<hr>', item('select-all'), item('fit'), item('grid')].join('');
    const one = this.ed.selected[0];
    const lift = one.type === 'image' && this.ed.doc.dom?.[one.asset]?.length ? `<button data-lift="1">${icon('scissors', 15)}<span>Lift the element under the pointer</span><span class="k">${kbd('alt')} click</span></button><hr>` : '';
    return [lift, item('copy', undefined, 'copy'), item('cut'), item('paste', 'Paste here', 'clipboard-paste'), item('duplicate'), item('delete', undefined, 'trash-2'), '<hr>', item('front', undefined, 'bring-to-front'), item('back', undefined, 'send-to-back'), item('frame-sel', undefined, 'frame'), '<hr>', item('lock', undefined, 'lock'), item('hide', undefined, 'eye-off'), item('template', undefined, 'library'), '<hr>', item('copy-png', 'Copy as a picture', 'image'), item('png-sel', undefined, 'download'), item('fit-sel')].join('');
  }

  private liftAt(at: { x: number; y: number }) {
    const w = this.ed.toWorld(at.x, at.y);
    const img = this.ed.hit(w.x, w.y, { pins: false });
    if (img?.type !== 'image') return;
    const dom = this.ed.doc.dom?.[img.asset];
    const d = dom && domAt(img, dom, w.x, w.y);
    if (!d) return this.toast('No element there.');
    const box = domBox(img, d);
    this.ed.cutOut(img, box, d.name);
  }

  private contextMenu(e: MouseEvent) {
    const w = this.ed.toWorld(e.clientX, e.clientY);
    const n = this.ed.hit(w.x, w.y);
    if (n && !this.ed.sel.has(n.id)) this.ed.select([n.id]);
    if (!n && this.ed.sel.size) this.ed.select([]);
    this.openMenu('context', this.ed.stage, { x: e.clientX, y: e.clientY });
  }

  private closeMenu() {
    this.menuEl?.remove();
    this.menuEl = null;
  }

  private dialog(title: string, body: string, cls = '') {
    this.closeDialog();
    const v = document.createElement('div');
    v.className = 'veil';
    v.innerHTML = `<div class="dialog ${cls}" role="dialog" aria-label="${esc(title)}">${title ? `<header><h2>${esc(title)}</h2><button class="btn icon" data-close>${icon('x')}</button></header>` : ''}${body}</div>`;
    v.addEventListener('pointerdown', (e) => e.target === v && this.closeDialog());
    v.addEventListener('click', (e) => (e.target as Element).closest('[data-close]') && this.closeDialog());
    this.el.appendChild(v);
    this.veil = v;
    return v;
  }

  private closeDialog() {
    this.veil?.remove();
    this.veil = null;
    this.ed.stage.focus();
  }

  private palette() {
    const v = this.dialog('', `<div class="palette" style="display:flex;flex-direction:column;min-height:0"><input placeholder="Type what you want to do…" aria-label="Find an action"><div class="items"></div></div>`);
    const input = v.querySelector('input')!;
    const items = v.querySelector<HTMLElement>('.items')!;
    let shown: Action[] = [];
    let at = 0;
    const draw = () => {
      const words = input.value.toLowerCase().split(/\s+/).filter(Boolean);
      shown = this.actions.filter((a) => (!a.when || a.when()) && !a.id.startsWith('nudge') && !a.id.startsWith('opacity-') && words.every((w) => `${a.label} ${a.group}`.toLowerCase().includes(w)));
      at = Math.min(at, Math.max(0, shown.length - 1));
      items.innerHTML = shown.map((a, i) => `<button class="it${i === at ? ' on' : ''}" data-i="${i}"><span>${esc(a.label)}</span><span class="g">${a.group}</span>${a.keys ? kbd(a.keys[0]) : ''}</button>`).join('') || `<p class="empty">Nothing matches.</p>`;
      items.querySelector('.on')?.scrollIntoView({ block: 'nearest' });
    };
    const go = (i: number) => {
      const a = shown[i];
      this.closeDialog();
      a?.run();
    };
    input.addEventListener('input', () => ((at = 0), draw()));
    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') e.preventDefault(), (at = Math.min(at + 1, shown.length - 1)), draw();
      if (e.key === 'ArrowUp') e.preventDefault(), (at = Math.max(at - 1, 0)), draw();
      if (e.key === 'Enter') e.preventDefault(), go(at);
    });
    items.addEventListener('click', (e) => {
      const b = (e.target as Element).closest<HTMLElement>('[data-i]');
      if (b) go(Number(b.dataset.i));
    });
    draw();
    input.focus();
  }

  private shortcuts() {
    const groups = new Map<string, Action[]>();
    for (const a of this.actions) {
      if (!a.keys || a.id.startsWith('opacity-') || a.id.startsWith('nudge10')) continue;
      groups.set(a.group, [...(groups.get(a.group) ?? []), a]);
    }
    const extra: [string, string, string][] = [
      ['Canvas', 'Move around', 'space'],
      ['Canvas', 'Zoom', 'mod'],
      ['Canvas', 'Copy while dragging', 'alt'],
      ['Canvas', 'Square, circle, straight', 'shift'],
      ['Canvas', 'See a screenshot’s elements', 'alt'],
      ['Arrange', 'Opacity 10% … 100%', '1'],
    ];
    const rows = (list: { label: string; keys: string[] }[]) => list.map((a) => `<div class="kr"><span>${esc(a.label)}</span><span>${a.keys.map((k) => kbd(k)).join('<span style="color:var(--faint)">/</span>')}</span></div>`).join('');
    const canvas = extra.map(([, l, k]) => ({ label: l + (k === 'mod' ? ' (with the wheel)' : k === 'space' ? ' (hold and drag)' : k === '1' ? ' (1 … 9, 0)' : ' (hold)'), keys: [k] }));
    const body = `<div class="body keys">${[...groups].map(([g, list]) => `<section><h4>${g}</h4>${rows(list.map((a) => ({ label: a.id.startsWith('nudge-') ? a.label.replace('1 px', '1 px (⇧ 10 px)') : a.label, keys: a.keys! })))}</section>`).join('')}<section><h4>Canvas</h4>${rows(canvas)}</section></div>`;
    this.dialog('Shortcuts', body);
  }

  private briefDialog() {
    const md = toBrief(this.ed.doc);
    const v = this.dialog('Brief for AI', `<div class="body"><p style="color:var(--soft);margin:4px 0 10px">Paste it into any AI model with the picture, or save both into the project you’re working on. FORMAT.md tells a model how to read a .sandesign file, if you give it the whole canvas instead.</p><textarea class="note" readonly style="min-height:300px;font:11.5px/1.5 ui-monospace,Consolas,monospace">${esc(md)}</textarea><div class="row" style="margin-top:10px"><button class="btn primary" data-b2="copy">${icon('copy', 14)} Copy the brief</button><button class="btn" data-b2="pic">${icon('image', 14)} Copy the picture</button><button class="btn" data-b2="files">${icon('download', 14)} Download both</button></div></div>`);
    v.querySelector('textarea')!.addEventListener('focus', (e) => (e.target as HTMLTextAreaElement).select());
    v.addEventListener('click', (e) => {
      const k = (e.target as Element).closest<HTMLElement>('[data-b2]')?.dataset.b2;
      if (k === 'copy') void navigator.clipboard.writeText(md).then(() => this.toast('Copied.'), () => this.toast('Select the text and copy it.'));
      if (k === 'pic') void this.copyPicture();
      if (k === 'files') void this.briefFiles();
    });
  }

  private async openDocs() {
    await this.ed.saveNow();
    const docs = await listDocs();
    const v = this.dialog('Your canvases', `<div class="body docs">${docs.map((d) => `<div class="dr"><b data-open="${d.id}">${esc(d.title)}${d.id === this.ed.doc.id ? ' <span>(open)</span>' : ''}</b><span>${d.count} things · ${ago(d.updated)}</span><button class="btn icon" data-del="${d.id}" title="Delete">${icon('trash-2', 14)}</button></div>`).join('') || '<p class="empty">None yet.</p>'}<div class="row" style="margin-top:12px"><button class="btn primary" data-new>${icon('file-plus', 14)} New canvas</button><button class="btn" data-import>${icon('upload', 14)} Open a .sandesign file</button></div><p style="color:var(--faint)">Canvases stay in this browser, for this site. To move one to another computer, browser or app, save a copy (.sandesign) and open it there.</p></div>`);
    v.addEventListener('click', async (e) => {
      const t = e.target as Element;
      const open = t.closest<HTMLElement>('[data-open]')?.dataset.open;
      const del = t.closest<HTMLElement>('[data-del]');
      if (open) {
        const d = await loadDoc(open);
        this.closeDialog();
        if (d) this.ed.load(d);
      }
      if (del) {
        if (del.dataset.sure !== '1') {
          del.dataset.sure = '1';
          del.innerHTML = 'Delete?';
          del.classList.remove('icon');
          return;
        }
        await deleteDoc(del.dataset.del!);
        if (del.dataset.del === this.ed.doc.id) this.ed.load(newDoc('Untitled canvas'));
        void this.openDocs();
      }
      if (t.closest('[data-new]')) this.closeDialog(), void this.newCanvas();
      if (t.closest('[data-import]')) this.closeDialog(), this.pickFiles('.sandesign,.json,application/json', false);
    });
  }

  private async deleteCurrent() {
    const v = this.dialog('Delete this canvas?', `<div class="body"><p>“${esc(this.ed.doc.title)}” and everything on it goes from this browser. Save a copy first if you might want it again.</p><div class="row"><button class="btn" data-save-first>${icon('save', 14)} Save a copy</button><button class="btn primary" data-really style="background:var(--danger)">${icon('trash-2', 14)} Delete</button></div></div>`);
    v.addEventListener('click', async (e) => {
      const t = e.target as Element;
      if (t.closest('[data-save-first]')) this.saveCopy();
      if (t.closest('[data-really]')) {
        await deleteDoc(this.ed.doc.id);
        this.closeDialog();
        this.ed.load(newDoc('Untitled canvas'));
        this.toast('Deleted.');
      }
    });
  }

  private setup() {
    const base = this.opts.base ?? './';
    const abs = new URL(base, location.href).href;
    const script = `<script src="${abs}sandesigning.js" defer></script>`;
    const bookmark = `javascript:(()=>{if(window.sandesigning)return sandesigning.open();const s=document.createElement('script');s.src='${abs}sandesigning.js';s.dataset.open='';document.body.appendChild(s)})()`;
    const prompt = 'Read SANDESIGNING.md and set up Sandesigning in this project, the way it says.';
    const v = this.dialog('Use Sandesigning in other projects', `<div class="body">
      <div class="sec" style="padding-left:0;padding-right:0"><h3>On its own</h3><p style="margin:0 0 8px">One file that works in any browser, offline too.</p><a class="btn primary" href="${base}sandesigning.html" download="sandesigning.html" style="text-decoration:none;width:max-content">${icon('download', 14)} Download sandesigning.html</a></div>
      <div class="sec" style="padding-left:0;padding-right:0"><h3>In any project, through its AI</h3><p style="margin:0 0 8px">Put <b>SANDESIGNING.md</b> in the project and give the AI there (Claude, ChatGPT, Gemini, Copilot …) this prompt. It sets everything up and knows how to read your briefs and files from then on.</p><div class="row"><a class="btn" href="${base}SANDESIGNING.md" download="SANDESIGNING.md" style="text-decoration:none;flex:none">${icon('download', 14)} SANDESIGNING.md</a><button class="btn" data-copy="${esc(prompt)}" style="flex:none">${icon('copy', 14)} Copy the prompt</button></div></div>
      <div class="sec" style="padding-left:0;padding-right:0"><h3>In a web app, by hand</h3><p style="margin:0 0 8px">One line in the page while you develop it adds a Sandesigning button (and ${kbd('alt+shift+d')}).</p><div class="row"><code style="flex:3;font-size:11px;word-break:break-all;background:var(--bg);padding:8px;border-radius:8px">${esc(script)}</code><button class="btn" data-copy="${esc(script)}" style="flex:none">${icon('copy', 14)} Copy</button></div></div>
      <div class="sec" style="padding-left:0;padding-right:0;border:0"><h3>On any page, as a bookmark</h3><p style="margin:0 0 8px">Drag this to the bookmarks bar, then click it on any site you’re working on. (Some sites block it; the line above always works.)</p><a class="btn" href="${esc(bookmark)}" style="text-decoration:none;width:max-content">${icon('bookmark', 14)} Sandesigning</a></div>
      <p style="color:var(--faint)">Phone apps: take screenshots on the phone and paste or drop them here. Canvases move between computers, browsers and AI models as .sandesign files (FORMAT.md describes them).</p></div>`);
    v.addEventListener('click', (e) => {
      const c = (e.target as Element).closest<HTMLElement>('[data-copy]')?.dataset.copy;
      if (c) void navigator.clipboard.writeText(c).then(() => this.toast('Copied.'));
    });
  }

  toast(message: string) {
    const box = this.el.querySelector('.toasts')!;
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = message;
    box.appendChild(t);
    setTimeout(() => t.remove(), 3800);
  }

  /** Extra actions the panels' buttons use. */
  private extra(id: string) {
    const n = this.ed.selected[0];
    if (id === 'img-real' && n?.type === 'image') {
      const c = n.crop ?? { x: 0, y: 0, w: n.nw, h: n.nh };
      const s = n.scale ?? 1;
      this.ed.update([n.id], { w: c.w / s, h: c.h / s });
    }
    if (id === 'img-uncrop' && n?.type === 'image' && n.crop) {
      const s = n.scale ?? 1;
      this.ed.update([n.id], { crop: undefined, x: n.x - n.crop.x / s, y: n.y - n.crop.y / s, w: n.nw / s, h: n.nh / s } as Partial<SNode>);
    }
    if (id === 'img-save') void this.savePicture();
    if (id === 'icon-swap') (this.leftTab = 'library'), this.drawLeft(), this.left.querySelector<HTMLInputElement>('.icon-search')?.focus();
  }

}

const comboTitle = (c: string) => c.replace('mod', /Mac/.test(navigator.platform) ? '⌘' : 'Ctrl').replace(/\+/g, ' ').toUpperCase();
