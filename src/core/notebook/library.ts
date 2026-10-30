export const PHRASE_KINDS = ['General', 'Template', 'Reply', 'Opener', 'Linking expression', 'Debate', 'Idiom', 'Polite request', 'Emergency', 'Travel'] as const;
export type PhraseKind = typeof PHRASE_KINDS[number];
export interface LibraryItem { id: string; lang: string; title: string; folder: string; tags: string[]; createdAt: number; updatedAt: number; deletedAt?: number }
export interface SavedPhrase extends LibraryItem { text: string; translation: string; kind: PhraseKind; situation: string; topic: string; formal: string; informal: string; notes: string; source: string; audioBlobId?: string }
export interface NoteLink { kind: 'word' | 'grammar' | 'lesson' | 'text' | 'note'; target: string; label: string }
export interface NotebookNote extends LibraryItem { body: string; kind: 'Free note' | 'Grammar' | 'Vocabulary' | 'Confusing expressions' | 'Book or media' | 'Language pair'; links: NoteLink[] }
export const NOTE_KINDS = ['Free note', 'Grammar', 'Vocabulary', 'Confusing expressions', 'Book or media', 'Language pair'] as const;
export const tagsOf = (value: string): string[] => [...new Set(value.split(',').map((t) => t.trim()).filter(Boolean))].slice(0, 20);
export function filterLibrary<T extends LibraryItem>(items: T[], query: string, folder = ''): T[] {
  const words = query.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
  return items.filter((item) => { if (item.deletedAt || folder && item.folder !== folder) return false; const text = [Object.values(item).filter((v) => typeof v === 'string').join(' '), ...item.tags, ...((item as LibraryItem & { links?: NoteLink[] }).links ?? []).map((l) => l.label + ' ' + l.target)].join(' ').toLocaleLowerCase(); return words.every((word) => text.includes(word)); }).sort((a, b) => b.updatedAt - a.updatedAt);
}
export const templateSlots = (text: string): string[] => [...new Set([...text.matchAll(/\{([\p{L}\p{N}_ -]{1,40})\}/gu)].map((m) => m[1]))].slice(0, 21);
export function fillTemplate(text: string, values: Record<string, string>): string {
  const slots = templateSlots(text);
  if (slots.length > 20) throw new Error('Use at most 20 template slots.');
  for (const slot of slots) if (!Object.hasOwn(values, slot) || typeof values[slot] !== 'string' || !values[slot].trim()) throw new Error('Fill every template slot.');
  return text.replace(/\{([\p{L}\p{N}_ -]{1,40})\}/gu, (token, slot: string) => Object.hasOwn(values, slot) ? values[slot].trim() : token);
}
export function noteLinkPath(link: NoteLink): string {
  const id = encodeURIComponent(link.target);
  return link.kind === 'word' ? `/thesaurus?tab=dictionary&word=${id}` : link.kind === 'grammar' ? `/cursus/grammatica/${id}` : link.kind === 'lesson' ? `/cursus/course/${link.target.split('/').map(encodeURIComponent).join('/')}` : link.kind === 'text' ? `/codex/read/${id}` : `/mentis/notebook?note=${id}`;
}
export function notebookConnections(items: NotebookNote[]) {
  const notes = items.filter((n) => !n.deletedAt).slice(0, 40);
  const targets = [...new Map(notes.flatMap((n) => n.links).map((l) => [JSON.stringify([l.kind, l.target]), l])).values()].slice(0, 40);
  const edges = notes.flatMap((n, from) => n.links.flatMap((l) => { const to = targets.findIndex((t) => t.kind === l.kind && t.target === l.target); return to < 0 ? [] : [{ from, to }]; })).slice(0, 120);
  return { notes, targets, edges };
}

export function sourcePath(pathname: string, search: string, base: string): string {
  const root = base.replace(/\/$/, '');
  return (root && pathname === root ? '/' : root && pathname.startsWith(root + '/') ? pathname.slice(root.length) : pathname) + search;
}
