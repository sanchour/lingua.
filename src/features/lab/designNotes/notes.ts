// Design notes (7-0b): notes pinned to elements while reviewing the design, kept on this device only
// (localStorage, never synced or backed up; Reset clears them), and written out as Markdown for Claude.
import { create } from 'zustand';
import { SECTIONS } from '@/app/sections';

/** What kind of change a note asks for (7-0c). */
export const KINDS = ['Layout', 'Spacing', 'Size', 'Colour', 'Type', 'Words', 'Remove', 'Add', 'Behaviour', 'Question'] as const;
export type NoteKind = (typeof KINDS)[number];
export const PRIORITIES = ['Must', 'Should', 'Could'] as const;
export type Priority = (typeof PRIORITIES)[number];

/** A property to change, as it is now and as it is wanted (7-0c). */
export interface Tweak {
  /** The tweak's name in TWEAKS (inspect.ts), e.g. "type size". */
  prop: string;
  now: string;
  want: string;
}

/** What the element is, written down when the note was made (inspect.ts). */
export interface ElementFacts {
  tag: string;
  /** The React component around it, in the dev server only. */
  component?: string;
  classes: string;
  size: string;
  type: string;
  /** Text and background colours, each "#hex (`--token`)" when it is one. */
  colour: string;
  background: string;
  border?: string;
  padding: string;
  margin: string;
  gap?: string;
  corners: string;
}

export interface DesignNote {
  id: string;
  /** The page: pathname and query, e.g. "/ratio?tab=iter". */
  path: string;
  room: string;
  /** A CSS path to find the element again (selector.ts). */
  selector: string;
  /** The element as a person would name it: button “Continue reading”. */
  element: string;
  text: string;
  /** Where the element was in the window when the note was made. */
  rect: { x: number; y: number; w: number; h: number };
  /** Where on the element the click was, as fractions of its width and height: the pin sits there. */
  at?: { x: number; y: number };
  /** An area marked with Shift and drag, as fractions of the element around it (the selector's). */
  area?: { x: number; y: number; w: number; h: number };
  kinds?: NoteKind[];
  priority?: Priority;
  /** The element's words, and what they should say. */
  words?: { from: string; to: string };
  tweaks?: Tweak[];
  facts?: ElementFacts;
  window: { w: number; h: number };
  /** "Paper, Cream" or "Nocturne, Charcoal". */
  light: string;
  language: string;
  version: string;
  createdAt: number;
  updatedAt: number;
  done: boolean;
}

export type NewDesignNote = Omit<DesignNote, 'id' | 'createdAt' | 'updatedAt' | 'done'>;
/** What the note card can change; Bigger and Smaller move a note to another element. */
export type NotePatch = Partial<Pick<DesignNote, 'text' | 'done' | 'kinds' | 'priority' | 'words' | 'tweaks' | 'selector' | 'element' | 'rect' | 'facts' | 'area' | 'at'>>;

const KEY = 'lingua.designNotes';

function load(): DesignNote[] {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function save(notes: DesignNote[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(notes));
  } catch {
    // Storage full or blocked: the notes stay for this session.
  }
}

interface DesignNotesStore {
  notes: DesignNote[];
  add: (note: NewDesignNote) => DesignNote;
  update: (id: string, patch: NotePatch) => void;
  remove: (id: string) => void;
  clearDone: () => void;
  clearAll: () => void;
}

export const useDesignNotes = create<DesignNotesStore>((set, get) => {
  const commit = (notes: DesignNote[]) => {
    set({ notes });
    save(notes);
  };
  return {
    notes: typeof localStorage === 'undefined' ? [] : load(),
    add: (draft) => {
      const now = Date.now();
      const note: DesignNote = { ...draft, id: `${now.toString(36)}-${Math.random().toString(36).slice(2, 7)}`, createdAt: now, updatedAt: now, done: false };
      commit([...get().notes, note]);
      return note;
    },
    update: (id, patch) => commit(get().notes.map((n) => (n.id === id ? { ...n, ...patch, updatedAt: Date.now() } : n))),
    remove: (id) => commit(get().notes.filter((n) => n.id !== id)),
    clearDone: () => commit(get().notes.filter((n) => !n.done)),
    clearAll: () => commit([]),
  };
});

/**
 * The notes made on one page, oldest first: their order is their number on the page. With a room, only that room's
 * (the first start and Home both live at "/").
 */
export function notesOn(notes: DesignNote[], path: string, room?: string): DesignNote[] {
  return notes.filter((n) => n.path === path && (!room || n.room === room)).sort((a, b) => a.createdAt - b.createdAt);
}

