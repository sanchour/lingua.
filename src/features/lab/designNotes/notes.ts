// Design notes (7-0b): notes pinned to elements while reviewing the design, kept on this device only
// (localStorage, never synced or backed up; Reset clears them), and written out as Markdown for Claude.
import { create } from 'zustand';
import { SECTIONS } from '@/app/sections';

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
  update: (id: string, patch: Partial<Pick<DesignNote, 'text' | 'done'>>) => void;
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

/**
 * The notes as Markdown for Claude: grouped by room and page in the order they were made, each with the element
 * (named and as a CSS path), where it was, the window, the light and the language.
 */
export function toMarkdown(notes: DesignNote[], meta: { version: string; at: number }): string {
  const open = notes.filter((n) => !n.done).length;
  const lines = [
    '# Lingua · design notes',
    '',
    `Version ${meta.version} · ${DAY.format(meta.at)} · ${notes.length} ${notes.length === 1 ? 'note' : 'notes'}${open !== notes.length ? ` (${open} open)` : ''}`,
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
        lines.push(`${i + 1}. ${n.done ? '(done) ' : ''}**${n.element}** · \`${n.selector}\``);
        lines.push(indent(n.text || '(no text)'));
        lines.push(
          `   *at ${Math.round(n.rect.x)}, ${Math.round(n.rect.y)} · ${Math.round(n.rect.w)} × ${Math.round(n.rect.h)} · window ${n.window.w} × ${n.window.h} · ${n.light}${n.language ? ` · ${n.language}` : ''}*`,
        );
      });
    }
  }
  return `${lines.join('\n')}\n`;
}
