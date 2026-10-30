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
  return items.filter((item) => !item.deletedAt && (!folder || item.folder === folder) && words.every((word) => JSON.stringify(item).toLocaleLowerCase().includes(word))).sort((a, b) => b.updatedAt - a.updatedAt);
}
export const templateSlots = (text: string): string[] => [...new Set([...text.matchAll(/\{([\p{L}\p{N}_ -]{1,40})\}/gu)].map((m) => m[1]))].slice(0, 20);
export function fillTemplate(text: string, values: Record<string, string>): string {
  for (const slot of templateSlots(text)) if (!Object.hasOwn(values, slot) || typeof values[slot] !== 'string' || !values[slot].trim()) throw new Error('Fill every template slot.');
  return text.replace(/\{([\p{L}\p{N}_ -]{1,40})\}/gu, (token, slot: string) => Object.hasOwn(values, slot) ? values[slot].trim() : token);
}
export function noteLinkPath(link: NoteLink): string {
  const id = encodeURIComponent(link.target);
  return link.kind === 'word' ? `/thesaurus?tab=dictionary&word=${id}` : link.kind === 'grammar' ? `/cursus/grammatica/${id}` : link.kind === 'lesson' ? `/cursus/course/${link.target.split('/').map(encodeURIComponent).join('/')}` : link.kind === 'text' ? `/codex/read/${id}` : `/mentis/notebook?note=${id}`;
}