/** The room a path belongs to, by its longest matching room path ("/" is Home). */
export function roomFor(path: string): string {
  const pathname = path.split(/[?#]/)[0] || '/';
  if (pathname === '/') return 'Home';
  const room = SECTIONS.filter((s) => s.path !== '/' && (pathname === s.path || pathname.startsWith(`${s.path}/`))).sort((a, b) => b.path.length - a.path.length)[0];
  if (room) return room.name;
  const first = pathname.split('/')[1] ?? '';
  return first ? first[0].toUpperCase() + first.slice(1) : pathname;
}

const DAY = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
const indent = (text: string) =>
  text
    .trim()
    .split('\n')
    .map((line) => `   ${line}`)
    .join('\n');

const px = (n: number) => Math.round(n);
const oneLine = (text: string) => text.replace(/\s+/g, ' ').trim();

/** What the element is, as indented list lines under a note. */
function factLines(f: ElementFacts): string[] {
  const lines = [`   - Element: \`<${f.tag}>\`${f.component ? ` in \`${f.component}\`` : ''}, ${f.size}`];
  if (f.classes) lines.push(`     - classes: \`${f.classes}\``);
  lines.push(`     - type: ${f.type}`);
  lines.push(`     - colour: ${f.colour} on ${f.background}${f.border ? ` · border ${f.border}` : ''}`);
  lines.push(`     - box: padding ${f.padding} · margin ${f.margin}${f.gap ? ` · gap ${f.gap}` : ''} · corners ${f.corners}`);
  return lines;
}

/** Open notes by priority, e.g. "Must 2 · Should 1 · Could 0 · none 1". */
export function priorityCount(notes: DesignNote[]): string {
  const open = notes.filter((n) => !n.done);
  const parts = PRIORITIES.map((p) => `${p} ${open.filter((n) => n.priority === p).length}`);
  const none = open.filter((n) => !n.priority).length;
  return [...parts, ...(none ? [`none ${none}`] : [])].join(' · ');
}

/**
 * The notes as Markdown for Claude: a count by priority, then grouped by room and page in the order they were made,
 * each with its priority and kinds, the element (named and as a CSS path), the note, new words, tweaks, the area,
 * what the element is, where it was, the window, the light and the language.
 */
export function toMarkdown(notes: DesignNote[], meta: { version: string; at: number }): string {
  const open = notes.filter((n) => !n.done).length;
  const lines = [
    '# Lingua · design notes',
    '',
    `Version ${meta.version} · ${DAY.format(meta.at)} · ${notes.length} ${notes.length === 1 ? 'note' : 'notes'}${open !== notes.length ? ` (${open} open)` : ''}`,
    `Open by priority: ${priorityCount(notes)}`,
  ];
  const rooms = new Map<string, Map<string, DesignNote[]>>();
  for (const note of [...notes].sort((a, b) => a.createdAt - b.createdAt)) {
    const pages = rooms.get(note.room) ?? rooms.set(note.room, new Map()).get(note.room)!;
    (pages.get(note.path) ?? pages.set(note.path, []).get(note.path)!).push(note);
  }
  for (const [room, pages] of rooms) {
    for (const [path, list] of pages) {
      lines.push('', `## ${room} · \`${path}\``, '');
      list.forEach((n, i) => {
        const tags = [n.priority && `**[${n.priority}]**`, n.kinds?.length && n.kinds.join(', ')].filter(Boolean).join(' ');
        lines.push(`${i + 1}. ${n.done ? '(done) ' : ''}${tags ? `${tags} · ` : ''}**${n.element}** · \`${n.selector}\``);
        lines.push(indent(n.text || '(no text)'));
        if (n.words) lines.push(`   - Words: “${oneLine(n.words.from)}” → “${oneLine(n.words.to)}”`);
        for (const t of n.tweaks ?? []) lines.push(`   - ${t.prop}: ${t.now || '(none)'} → ${t.want || '(unchanged)'}`);
        if (n.area) {
          const a = { x: n.area.x * n.rect.w, y: n.area.y * n.rect.h, w: n.area.w * n.rect.w, h: n.area.h * n.rect.h };
          lines.push(`   - Area (not the whole element): ${px(a.w)} × ${px(a.h)}, from ${px(a.x)}, ${px(a.y)} inside it`);
        }
        if (n.facts) lines.push(...factLines(n.facts));
        lines.push(
          `   *at ${Math.round(n.rect.x)}, ${Math.round(n.rect.y)} · ${Math.round(n.rect.w)} × ${Math.round(n.rect.h)} · window ${n.window.w} × ${n.window.h} · ${n.light}${n.language ? ` · ${n.language}` : ''}*`,
        );
      });
    }
  }
  return `${lines.join('\n')}\n`;
}
