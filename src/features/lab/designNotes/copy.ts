import { toast } from '@/state/ui';
import { toMarkdown } from './notes';
import type { DesignNote } from './notes';

/**
 * Copies the notes as Markdown for Claude, and says so. When the clipboard refuses (a browser that doesn't allow it,
 * a window not in front), it returns the Markdown so it can be shown to select by hand, as the Lab's report does.
 */
export async function copyNotes(notes: DesignNote[]): Promise<string | null> {
  if (!notes.length) {
    toast('No notes to copy yet.');
    return null;
  }
  const markdown = toMarkdown(notes, { version: __APP_VERSION__, at: Date.now() });
  try {
    await navigator.clipboard.writeText(markdown);
    toast(`${notes.length} ${notes.length === 1 ? 'note' : 'notes'} copied as Markdown. Paste them into Claude.`, { tone: 'success' });
    return null;
  } catch {
    toast('The clipboard said no, so the notes are shown to select and copy.');
    return markdown;
  }
}
